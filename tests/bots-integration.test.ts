/**
 * Integration tests for the bot data layer. Hit a real Postgres with the
 * Drizzle schema already migrated. Skipped unless RUN_INTEGRATION_TESTS=1 so
 * the unit-test suite still passes on machines without a database.
 *
 * Each test uses a fresh pair of throwaway users so it can't leak state into
 * other tests; the suite cleans up at the end.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const enabled = process.env.RUN_INTEGRATION_TESTS === '1';

describe.skipIf(!enabled)('bot data layer — ownership boundary', () => {
  type DB = typeof import('@/db');
  type SchemaModule = typeof import('@/db/schema');
  type BotsModule = typeof import('@/lib/server/bots');

  let db: DB['db'];
  let schema: SchemaModule;
  let bots: BotsModule;
  let alice = '';
  let bob = '';

  beforeAll(async () => {
    // Override the test env's stub URL with the one from the real
    // environment before the modules read it.
    if (process.env.REAL_DATABASE_URL) {
      (process.env as Record<string, string>).DATABASE_URL = process.env.REAL_DATABASE_URL;
    }
    ({ db } = await import('@/db'));
    schema = await import('@/db/schema');
    bots = await import('@/lib/server/bots');

    const [a] = await db
      .insert(schema.users)
      .values({ name: 'Alice', email: `alice-${Date.now()}@example.com` })
      .returning();
    const [b] = await db
      .insert(schema.users)
      .values({ name: 'Bob', email: `bob-${Date.now()}@example.com` })
      .returning();
    alice = a.id;
    bob = b.id;
  });

  afterAll(async () => {
    if (!enabled) return;
    const { eq, or } = await import('drizzle-orm');
    await db.delete(schema.users).where(or(eq(schema.users.id, alice), eq(schema.users.id, bob)));
  });

  it('createBot generates a unique publicKey and scopes to the owner', async () => {
    const bot = await bots.createBot({ userId: alice, name: 'Alice Help' });
    expect(bot.userId).toBe(alice);
    expect(bot.publicKey).toMatch(/^bot_/);
    expect(bot.isActive).toBe(true);
  });

  it("getBotForUser returns null when the bot belongs to another user", async () => {
    const bot = await bots.createBot({ userId: alice, name: 'Private' });
    const bobView = await bots.getBotForUser(bob, bot.id);
    expect(bobView).toBeNull();
    const aliceView = await bots.getBotForUser(alice, bot.id);
    expect(aliceView?.id).toBe(bot.id);
  });

  it('updateBot refuses to touch another user\'s bot', async () => {
    const bot = await bots.createBot({ userId: alice, name: 'Original' });
    const attempt = await bots.updateBot({ userId: bob, botId: bot.id, name: 'Hijacked' });
    expect(attempt).toBeNull();
    const reread = await bots.getBotForUser(alice, bot.id);
    expect(reread?.name).toBe('Original');
  });

  it('deleteBot refuses to delete another user\'s bot', async () => {
    const bot = await bots.createBot({ userId: alice, name: 'Survives' });
    const ok = await bots.deleteBot(bob, bot.id);
    expect(ok).toBe(false);
    const reread = await bots.getBotForUser(alice, bot.id);
    expect(reread).not.toBeNull();
  });

  it('regeneratePublicKey rotates the key only when caller owns the bot', async () => {
    const bot = await bots.createBot({ userId: alice, name: 'Rotating' });
    const original = bot.publicKey;

    const failed = await bots.regeneratePublicKey(bob, bot.id);
    expect(failed).toBeNull();

    const rotated = await bots.regeneratePublicKey(alice, bot.id);
    expect(rotated).not.toBeNull();
    expect(rotated!.publicKey).not.toBe(original);
  });
});
