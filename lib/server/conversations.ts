/**
 * Conversation + message persistence for the chat playground.
 *
 * Ownership is enforced via the bot.userId join. The widget endpoint (M4)
 * will use a separate `endUserId` path with rate limiting; for the dashboard
 * playground, the signed-in user *is* the end user.
 */
import { and, asc, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { bots, conversations, messages, type Conversation, type Message } from '@/db/schema';

export async function getOrCreateDashboardConversation(
  userId: string,
  botId: string,
): Promise<Conversation> {
  // The dashboard playground keeps one rolling conversation per (user, bot).
  // Real product use would let users pick / archive multiple — that's M5.
  const endUserId = `dashboard:${userId}`;

  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.id, botId), eq(bots.userId, userId)),
  });
  if (!bot) throw new Error('Bot not found');

  const existing = await db.query.conversations.findFirst({
    where: and(eq(conversations.botId, botId), eq(conversations.endUserId, endUserId)),
    orderBy: desc(conversations.createdAt),
  });
  if (existing) return existing;

  const [row] = await db.insert(conversations).values({ botId, endUserId }).returning();
  return row;
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
}

export async function appendUserMessage(conversationId: string, content: string): Promise<Message> {
  const [row] = await db
    .insert(messages)
    .values({ conversationId, role: 'user', content })
    .returning();
  return row;
}

export type AssistantMessageInput = {
  conversationId: string;
  content: string;
  citations: Array<{ chunkId: string; score: number }>;
  latencyMs?: number;
};

export async function appendAssistantMessage(input: AssistantMessageInput): Promise<Message> {
  const [row] = await db
    .insert(messages)
    .values({
      conversationId: input.conversationId,
      role: 'assistant',
      content: input.content,
      citations: input.citations,
      latencyMs: input.latencyMs,
    })
    .returning();
  return row;
}

export async function clearConversation(userId: string, botId: string): Promise<void> {
  const endUserId = `dashboard:${userId}`;
  // Verify ownership before delete.
  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.id, botId), eq(bots.userId, userId)),
  });
  if (!bot) return;
  await db
    .delete(conversations)
    .where(and(eq(conversations.botId, botId), eq(conversations.endUserId, endUserId)));
}
