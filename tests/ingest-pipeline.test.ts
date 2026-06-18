/**
 * End-to-end ingest pipeline test. Hits real Postgres + real S3 (MinIO) and a
 * fake embeddings client so we don't burn OpenAI tokens.
 *
 * Scenario:
 *   - seed user → bot → document(source=pdf) → put PDF bytes in S3
 *   - install a deterministic embedder
 *   - run runIngest() → assert chunks land in `chunk` with embeddings,
 *     document status becomes `ready`, chunkCount matches.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const enabled = process.env.RUN_INTEGRATION_TESTS === '1';

describe.skipIf(!enabled)('ingest pipeline — full PDF flow', () => {
  type DB = typeof import('@/db');
  type SchemaModule = typeof import('@/db/schema');
  type EmbedModule = typeof import('@/lib/server/embed');
  type ExtractModule = typeof import('@/lib/server/extract');
  type IngestModule = typeof import('@/lib/server/ingest');
  type StorageModule = typeof import('@/lib/server/storage');

  let db: DB['db'];
  let schema: SchemaModule;
  let embed: EmbedModule;
  let extract: ExtractModule;
  let ingest: IngestModule;
  let storage: StorageModule;

  // The text the fake extractor returns — chunker should split this into many.
  const SOURCE_TEXT =
    'Hello world. ' +
    'This is a sentence. '.repeat(200) +
    'And here is more text describing how the pipeline should chunk on natural boundaries.';

  let userId = '';
  let botId = '';
  let documentId = '';

  beforeAll(async () => {
    if (process.env.REAL_DATABASE_URL) {
      (process.env as Record<string, string>).DATABASE_URL = process.env.REAL_DATABASE_URL;
    }
    ({ db } = await import('@/db'));
    schema = await import('@/db/schema');
    embed = await import('@/lib/server/embed');
    extract = await import('@/lib/server/extract');
    ingest = await import('@/lib/server/ingest');
    storage = await import('@/lib/server/storage');

    // Deterministic fake embeddings: 1536-d vector with the input length in
    // [0] and zeros elsewhere. Real model swapped in via getEmbeddingsClient.
    embed._setEmbeddingsClient({
      async embed(inputs: string[]) {
        return inputs.map((s) => {
          const v = new Array(embed.EMBEDDING_DIMENSIONS).fill(0);
          v[0] = s.length;
          return v;
        });
      },
    });

    // Fake extractor — returns SOURCE_TEXT for any PDF buffer / URL. Avoids
    // depending on pdf-parse's strict xref validation when synthesizing PDFs.
    extract._setExtractor({
      async fromPdf() {
        return { text: SOURCE_TEXT };
      },
      async fromUrl() {
        return { text: SOURCE_TEXT };
      },
    });

    const stamp = Date.now();
    const [u] = await db
      .insert(schema.users)
      .values({ name: 'Ingest Tester', email: `ingest-${stamp}@example.com` })
      .returning();
    userId = u.id;
    const [b] = await db
      .insert(schema.bots)
      .values({ userId, name: 'Ingest Bot', publicKey: `bot_ingest_${stamp}` })
      .returning();
    botId = b.id;
  });

  afterAll(async () => {
    if (!enabled) return;
    embed._setEmbeddingsClient(null);
    extract._setExtractor(null);
    const { eq } = await import('drizzle-orm');
    await db.delete(schema.users).where(eq(schema.users.id, userId));
  });

  it('PDF → chunks → embeddings → ready', async () => {
    // PDF bytes are opaque to the test because the extractor is stubbed;
    // we just need *something* in S3 so the storage layer round-trips.
    const placeholderBytes = Buffer.from('%PDF-1.4 (test fixture — extractor is stubbed)');
    const [doc] = await db
      .insert(schema.documents)
      .values({
        botId,
        source: 'pdf',
        title: 'sample.pdf',
        bytes: placeholderBytes.length,
        status: 'pending',
      })
      .returning();
    documentId = doc.id;
    const key = storage.documentStorageKey(botId, doc.id, '.pdf');
    await storage.storage.putObject(key, placeholderBytes, 'application/pdf');
    const { eq } = await import('drizzle-orm');
    await db.update(schema.documents).set({ storageKey: key }).where(eq(schema.documents.id, doc.id));

    const result = await ingest.runIngest(doc.id);
    expect(result.chunkCount).toBeGreaterThan(0);

    const fresh = await db.query.documents.findFirst({
      where: eq(schema.documents.id, doc.id),
    });
    expect(fresh?.status).toBe('ready');
    expect(fresh?.chunkCount).toBe(result.chunkCount);

    const persistedChunks = await db.query.chunks.findMany({
      where: eq(schema.chunks.documentId, doc.id),
      orderBy: schema.chunks.chunkIndex,
    });
    expect(persistedChunks.length).toBe(result.chunkCount);
    expect(persistedChunks[0].embedding?.length).toBe(embed.EMBEDDING_DIMENSIONS);
    expect(persistedChunks[0].embedding?.[0]).toBeGreaterThan(0);

    await storage.storage.deleteObject(key);
  });

  it('is idempotent — re-running clears prior chunks', async () => {
    const { eq } = await import('drizzle-orm');
    const before = await db.query.chunks.findMany({
      where: eq(schema.chunks.documentId, documentId),
    });
    expect(before.length).toBeGreaterThan(0);

    const placeholderBytes = Buffer.from('%PDF-1.4 (retry fixture)');
    const key = storage.documentStorageKey(botId, documentId, '.pdf');
    await storage.storage.putObject(key, placeholderBytes, 'application/pdf');

    await ingest.runIngest(documentId);

    const after = await db.query.chunks.findMany({
      where: eq(schema.chunks.documentId, documentId),
    });
    expect(after.length).toBeGreaterThan(0);
    // No duplicates: every (documentId, chunkIndex) pair is unique
    const indexes = after.map((c) => c.chunkIndex).sort((a, b) => a - b);
    expect(new Set(indexes).size).toBe(indexes.length);
    await storage.storage.deleteObject(key);
  });
});

