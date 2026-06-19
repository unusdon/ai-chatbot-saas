/**
 * Analytics queries against real Postgres. Seeds a known set of conversations
 * + messages and asserts every aggregation pivots on the correct shape.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const enabled = process.env.RUN_INTEGRATION_TESTS === '1';

describe.skipIf(!enabled)('analytics — per-bot aggregations', () => {
  type DB = typeof import('@/db');
  type SchemaModule = typeof import('@/db/schema');
  type AnalyticsModule = typeof import('@/lib/server/analytics');

  let db: DB['db'];
  let schema: SchemaModule;
  let analytics: AnalyticsModule;

  let userId = '';
  let botId = '';
  let otherUserId = '';
  let otherBotId = '';

  beforeAll(async () => {
    if (process.env.REAL_DATABASE_URL) {
      (process.env as Record<string, string>).DATABASE_URL = process.env.REAL_DATABASE_URL;
    }
    ({ db } = await import('@/db'));
    schema = await import('@/db/schema');
    analytics = await import('@/lib/server/analytics');

    const stamp = Date.now();
    const [u] = await db
      .insert(schema.users)
      .values({ name: 'Analyst', email: `analytics-${stamp}@example.com` })
      .returning();
    userId = u.id;
    const [other] = await db
      .insert(schema.users)
      .values({ name: 'Other', email: `analytics-other-${stamp}@example.com` })
      .returning();
    otherUserId = other.id;

    const [b] = await db
      .insert(schema.bots)
      .values({ userId, name: 'Stats Bot', publicKey: `bot_stats_${stamp}` })
      .returning();
    botId = b.id;
    const [otherBot] = await db
      .insert(schema.bots)
      .values({ userId: otherUserId, name: 'Other Bot', publicKey: `bot_other_${stamp}` })
      .returning();
    otherBotId = otherBot.id;

    const [conv] = await db.insert(schema.conversations).values({ botId }).returning();

    // Insert messages one-at-a-time (as the real chat path does) so timestamps
    // differ across turns. Bulk INSERT gives them all the same `now()`, which
    // breaks "preceding user message" lookups.
    type Turn = {
      role: 'user' | 'assistant';
      content: string;
      citations?: Array<{ chunkId: string; score: number }> | null;
      latencyMs?: number | null;
      promptTokens?: number | null;
      completionTokens?: number | null;
    };
    const turns: Turn[] = [
      { role: 'user', content: 'How do I install?' },
      {
        role: 'assistant',
        content: 'Install with npm install.',
        citations: [{ chunkId: 'c-1', score: 0.9 }],
        latencyMs: 800,
        promptTokens: 100,
        completionTokens: 30,
      },
      { role: 'user', content: 'How do I install?' },
      {
        role: 'assistant',
        content: 'Same as before — npm install.',
        citations: [{ chunkId: 'c-1', score: 0.9 }],
        latencyMs: 700,
        promptTokens: 100,
        completionTokens: 30,
      },
      { role: 'user', content: 'What is the pricing?' },
      {
        role: 'assistant',
        content: "I don't have any source material that answers this question.",
        citations: [],
        latencyMs: 200,
      },
    ];
    for (const t of turns) {
      await db.insert(schema.messages).values({
        conversationId: conv.id,
        role: t.role,
        content: t.content,
        citations: t.citations ?? null,
        latencyMs: t.latencyMs ?? null,
        promptTokens: t.promptTokens ?? null,
        completionTokens: t.completionTokens ?? null,
      });
      await new Promise((r) => setTimeout(r, 2));
    }

    // Noise on the other bot — analytics must ignore it.
    const [otherConv] = await db.insert(schema.conversations).values({ botId: otherBotId }).returning();
    await db.insert(schema.messages).values([
      { conversationId: otherConv.id, role: 'user', content: 'noise', latencyMs: null },
    ]);
  });

  afterAll(async () => {
    if (!enabled) return;
    const { eq, or } = await import('drizzle-orm');
    await db
      .delete(schema.users)
      .where(or(eq(schema.users.id, userId), eq(schema.users.id, otherUserId)));
  });

  it('getBotStats counts only this bot and breaks down by role', async () => {
    const stats = await analytics.getBotStats(userId, botId);
    expect(stats).not.toBeNull();
    expect(stats!.totalMessages).toBe(6);
    expect(stats!.userMessages).toBe(3);
    expect(stats!.assistantMessages).toBe(3);
    expect(stats!.totalConversations).toBe(1);
    expect(stats!.totalPromptTokens).toBe(200);
    expect(stats!.totalCompletionTokens).toBe(60);
    expect(stats!.avgLatencyMs).not.toBeNull();
  });

  it('getBotStats returns null when caller does not own the bot', async () => {
    const stats = await analytics.getBotStats(otherUserId, botId);
    expect(stats).toBeNull();
  });

  it('getTopQueries groups identical user messages', async () => {
    const top = await analytics.getTopQueries(userId, botId, 5);
    expect(top.length).toBeGreaterThan(0);
    const install = top.find((q) => q.content === 'How do I install?');
    expect(install).toBeDefined();
    expect(install!.count).toBe(2);
  });

  it('getContentGaps surfaces the preceding user question, not the fallback reply', async () => {
    const gaps = await analytics.getContentGaps(userId, botId, 5);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].question).toBe('What is the pricing?');
    expect(gaps[0].reply).toContain("don't have any source material");
  });

  it('getDailyMessageCounts returns one row per day in the window', async () => {
    const daily = await analytics.getDailyMessageCounts(userId, botId, 7);
    expect(daily).toHaveLength(7);
    const todayBucket = daily[daily.length - 1];
    expect(todayBucket.count).toBeGreaterThanOrEqual(3); // 3 user messages today
  });
});
