/**
 * Per-bot analytics queries.
 *
 * All public functions take `userId` + `botId` and verify ownership via the
 * INNER JOIN to `bot.userId` — same multi-tenant boundary pattern as the
 * document layer. Date math is done in SQL so the answers are consistent with
 * Postgres' notion of "now" regardless of where the worker / app run.
 */
import { and, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { bots, conversations, messages } from '@/db/schema';

export type BotStats = {
  totalConversations: number;
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  avgLatencyMs: number | null;
  totalPromptTokens: number;
  totalCompletionTokens: number;
};

export type DailyBucket = { day: string; count: number };
export type QueryFrequency = { content: string; count: number };
export type ContentGap = {
  messageId: string;
  // The user's question that the bot couldn't answer with citations.
  question: string;
  // The bot's reply (often the "no source material" fallback).
  reply: string;
  createdAt: Date;
  conversationId: string;
};

async function assertOwnership(userId: string, botId: string): Promise<boolean> {
  const row = await db.query.bots.findFirst({
    where: and(eq(bots.id, botId), eq(bots.userId, userId)),
  });
  return Boolean(row);
}

export async function getBotStats(userId: string, botId: string): Promise<BotStats | null> {
  if (!(await assertOwnership(userId, botId))) return null;

  const rows = await db
    .select({
      totalConversations: sql<number>`COUNT(DISTINCT ${conversations.id})`,
      totalMessages: sql<number>`COUNT(${messages.id})`,
      userMessages: sql<number>`COUNT(${messages.id}) FILTER (WHERE ${messages.role} = 'user')`,
      assistantMessages: sql<number>`COUNT(${messages.id}) FILTER (WHERE ${messages.role} = 'assistant')`,
      avgLatencyMs: sql<number | null>`AVG(${messages.latencyMs})`,
      totalPromptTokens: sql<number>`COALESCE(SUM(${messages.promptTokens}), 0)`,
      totalCompletionTokens: sql<number>`COALESCE(SUM(${messages.completionTokens}), 0)`,
    })
    .from(conversations)
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .where(eq(conversations.botId, botId));

  const r = rows[0];
  return {
    totalConversations: Number(r.totalConversations),
    totalMessages: Number(r.totalMessages),
    userMessages: Number(r.userMessages),
    assistantMessages: Number(r.assistantMessages),
    avgLatencyMs: r.avgLatencyMs === null ? null : Number(r.avgLatencyMs),
    totalPromptTokens: Number(r.totalPromptTokens),
    totalCompletionTokens: Number(r.totalCompletionTokens),
  };
}

export async function getDailyMessageCounts(
  userId: string,
  botId: string,
  days = 14,
): Promise<DailyBucket[]> {
  if (!(await assertOwnership(userId, botId))) return [];

  // generate_series gives us a row per day in the window so days with zero
  // messages still appear (otherwise the chart x-axis lies).
  const result = await db.execute<{ day: Date; count: number }>(sql`
    WITH days AS (
      SELECT generate_series(
        date_trunc('day', NOW()) - (${days - 1} || ' days')::interval,
        date_trunc('day', NOW()),
        '1 day'::interval
      )::date AS day
    )
    SELECT
      d.day::text AS day,
      COALESCE(COUNT(m.id), 0)::int AS count
    FROM days d
    LEFT JOIN conversation c ON c."botId" = ${botId}
    LEFT JOIN message m
      ON m."conversationId" = c.id
      AND date_trunc('day', m."createdAt") = d.day
      AND m.role = 'user'
    GROUP BY d.day
    ORDER BY d.day ASC
  `);
  const rows = result as unknown as Array<{ day: string; count: number }>;
  return rows.map((r) => ({ day: r.day, count: Number(r.count) }));
}

export async function getTopQueries(
  userId: string,
  botId: string,
  limit = 10,
): Promise<QueryFrequency[]> {
  if (!(await assertOwnership(userId, botId))) return [];

  const rows = await db
    .select({
      content: messages.content,
      count: sql<number>`COUNT(*)`,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(eq(conversations.botId, botId), eq(messages.role, 'user')))
    .groupBy(messages.content)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(limit);
  return rows.map((r) => ({ content: r.content, count: Number(r.count) }));
}

export async function getContentGaps(
  userId: string,
  botId: string,
  limit = 10,
): Promise<ContentGap[]> {
  if (!(await assertOwnership(userId, botId))) return [];

  // Content-gap heuristic: assistant message with empty/null citations.
  // For each such reply, also fetch the immediately-preceding user message —
  // that's what the bot owner needs to act on (the question their sources
  // couldn't answer).
  const result = await db.execute<{
    message_id: string;
    reply: string;
    question: string;
    created_at: Date;
    conversation_id: string;
  }>(sql`
    SELECT
      a.id AS message_id,
      a.content AS reply,
      a."createdAt" AS created_at,
      a."conversationId" AS conversation_id,
      COALESCE(
        (
          SELECT u.content
          FROM message u
          WHERE u."conversationId" = a."conversationId"
            AND u.role = 'user'
            AND (u."createdAt", u.id) < (a."createdAt", a.id)
          ORDER BY u."createdAt" DESC, u.id DESC
          LIMIT 1
        ),
        '(no question recorded)'
      ) AS question
    FROM message a
    INNER JOIN conversation c ON c.id = a."conversationId"
    WHERE c."botId" = ${botId}
      AND a.role = 'assistant'
      AND (a.citations IS NULL OR jsonb_array_length(a.citations) = 0)
    ORDER BY a."createdAt" DESC
    LIMIT ${limit}
  `);
  const rows = result as unknown as Array<{
    message_id: string;
    reply: string;
    question: string;
    created_at: Date | string;
    conversation_id: string;
  }>;
  return rows.map((r) => ({
    messageId: r.message_id,
    question: r.question,
    reply: r.reply,
    createdAt: new Date(r.created_at),
    conversationId: r.conversation_id,
  }));
}
