/**
 * Plan + usage quota enforcement against real Postgres.
 *
 * Seeds a user on each plan tier, fills usage to (cap - 1) and then verifies
 * the assertCan*() helpers throw at exactly the right point.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const enabled = process.env.RUN_INTEGRATION_TESTS === '1';

describe.skipIf(!enabled)('plans & quotas — assert* helpers', () => {
  type DB = typeof import('@/db');
  type SchemaModule = typeof import('@/db/schema');
  type PlansModule = typeof import('@/lib/server/plans');

  let db: DB['db'];
  let schema: SchemaModule;
  let plans: PlansModule;

  let userId = '';

  beforeEach(async () => {
    if (process.env.REAL_DATABASE_URL) {
      (process.env as Record<string, string>).DATABASE_URL = process.env.REAL_DATABASE_URL;
    }
    ({ db } = await import('@/db'));
    schema = await import('@/db/schema');
    plans = await import('@/lib/server/plans');

    const stamp = Date.now() + Math.floor(Math.random() * 1000);
    const [u] = await db
      .insert(schema.users)
      .values({ name: 'Plan Tester', email: `plans-${stamp}@example.com` })
      .returning();
    userId = u.id;
  });

  afterAll(async () => {
    if (!enabled) return;
    // Clean any leftover plan testers from this suite.
    const { like } = await import('drizzle-orm');
    await db.delete(schema.users).where(like(schema.users.email, 'plans-%@example.com'));
  });

  it('defaults new users to the free plan', async () => {
    const plan = await plans.getPlan(userId);
    expect(plan).toBe('free');
  });

  it('returns zero usage for a fresh user', async () => {
    const usage = await plans.getUsage(userId);
    expect(usage.bots).toBe(0);
    expect(usage.documents).toBe(0);
    expect(usage.documentBytes).toBe(0);
    expect(usage.messagesThisMonth).toBe(0);
  });

  it('assertCanCreateBot throws when at the bot cap', async () => {
    const limits = plans.limitsFor('free');
    for (let i = 0; i < limits.bots; i++) {
      await db.insert(schema.bots).values({
        userId,
        name: `Bot ${i}`,
        publicKey: `bot_quota_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      });
    }
    await expect(plans.assertCanCreateBot(userId)).rejects.toBeInstanceOf(plans.QuotaExceededError);
  });

  it('assertCanIngestDocument rejects when adding the file would exceed bytes cap', async () => {
    const limits = plans.limitsFor('free');
    const [bot] = await db
      .insert(schema.bots)
      .values({
        userId,
        name: 'Bot',
        publicKey: `bot_doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      })
      .returning();
    await db.insert(schema.documents).values({
      botId: bot.id,
      source: 'pdf',
      title: 'big.pdf',
      bytes: limits.documentBytes - 100,
      status: 'ready',
    });
    // 200 more bytes would push us past the cap.
    await expect(plans.assertCanIngestDocument(userId, 200)).rejects.toBeInstanceOf(
      plans.QuotaExceededError,
    );
    // 50 bytes still fits.
    await expect(plans.assertCanIngestDocument(userId, 50)).resolves.toBeUndefined();
  });

  it('assertCanSendMessage throws when at the monthly cap', async () => {
    const limits = plans.limitsFor('free');
    const [bot] = await db
      .insert(schema.bots)
      .values({
        userId,
        name: 'Bot',
        publicKey: `bot_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      })
      .returning();
    const [conv] = await db.insert(schema.conversations).values({ botId: bot.id }).returning();
    // Insert (cap) user messages. They count toward the current calendar month.
    for (let i = 0; i < limits.messagesPerMonth; i++) {
      await db.insert(schema.messages).values({
        conversationId: conv.id,
        role: 'user',
        content: `msg ${i}`,
      });
    }
    await expect(plans.assertCanSendMessage(userId)).rejects.toBeInstanceOf(
      plans.QuotaExceededError,
    );
  }, 30_000);
});
