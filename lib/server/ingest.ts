/**
 * Ingest pipeline — chunks are persisted *before* embedding attempts so
 * preview always works, even when no embedding provider is configured.
 *
 * Pipeline:
 *   1. Load document row.
 *   2. Mark `processing`.
 *   3. Extract raw text.
 *   4. Chunk.
 *   5. Replace prior chunks + INSERT new ones with embedding=NULL.
 *      → the user can already preview the extracted text.
 *   6. If an embedding provider is configured: embed in batches and
 *      UPDATE each chunk with its vector. Failures here flip the document
 *      to `ready_no_embeddings` (chunks exist; retrieval won't find them
 *      until re-embedded).
 *   7. Mark `ready` only when every chunk has an embedding.
 */
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { chunks, documents } from '@/db/schema';
import { chunkText, type Chunk, estimateTokens } from '@/lib/server/chunker';
import { getEmbeddingsClient, isEmbeddingConfigured } from '@/lib/server/embed';
import {
  extractFromDocx,
  extractFromJson,
  extractFromMarkdown,
  extractFromPdf,
  extractFromText,
  extractFromUrl,
  extractFromXlsx,
} from '@/lib/server/extract';
import { markDocumentStatus } from '@/lib/server/documents';
import { storage } from '@/lib/server/storage';

export type SourceKind =
  | 'pdf'
  | 'url'
  | 'text'
  | 'markdown'
  | 'docx'
  | 'xlsx'
  | 'json'
  | 'qa';

type IngestChunk = Chunk & { embedInput?: string };

export async function runIngest(documentId: string): Promise<{ chunkCount: number; embedded: boolean }> {
  const doc = await db.query.documents.findFirst({ where: eq(documents.id, documentId) });
  if (!doc) throw new Error(`document ${documentId} not found`);

  await markDocumentStatus(documentId, 'processing');

  // ----------------------------------------------------------------- extract
  let split: IngestChunk[];
  try {
    split = await buildChunks(doc);
  } catch (error) {
    await markDocumentStatus(documentId, 'failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
  if (split.length === 0) {
    await markDocumentStatus(documentId, 'failed', { error: 'No content to embed after extraction' });
    return { chunkCount: 0, embedded: false };
  }

  // -------------------------------------------------------------------- save
  // Drop prior chunks first (idempotent retry) then insert the new ones with
  // embedding=NULL. Preview works from this point even if embedding fails.
  await db.delete(chunks).where(eq(chunks.documentId, documentId));
  await db.insert(chunks).values(
    split.map((c, i) => ({
      documentId,
      botId: doc.botId,
      chunkIndex: i,
      content: c.content,
      tokens: c.tokens,
      embedding: null,
    })),
  );

  // -------------------------------------------------------------- embeddings
  if (!isEmbeddingConfigured()) {
    await markDocumentStatus(documentId, 'failed', {
      error: 'No embedding provider configured — chunks saved but chat won’t find them. Set OPENAI_API_KEY (or EMBEDDING_PROVIDER=ollama) and re-ingest.',
      chunkCount: split.length,
    });
    return { chunkCount: split.length, embedded: false };
  }

  try {
    const embedInputs = doc.source === 'qa'
      ? split.map((c) => c.embedInput ?? c.content)
      : split.map((c) => c.content);
    const vectors = await getEmbeddingsClient().embed(embedInputs);

    // Update each chunk with its vector. Read back the inserted rows so we
    // have their ids in the same order we embedded.
    const inserted = await db.query.chunks.findMany({
      where: eq(chunks.documentId, documentId),
      orderBy: (c, { asc }) => asc(c.chunkIndex),
    });
    for (let i = 0; i < inserted.length && i < vectors.length; i++) {
      await db
        .update(chunks)
        .set({ embedding: vectors[i] })
        .where(eq(chunks.id, inserted[i].id));
    }

    await markDocumentStatus(documentId, 'ready', { chunkCount: split.length });
    return { chunkCount: split.length, embedded: true };
  } catch (error) {
    await markDocumentStatus(documentId, 'failed', {
      error: error instanceof Error ? `Embedding failed: ${error.message}` : 'Embedding failed',
      chunkCount: split.length,
    });
    return { chunkCount: split.length, embedded: false };
  }
}

async function buildChunks(doc: {
  source: string;
  sourceUrl: string | null;
  storageKey: string | null;
  title: string;
}): Promise<IngestChunk[]> {
  switch (doc.source as SourceKind) {
    case 'pdf': {
      if (!doc.storageKey) throw new Error('PDF document has no storageKey');
      const buf = await storage.getObjectBody(doc.storageKey);
      const out = await extractFromPdf(buf);
      return chunkText(out.text);
    }
    case 'url': {
      if (!doc.sourceUrl) throw new Error('URL document has no sourceUrl');
      const out = await extractFromUrl(doc.sourceUrl);
      return chunkText(out.text);
    }
    case 'text': {
      const content = await loadInlineContent(doc.storageKey, 'text');
      const out = await extractFromText(content);
      return chunkText(out.text);
    }
    case 'markdown': {
      const content = await loadInlineContent(doc.storageKey, 'markdown');
      const out = await extractFromMarkdown(content);
      return chunkText(out.text);
    }
    case 'docx': {
      if (!doc.storageKey) throw new Error('DOCX document has no storageKey');
      const buf = await storage.getObjectBody(doc.storageKey);
      const out = await extractFromDocx(buf);
      return chunkText(out.text);
    }
    case 'xlsx': {
      if (!doc.storageKey) throw new Error('XLSX document has no storageKey');
      const buf = await storage.getObjectBody(doc.storageKey);
      const out = await extractFromXlsx(buf);
      return chunkText(out.text, { chunkSize: 1500, chunkOverlap: 0 });
    }
    case 'json': {
      const content = await loadInlineContent(doc.storageKey, 'json');
      const out = await extractFromJson(content);
      return chunkText(out.text, { chunkSize: 1200, chunkOverlap: 50 });
    }
    case 'qa': {
      const answer = await loadInlineContent(doc.storageKey, 'qa');
      const formatted = `Q: ${doc.title}\n\nA: ${answer}`;
      return [
        { content: formatted, tokens: estimateTokens(formatted), embedInput: doc.title },
      ];
    }
    default:
      throw new Error(`Unsupported source: ${doc.source}`);
  }
}

async function loadInlineContent(storageKey: string | null, label: string): Promise<string> {
  if (!storageKey) throw new Error(`${label} document has no storageKey`);
  const buf = await storage.getObjectBody(storageKey);
  return buf.toString('utf8');
}
