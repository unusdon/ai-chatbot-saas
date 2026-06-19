/**
 * Document data access layer. Every read/write is ownership-checked by
 * joining through `bot.userId`. There is no way to address a document
 * without going through its owning bot.
 */
import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import { bots, chunks, documents, type Chunk, type Document } from '@/db/schema';

const DOC_COLS = {
  id: documents.id,
  botId: documents.botId,
  source: documents.source,
  title: documents.title,
  sourceUrl: documents.sourceUrl,
  storageKey: documents.storageKey,
  status: documents.status,
  error: documents.error,
  bytes: documents.bytes,
  chunkCount: documents.chunkCount,
  createdAt: documents.createdAt,
  updatedAt: documents.updatedAt,
};

export async function listDocumentsForBot(userId: string, botId: string): Promise<Document[]> {
  return db
    .select(DOC_COLS)
    .from(documents)
    .innerJoin(bots, eq(documents.botId, bots.id))
    .where(and(eq(documents.botId, botId), eq(bots.userId, userId)))
    .orderBy(desc(documents.createdAt));
}

export async function getDocumentForUser(userId: string, documentId: string): Promise<Document | null> {
  const rows = await db
    .select(DOC_COLS)
    .from(documents)
    .innerJoin(bots, eq(documents.botId, bots.id))
    .where(and(eq(documents.id, documentId), eq(bots.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getDocumentChunks(userId: string, documentId: string): Promise<Chunk[]> {
  // Verify ownership before reading chunks.
  const doc = await getDocumentForUser(userId, documentId);
  if (!doc) return [];
  return db
    .select()
    .from(chunks)
    .where(eq(chunks.documentId, documentId))
    .orderBy(asc(chunks.chunkIndex));
}

type CreatePending = {
  botId: string;
  source: string;
  title: string;
  sourceUrl?: string;
  storageKey?: string;
  bytes?: number;
};

export async function createPendingDocument(input: CreatePending): Promise<Document> {
  const [row] = await db
    .insert(documents)
    .values({
      botId: input.botId,
      source: input.source,
      title: input.title,
      sourceUrl: input.sourceUrl,
      storageKey: input.storageKey,
      bytes: input.bytes,
      status: 'pending',
    })
    .returning();
  return row;
}

export async function markDocumentStatus(
  documentId: string,
  status: 'pending' | 'processing' | 'ready' | 'failed',
  patch: { error?: string | null; chunkCount?: number } = {},
): Promise<void> {
  await db
    .update(documents)
    .set({
      status,
      error: patch.error ?? null,
      chunkCount: patch.chunkCount ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));
}

/**
 * Edit a document. Caller may rename it, change its source URL (URL docs),
 * or swap its storageKey (text/markdown/json/qa rewrites the inline content
 * in S3 first, then points the doc at the new key).
 *
 * Returns the updated document or null if the user doesn't own it.
 */
export async function updateDocumentForUser(
  userId: string,
  documentId: string,
  patch: { title?: string; sourceUrl?: string; storageKey?: string; bytes?: number },
): Promise<Document | null> {
  const existing = await getDocumentForUser(userId, documentId);
  if (!existing) return null;

  const set: Partial<typeof documents.$inferInsert> = { updatedAt: new Date() };
  if (patch.title !== undefined) set.title = patch.title;
  if (patch.sourceUrl !== undefined) set.sourceUrl = patch.sourceUrl;
  if (patch.storageKey !== undefined) set.storageKey = patch.storageKey;
  if (patch.bytes !== undefined) set.bytes = patch.bytes;

  const [row] = await db.update(documents).set(set).where(eq(documents.id, documentId)).returning();
  return row ?? null;
}

export async function deleteDocumentForUser(userId: string, documentId: string): Promise<Document | null> {
  const existing = await getDocumentForUser(userId, documentId);
  if (!existing) return null;
  await db.delete(documents).where(eq(documents.id, existing.id));
  return existing;
}

/**
 * Bulk delete. Returns the documents that were actually deleted (so the
 * caller can also clean their S3 objects). Documents not owned by the
 * user are silently skipped.
 */
export async function deleteDocumentsForUser(
  userId: string,
  documentIds: string[],
): Promise<Document[]> {
  if (documentIds.length === 0) return [];
  const owned = await db
    .select(DOC_COLS)
    .from(documents)
    .innerJoin(bots, eq(documents.botId, bots.id))
    .where(and(inArray(documents.id, documentIds), eq(bots.userId, userId)));
  if (owned.length === 0) return [];
  await db.delete(documents).where(
    inArray(
      documents.id,
      owned.map((d) => d.id),
    ),
  );
  return owned;
}

/**
 * Reset a document to `pending` so the worker re-processes it. Doesn't touch
 * storageKey or sourceUrl — caller is responsible for ensuring the source
 * data is still reachable.
 */
export async function resetDocumentForReingest(userId: string, documentId: string): Promise<Document | null> {
  const existing = await getDocumentForUser(userId, documentId);
  if (!existing) return null;
  const [row] = await db
    .update(documents)
    .set({ status: 'pending', error: null, updatedAt: new Date() })
    .where(eq(documents.id, documentId))
    .returning();
  return row ?? null;
}
