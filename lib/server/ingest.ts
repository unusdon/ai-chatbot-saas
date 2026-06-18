/**
 * The actual ingest pipeline. Extracted from the BullMQ worker so it can be
 * exercised directly from tests / a one-off CLI without booting Redis.
 *
 * Pipeline:
 *   1. Load document row (already inserted by the upload route or URL action).
 *   2. Mark it `processing`.
 *   3. Extract raw text (PDF → pdf-parse, URL → fetch + Readability).
 *   4. Chunk into ~1000-character pieces with 150-char overlap.
 *   5. Embed all chunks in batched OpenAI calls.
 *   6. Replace any existing chunks (idempotent retry) and write the new ones.
 *   7. Mark `ready` (or `failed` with the error message on any throw).
 */
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { chunks, documents } from '@/db/schema';
import { chunkText } from '@/lib/server/chunker';
import { getEmbeddingsClient } from '@/lib/server/embed';
import { extractFromPdf, extractFromUrl } from '@/lib/server/extract';
import { markDocumentStatus } from '@/lib/server/documents';
import { storage } from '@/lib/server/storage';

export async function runIngest(documentId: string): Promise<{ chunkCount: number }> {
  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, documentId),
  });
  if (!doc) throw new Error(`document ${documentId} not found`);

  await markDocumentStatus(documentId, 'processing');

  try {
    const { text } = await loadSource(doc);
    const split = chunkText(text);
    if (split.length === 0) throw new Error('No content to embed after extraction + chunking');

    const embeddings = await getEmbeddingsClient().embed(split.map((c) => c.content));

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

async function loadSource(doc: {
  source: string;
  sourceUrl: string | null;
  storageKey: string | null;
}): Promise<{ text: string }> {
  if (doc.source === 'pdf') {
    if (!doc.storageKey) throw new Error('PDF document has no storageKey');
    const buffer = await storage.getObjectBody(doc.storageKey);
    return extractFromPdf(buffer);
  }
  if (doc.source === 'url') {
    if (!doc.sourceUrl) throw new Error('URL document has no sourceUrl');
    return extractFromUrl(doc.sourceUrl);
  }
  throw new Error(`Unsupported source: ${doc.source}`);
}
