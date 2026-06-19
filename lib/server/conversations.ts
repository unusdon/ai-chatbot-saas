/**
 * Conversation + message persistence + admin queries.
 *
 * Ownership: every read/write requires a `userId` and joins through
 * `bot.userId`. The widget endpoint also uses these helpers — there the
 * `userId` arg is the BOT OWNER, since that's whose plan + audit log a
 * widget message belongs to.
 */
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import { bots, conversations, messages, type Conversation, type Message } from '@/db/schema';

const CONV_COLS = {
  id: conversations.id,
  botId: conversations.botId,
  endUserId: conversations.endUserId,
  ipAddress: conversations.ipAddress,
  userAgent: conversations.userAgent,
  referrer: conversations.referrer,
  flag: conversations.flag,
  isArchived: conversations.isArchived,
  lastMessageAt: conversations.lastMessageAt,
  createdAt: conversations.createdAt,
};

// ─── dashboard playground (signed-in user is the end-user) ──────────────────

export async function getOrCreateDashboardConversation(
  userId: string,
  botId: string,
): Promise<Conversation> {
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

// ─── widget-side: create with end-user metadata ─────────────────────────────

type WidgetCreate = {
  botId: string;
  endUserId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
};

export async function getOrCreateWidgetConversation(input: WidgetCreate): Promise<Conversation> {
  const existing = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.botId, input.botId),
      eq(conversations.endUserId, input.endUserId),
    ),
    orderBy: desc(conversations.createdAt),
  });
  if (existing) {
    // Refresh metadata on each session — IP can rotate, UA might be a
    // different browser if cookie was carried across.
    if (
      (input.ipAddress && input.ipAddress !== existing.ipAddress) ||
      (input.userAgent && input.userAgent !== existing.userAgent) ||
      (input.referrer && input.referrer !== existing.referrer)
    ) {
      await db
        .update(conversations)
        .set({
          ipAddress: input.ipAddress ?? existing.ipAddress,
          userAgent: input.userAgent ?? existing.userAgent,
          referrer: input.referrer ?? existing.referrer,
        })
        .where(eq(conversations.id, existing.id));
    }
    return existing;
  }
  const [row] = await db
    .insert(conversations)
    .values({
      botId: input.botId,
      endUserId: input.endUserId,
      ipAddress: input.ipAddress?.slice(0, 64) ?? null,
      userAgent: input.userAgent?.slice(0, 2048) ?? null,
      referrer: input.referrer?.slice(0, 2048) ?? null,
    })
    .returning();
  return row;
}

// ─── messages ──────────────────────────────────────────────────────────────

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
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, conversationId));
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
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, input.conversationId));
  return row;
}

export async function clearConversation(userId: string, botId: string): Promise<void> {
  const endUserId = `dashboard:${userId}`;
  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.id, botId), eq(bots.userId, userId)),
  });
  if (!bot) return;
  await db
    .delete(conversations)
    .where(and(eq(conversations.botId, botId), eq(conversations.endUserId, endUserId)));
}

// ─── admin: list + detail + bulk ops ───────────────────────────────────────

export type ConversationListItem = Conversation & {
  messageCount: number;
  firstUserMessage: string | null;
  lastMessage: string | null;
};

export type ListConversationsFilter = {
  search?: string;
  since?: Date;
  until?: Date;
  flag?: string | null;
  includeDashboard?: boolean;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
};

async function ownsBot(userId: string, botId: string): Promise<boolean> {
  const row = await db.query.bots.findFirst({
    where: and(eq(bots.id, botId), eq(bots.userId, userId)),
  });
  return Boolean(row);
}

export async function listConversationsForBot(
  userId: string,
  botId: string,
  opts: ListConversationsFilter = {},
): Promise<{ items: ConversationListItem[]; total: number }> {
  if (!(await ownsBot(userId, botId))) return { items: [], total: 0 };

  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;

  const filters = [eq(conversations.botId, botId)];
  if (!opts.includeArchived) filters.push(eq(conversations.isArchived, false));
  if (opts.since) filters.push(gte(conversations.lastMessageAt, opts.since));
  if (opts.until) filters.push(lte(conversations.lastMessageAt, opts.until));
  if (opts.flag) filters.push(eq(conversations.flag, opts.flag));
  if (!opts.includeDashboard) {
    // Hide dashboard-owner playground conversations from the customer admin list.
    filters.push(sql`(${conversations.endUserId} IS NULL OR ${conversations.endUserId} NOT LIKE 'dashboard:%')`);
  }

  // Content search joins through messages.
  let matchedIds: string[] | null = null;
  if (opts.search && opts.search.trim().length >= 2) {
    const term = `%${opts.search.trim()}%`;
    const matches = await db
      .selectDistinct({ id: messages.conversationId })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(eq(conversations.botId, botId), ilike(messages.content, term)))
      .limit(1000);
    matchedIds = matches.map((m) => m.id);
    if (matchedIds.length === 0) return { items: [], total: 0 };
    filters.push(inArray(conversations.id, matchedIds));
  }

  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(conversations)
    .where(and(...filters));

  const rows = await db
    .select(CONV_COLS)
    .from(conversations)
    .where(and(...filters))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(limit)
    .offset(offset);

  if (rows.length === 0) return { items: [], total: Number(count) };

  // Enrich each conversation with message count + first user prompt + last
  // assistant reply in a single round-trip per metric.
  const ids = rows.map((r) => r.id);

  const counts = await db
    .select({
      conversationId: messages.conversationId,
      total: sql<number>`COUNT(*)`,
    })
    .from(messages)
    .where(inArray(messages.conversationId, ids))
    .groupBy(messages.conversationId);

  const firstUserMessages = await db.execute<{
    conversation_id: string;
    content: string;
  }>(sql`
    SELECT DISTINCT ON (m."conversationId") m."conversationId" AS conversation_id, m.content
    FROM message m
    WHERE m."conversationId" = ANY(${ids}::uuid[])
      AND m.role = 'user'
    ORDER BY m."conversationId", m."createdAt" ASC
  `);

  const lastMessages = await db.execute<{
    conversation_id: string;
    content: string;
  }>(sql`
    SELECT DISTINCT ON (m."conversationId") m."conversationId" AS conversation_id, m.content
    FROM message m
    WHERE m."conversationId" = ANY(${ids}::uuid[])
    ORDER BY m."conversationId", m."createdAt" DESC
  `);

  const countMap = new Map(counts.map((c) => [c.conversationId, Number(c.total)]));
  const firstMap = new Map(
    ((firstUserMessages as unknown) as Array<{ conversation_id: string; content: string }>).map(
      (r) => [r.conversation_id, r.content],
    ),
  );
  const lastMap = new Map(
    ((lastMessages as unknown) as Array<{ conversation_id: string; content: string }>).map((r) => [
      r.conversation_id,
      r.content,
    ]),
  );

  const items: ConversationListItem[] = rows.map((r) => ({
    ...r,
    messageCount: countMap.get(r.id) ?? 0,
    firstUserMessage: firstMap.get(r.id) ?? null,
    lastMessage: lastMap.get(r.id) ?? null,
  }));

  return { items, total: Number(count) };
}

export async function getConversationDetail(
  userId: string,
  conversationId: string,
): Promise<{ conversation: Conversation; messages: Message[] } | null> {
  const rows = await db
    .select(CONV_COLS)
    .from(conversations)
    .innerJoin(bots, eq(conversations.botId, bots.id))
    .where(and(eq(conversations.id, conversationId), eq(bots.userId, userId)))
    .limit(1);
  if (rows.length === 0) return null;

  const conv = rows[0];
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
  return { conversation: conv, messages: msgs };
}

export async function deleteConversationForUser(
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const detail = await getConversationDetail(userId, conversationId);
  if (!detail) return false;
  await db.delete(conversations).where(eq(conversations.id, conversationId));
  return true;
}

export async function bulkDeleteConversationsForUser(
  userId: string,
  conversationIds: string[],
): Promise<number> {
  if (conversationIds.length === 0) return 0;
  const owned = await db
    .select({ id: conversations.id })
    .from(conversations)
    .innerJoin(bots, eq(conversations.botId, bots.id))
    .where(and(inArray(conversations.id, conversationIds), eq(bots.userId, userId)));
  if (owned.length === 0) return 0;
  const ids = owned.map((c) => c.id);
  await db.delete(conversations).where(inArray(conversations.id, ids));
  return ids.length;
}

export async function setConversationFlagForUser(
  userId: string,
  conversationId: string,
  flag: string | null,
): Promise<boolean> {
  const detail = await getConversationDetail(userId, conversationId);
  if (!detail) return false;
  await db.update(conversations).set({ flag }).where(eq(conversations.id, conversationId));
  return true;
}

export async function setConversationArchivedForUser(
  userId: string,
  conversationId: string,
  archived: boolean,
): Promise<boolean> {
  const detail = await getConversationDetail(userId, conversationId);
  if (!detail) return false;
  await db.update(conversations).set({ isArchived: archived }).where(eq(conversations.id, conversationId));
  return true;
}

// ─── stats for the bot's conversations summary card ────────────────────────

export type ConversationStats = {
  total: number;
  activeLast24h: number;
  activeLast7d: number;
  uniqueEndUsers: number;
  avgMessagesPerConversation: number;
  flagged: number;
};

export async function getConversationStats(
  userId: string,
  botId: string,
): Promise<ConversationStats | null> {
  if (!(await ownsBot(userId, botId))) return null;

  const result = await db.execute<{
    total: number;
    active_24h: number;
    active_7d: number;
    unique_end_users: number;
    avg_messages: number | null;
    flagged: number;
  }>(sql`
    WITH conv AS (
      SELECT c.id, c."endUserId", c."lastMessageAt", c.flag
      FROM conversation c
      WHERE c."botId" = ${botId}
        AND c."isArchived" = FALSE
        AND (c."endUserId" IS NULL OR c."endUserId" NOT LIKE 'dashboard:%')
    ),
    msg_counts AS (
      SELECT m."conversationId", COUNT(*) AS n
      FROM message m
      INNER JOIN conv ON conv.id = m."conversationId"
      GROUP BY m."conversationId"
    )
    SELECT
      (SELECT COUNT(*) FROM conv)::int AS total,
      (SELECT COUNT(*) FROM conv WHERE "lastMessageAt" >= NOW() - INTERVAL '24 hours')::int AS active_24h,
      (SELECT COUNT(*) FROM conv WHERE "lastMessageAt" >= NOW() - INTERVAL '7 days')::int AS active_7d,
      (SELECT COUNT(DISTINCT "endUserId") FROM conv WHERE "endUserId" IS NOT NULL)::int AS unique_end_users,
      (SELECT AVG(n)::float FROM msg_counts) AS avg_messages,
      (SELECT COUNT(*) FROM conv WHERE flag IS NOT NULL)::int AS flagged
  `);
  const rows = result as unknown as Array<{
    total: number;
    active_24h: number;
    active_7d: number;
    unique_end_users: number;
    avg_messages: number | null;
    flagged: number;
  }>;
  const r = rows[0];
  return {
    total: Number(r.total),
    activeLast24h: Number(r.active_24h),
    activeLast7d: Number(r.active_7d),
    uniqueEndUsers: Number(r.unique_end_users),
    avgMessagesPerConversation: r.avg_messages ? Number(r.avg_messages) : 0,
    flagged: Number(r.flagged),
  };
}
