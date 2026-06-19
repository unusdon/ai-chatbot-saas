/**
 * Promote-to-training: convert an admin-curated conversation Q&A into a Q&A
 * source the bot will retrieve forever.
 *
 * This isn't model fine-tuning — it's RAG-native. The question gets embedded
 * (so similar user queries match it) and the answer becomes the chunk
 * content (so the LLM gets a canonical response to cite). Same pipeline the
 * manual Q&A form uses; the only difference is where the text came from.
 */
import { and, desc, eq, lt } from 'drizzle-orm';

import { db } from '@/db';
import { bots, conversations, messages, documents } from '@/db/schema';
import { createPendingDocument } from '@/lib/server/documents';
import { queueIngestJob } from '@/lib/server/queue';
import { storageExtFor } from '@/lib/server/source-types';
import { documentStorageKey, storage } from '@/lib/server/storage';

/** Find the user message that precedes an assistant message in the same conversation. */
export async function getPrecedingUserContent(
  conversationId: string,
  assistantMessageId: string,
): Promise<string | null> {
  const asst = await db.query.messages.findFirst({
    where: and(eq(messages.id, assistantMessageId), eq(messages.conversationId, conversationId)),
  });
  if (!asst || asst.role !== 'assistant') return null;

  const candidates = await db
    .select({ content: messages.content })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.role, 'user'),
        lt(messages.createdAt, asst.createdAt),
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(1);
  return candidates[0]?.content ?? null;
}

export type PromoteInput = {
  userId: string;
  botId: string;
  conversationId: string;
  assistantMessageId: string;
  question: string;
  answer: string;
};

export type PromoteResult =
  | { ok: true; documentId: string }
  | { ok: false; reason: string };

export async function promoteMessageToQa(input: PromoteInput): Promise<PromoteResult> {
  // Ownership check — bot must belong to the calling admin user.
  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.id, input.botId), eq(bots.userId, input.userId)),
  });
  if (!bot) return { ok: false, reason: 'Bot not found' };

  const conv = await db.query.conversations.findFirst({
    where: and(eq(conversations.id, input.conversationId), eq(conversations.botId, bot.id)),
  });
  if (!conv) return { ok: false, reason: 'Conversation not found' };

  const asst = await db.query.messages.findFirst({
    where: and(
      eq(messages.id, input.assistantMessageId),
      eq(messages.conversationId, conv.id),
      eq(messages.role, 'assistant'),
    ),
  });
  if (!asst) return { ok: false, reason: 'Assistant message not found' };

  // Idempotent: if this message has already been promoted, return that doc id.
  if (asst.promotedDocumentId) {
    return { ok: true, documentId: asst.promotedDocumentId };
  }

  const question = input.question.trim();
  const answer = input.answer.trim();
  if (!question || question.length > 500) return { ok: false, reason: 'Question must be 1–500 characters' };
  if (!answer || answer.length > 8000) return { ok: false, reason: 'Answer must be 1–8000 characters' };

  const bytes = Buffer.byteLength(answer, 'utf8');
  const doc = await createPendingDocument({
    botId: bot.id,
    source: 'qa',
    title: question,
    bytes,
  });
  const key = documentStorageKey(bot.id, doc.id, storageExtFor('qa'));
  await storage.putObject(key, Buffer.from(answer, 'utf8'), 'text/plain');
  await db
    .update(documents)
    .set({ storageKey: key, updatedAt: new Date() })
    .where(eq(documents.id, doc.id));

  await db
    .update(messages)
    .set({ promotedDocumentId: doc.id, promotedAt: new Date() })
    .where(eq(messages.id, asst.id));

  await queueIngestJob({ documentId: doc.id });

  return { ok: true, documentId: doc.id };
}

export async function unpromoteMessage(userId: string, messageId: string): Promise<boolean> {
  // Walk: message → conversation → bot → user.
  const row = await db
    .select({
      messageId: messages.id,
      conversationId: messages.conversationId,
      botUserId: bots.userId,
      promotedDocumentId: messages.promotedDocumentId,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .innerJoin(bots, eq(conversations.botId, bots.id))
    .where(and(eq(messages.id, messageId), eq(bots.userId, userId)))
    .limit(1);
  if (row.length === 0) return false;

  const promoted = row[0].promotedDocumentId;
  if (promoted) {
    // Delete the underlying Q&A source and its S3 object (best-effort).
    const doc = await db.query.documents.findFirst({ where: eq(documents.id, promoted) });
    if (doc?.storageKey) {
      try {
        await storage.deleteObject(doc.storageKey);
      } catch {
        /* best-effort */
      }
    }
    await db.delete(documents).where(eq(documents.id, promoted));
  }
  await db
    .update(messages)
    .set({ promotedDocumentId: null, promotedAt: null })
    .where(eq(messages.id, messageId));
  return true;
}
