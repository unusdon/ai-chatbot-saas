/**
 * Document data-layer integration test. Verifies that listDocumentsForBot
 * scopes correctly across the join through bot.userId — i.e. another user
 * sees nothing even when they pass a known botId.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const enabled = process.env.RUN_INTEGRATION_TESTS === '1';

describe.skipIf(!enabled)('document data layer — ownership boundary', () => {
  type DB = typeof import('@/db');
  type SchemaModule = typeof import('@/db/schema');
  type BotsModule = typeof import('@/lib/server/bots');
  type DocsModule = typeof import('@/lib/server/documents');

  let db: DB['db'];
  let schema: SchemaModule;
  let bots: BotsModule;
  let docs: DocsModule;
  let alice = '';
  let bob = '';
  let aliceBotId = '';
  let bobBotId = '';

  beforeAll(async () => {
    if (process.env.REAL_DATABASE_URL) {
      (process.env as Record<string, string>).DATABASE_URL = process.env.REAL_DATABASE_URL;
    }
    ({ db } = await import('@/db'));
    schema = await import('@/db/schema');
    bots = await import('@/lib/server/bots');
    docs = await import('@/lib/server/documents');

    const stamp = Date.now();
    const [a] = await db
      .insert(schema.users)
      .values({ name: 'Alice', email: `alice-docs-${stamp}@example.com` })
      .returning();
    const [b] = await db
      .insert(schema.users)
      .values({ name: 'Bob', email: `bob-docs-${stamp}@example.com` })
      .returning();
    alice = a.id;
    bob = b.id;
    aliceBotId = (await bots.createBot({ userId: alice, name: 'Alice Bot' })).id;
    bobBotId = (await bots.createBot({ userId: bob, name: 'Bob Bot' })).id;
  });

  afterAll(async () => {
    if (!enabled) return;
    const { eq, or } = await import('drizzle-orm');
    await db.delete(schema.users).where(or(eq(schema.users.id, alice), eq(schema.users.id, bob)));
  });

  it('listDocumentsForBot returns nothing when caller does not own the bot', async () => {
    await docs.createPendingDocument({ botId: aliceBotId, source: 'url', title: 'Hers', sourceUrl: 'https://a.test' });

    const bobView = await docs.listDocumentsForBot(bob, aliceBotId);
    expect(bobView).toHaveLength(0);

    const aliceView = await docs.listDocumentsForBot(alice, aliceBotId);
    expect(aliceView.length).toBeGreaterThanOrEqual(1);
  });

  it('getDocumentForUser scopes across the join', async () => {
    const doc = await docs.createPendingDocument({
      botId: aliceBotId,
      source: 'url',
      title: 'Secret',
      sourceUrl: 'https://a.test/secret',
    });

    const bobLookup = await docs.getDocumentForUser(bob, doc.id);
    expect(bobLookup).toBeNull();

    const aliceLookup = await docs.getDocumentForUser(alice, doc.id);
    expect(aliceLookup?.id).toBe(doc.id);
  });

  it('deleteDocumentForUser refuses to delete another user\'s document', async () => {
    const doc = await docs.createPendingDocument({
      botId: bobBotId,
      source: 'url',
      title: 'Bobs',
      sourceUrl: 'https://b.test',
    });

    const stolen = await docs.deleteDocumentForUser(alice, doc.id);
    expect(stolen).toBeNull();

    const stillThere = await docs.getDocumentForUser(bob, doc.id);
    expect(stillThere?.id).toBe(doc.id);
  });
});
