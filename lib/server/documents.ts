/**
 * Document data access layer. Every read/write is ownership-checked by
 * joining through `bot.userId`. There is no way to address a document
 * without going through its owning bot.
 */
import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { bots, documents, type Document } from '@/db/schema';

export async function listDocumentsForBot(userId: string, botId: string): Promise<Document[]> {
  return db
    .select({
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
    })
    .from(documents)
    .innerJoin(bots, eq(documents.botId, bots.id))
    .where(and(eq(documents.botId, botId), eq(bots.userId, userId)))
    .orderBy(desc(documents.createdAt));
}

export async function getDocumentForUser(userId: string, documentId: string): Promise<Document | null> {
  const rows = await db
    .select({
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
    })
    .from(documents)
    .innerJoin(bots, eq(documents.botId, bots.id))
    .where(and(eq(documents.id, documentId), eq(bots.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

type CreatePending = {
  botId: string;
  source: 'pdf' | 'url' | 'text';
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

export async function deleteDocumentForUser(userId: string, documentId: string): Promise<Document | null> {
  // We have to look up the row first to confirm ownership AND to return the
  // storageKey for the S3 cleanup the caller will do.
  const existing = await getDocumentForUser(userId, documentId);
  if (!existing) return null;
  await db.delete(documents).where(eq(documents.id, existing.id));
  return existing;
}
