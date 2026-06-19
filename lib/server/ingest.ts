/**
 * The actual ingest pipeline. Extracted from the BullMQ worker so it can be
 * exercised directly from tests / a one-off CLI without booting Redis.
 *
 * Pipeline:
 *   1. Load document row (already inserted by the upload route or URL action).
 *   2. Mark it `processing`.
 *   3. Extract raw text (PDF/DOCX → buffer extractors, URL → fetch,
 *      text/markdown/json → identity, xlsx → row-flatten).
 *   4. Chunk into ~1000-character pieces with 150-char overlap.
 *      Q&A pairs are NOT chunked — each pair is its own single chunk with
 *      the question embedded.
 *   5. Embed all chunks in batched OpenAI calls.
 *   6. Replace any existing chunks (idempotent retry) and write the new ones.
 *   7. Mark `ready` (or `failed` with the error message on any throw).
 */
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { chunks, documents } from '@/db/schema';
import { chunkText, type Chunk, estimateTokens } from '@/lib/server/chunker';
import { getEmbeddingsClient } from '@/lib/server/embed';
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

export async function runIngest(documentId: string): Promise<{ chunkCount: number }> {
  const doc = await db.query.documents.findFirst({ where: eq(documents.id, documentId) });
  if (!doc) throw new Error(`document ${documentId} not found`);

  await markDocumentStatus(documentId, 'processing');

  try {
    const split = await buildChunks(doc);
    if (split.length === 0) throw new Error('No content to embed after extraction + chunking');

    // For Q&A, we embed the *question* (so user queries match). For
    // everything else we embed the chunk content itself.
    const embedInputs = doc.source === 'qa' ? split.map((c) => c.embedInput ?? c.content) : split.map((c) => c.content);
    const embeddings = await getEmbeddingsClient().embed(embedInputs);

    // Idempotent retry: drop any chunks left over from a previous failed run.
    await db.delete(chunks).where(eq(chunks.documentId, documentId));

    await db.insert(chunks).values(
      split.map((c, i) => ({
        documentId,
        botId: doc.botId,
        chunkIndex: i,
        content: c.content,
        tokens: c.tokens,
        embedding: embeddings[i],
      })),
    );

    await markDocumentStatus(documentId, 'ready', { chunkCount: split.length });
    return { chunkCount: split.length };
  } catch (error) {
    await markDocumentStatus(documentId, 'failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

type IngestChunk = Chunk & { embedInput?: string };

async function buildChunks(doc: {
  source: string;
  sourceUrl: string | null;
  storageKey: string | null;
  title: string;
  // Q&A and text sources stash their content in the `error` column? No —
  // we use a dedicated 'inlineContent' field via a separate query when
  // needed. For now, text/markdown/json store their content in S3 as well.
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
      // Q&A: title = question, content (loaded inline) = answer.
      const answer = await loadInlineContent(doc.storageKey, 'qa');
      const formatted = `Q: ${doc.title}\n\nA: ${answer}`;
      return [
        {
          content: formatted,
          tokens: estimateTokens(formatted),
          embedInput: doc.title, // embed the question so user queries match
        },
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
