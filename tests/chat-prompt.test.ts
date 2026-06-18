/**
 * Unit test for the chat prompt assembly path. Stubs the embedder and chat
 * client so we can introspect what the OpenAI call would receive.
 *
 * Why an integration-flavored test: the prompt structure (system + context +
 * citations instruction + history) is the load-bearing piece of RAG quality —
 * a change here that silently drops the "use only the context" instruction
 * would let the model hallucinate. We assert the shape stays put.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const enabled = process.env.RUN_INTEGRATION_TESTS === '1';

describe.skipIf(!enabled)('chat prompt assembly', () => {
  type DB = typeof import('@/db');
  type SchemaModule = typeof import('@/db/schema');
  type EmbedModule = typeof import('@/lib/server/embed');
  type ChatModule = typeof import('@/lib/server/chat');

  let db: DB['db'];
  let schema: SchemaModule;
  let embed: EmbedModule;
  let chat: ChatModule;

  let userId = '';
  let botId = '';
  let captured: { system: string; messages: { role: string; content: string }[] } | null = null;

  beforeAll(async () => {
    if (process.env.REAL_DATABASE_URL) {
      (process.env as Record<string, string>).DATABASE_URL = process.env.REAL_DATABASE_URL;
    }
    ({ db } = await import('@/db'));
    schema = await import('@/db/schema');
    embed = await import('@/lib/server/embed');
    chat = await import('@/lib/server/chat');

    embed._setEmbeddingsClient({
      async embed(inputs) {
        // Make the query embedding match the chunk embedding for chunk index 0
        // so retrieval definitely returns at least one row.
        return inputs.map(() => fixedVector(0));
      },
    });
    chat._setChatClient({
      stream({ system, messages }) {
        captured = { system, messages };
        return (async function* () {
          yield 'stub-response';
        })();
      },
    });

    const stamp = Date.now();
    const [u] = await db
      .insert(schema.users)
      .values({ name: 'Chat Tester', email: `chat-${stamp}@example.com` })
      .returning();
    userId = u.id;
    const [b] = await db
      .insert(schema.bots)
      .values({ userId, name: 'Chat Bot', publicKey: `bot_chat_${stamp}` })
      .returning();
    botId = b.id;
    const [doc] = await db
      .insert(schema.documents)
      .values({ botId, source: 'url', title: 'Spec doc', status: 'ready', chunkCount: 1 })
      .returning();
    await db.insert(schema.chunks).values({
      documentId: doc.id,
      botId,
      chunkIndex: 0,
      content: 'The widget loads via a single script tag and renders in a Shadow DOM.',
      tokens: 18,
      embedding: fixedVector(0),
    });
  });

  afterAll(async () => {
    if (!enabled) return;
    embed._setEmbeddingsClient(null);
    chat._setChatClient(null);
    const { eq } = await import('drizzle-orm');
    await db.delete(schema.users).where(eq(schema.users.id, userId));
  });

  it('includes the user system prompt, the context block, and the citations instruction', async () => {
    const result = await chat.ragChat({
      userId,
      botId,
      systemPrompt: 'You answer questions about the embed widget.',
      message: 'How does it load?',
    });
    // Drain the stream
    for await (const _ of result.stream) void _;

    expect(captured).not.toBeNull();
    expect(captured!.system).toContain('You answer questions about the embed widget.');
    expect(captured!.system).toContain('Use ONLY the context');
    expect(captured!.system).toContain('Cite sources inline as [1], [2]');
    expect(captured!.system).toContain('widget loads via a single script tag');

    expect(captured!.messages[captured!.messages.length - 1]).toMatchObject({
      role: 'user',
      content: 'How does it load?',
    });

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]).toMatchObject({ documentTitle: 'Spec doc' });
  });

  it('falls back to a "no source material" answer when retrieval finds nothing', async () => {
    // Use a different botId that has no chunks
    const stamp = Date.now() + 1;
    const [b2] = await db
      .insert(schema.bots)
      .values({ userId, name: 'Empty Bot', publicKey: `bot_empty_${stamp}` })
      .returning();
    captured = null;
    const result = await chat.ragChat({
      userId,
      botId: b2.id,
      systemPrompt: 'You answer questions.',
      message: 'anything',
    });
    let text = '';
    for await (const piece of result.stream) text += piece;
    expect(text).toMatch(/don't have any source material/i);
    expect(captured).toBeNull(); // chat client NOT called when no context
    expect(result.citations).toHaveLength(0);
  });
});

function fixedVector(seed: number): number[] {
  // Deterministic vector: just put the seed in [0] and zeros elsewhere. Two
  // vectors with the same seed are identical → cosine distance 0.
  const dims = 1536;
  const v = new Array(dims).fill(0);
  v[0] = 1 + seed * 0.001;
  return v;
}
