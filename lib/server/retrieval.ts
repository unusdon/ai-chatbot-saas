/**
 * Vector-search retrieval. Given a free-text query and a botId, returns the
 * top-K chunks (by cosine distance against the query embedding).
 *
 * pgvector's `<=>` operator returns cosine distance (lower = closer). We
 * convert to a similarity score (higher = closer) for the citation payload so
 * UI code doesn't have to invert it.
 */
import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { bots, chunks, documents, type Chunk } from '@/db/schema';
import { getEmbeddingsClient } from '@/lib/server/embed';

export type RetrievedChunk = {
  chunk: Chunk;
  score: number; // cosine similarity in [-1, 1], higher = more similar
  document: { id: string; title: string; source: string; sourceUrl: string | null };
};

export type RetrievalOptions = {
  topK?: number;
  // chunks scoring below this similarity are dropped — keeps obviously
  // unrelated context out of the prompt.
  minScore?: number;
};

export async function retrieveContext(
  userId: string,
  botId: string,
  query: string,
  opts: RetrievalOptions = {},
): Promise<RetrievedChunk[]> {
  const topK = opts.topK ?? 6;
  const minScore = opts.minScore ?? 0.2;

  if (!query.trim()) return [];

  // Ownership precheck — even if the caller forgot, we bail before embedding.
  const ownedBot = await db.query.bots.findFirst({
    where: and(eq(bots.id, botId), eq(bots.userId, userId)),
  });
  if (!ownedBot) return [];

  const [embedding] = await getEmbeddingsClient().embed([query]);
  if (!embedding) return [];

  const embeddingLiteral = `[${embedding.join(',')}]`;

  // The HNSW index built in `chunk_embedding_idx` is `vector_cosine_ops`,
  // so this query uses the index. Score = 1 - distance.
  const rows = await db
    .select({
      chunk: chunks,
      distance: sql<number>`${chunks.embedding} <=> ${embeddingLiteral}::vector`.as('distance'),
      document: {
        id: documents.id,
        title: documents.title,
        source: documents.source,
        sourceUrl: documents.sourceUrl,
      },
    })
    .from(chunks)
    .innerJoin(documents, eq(chunks.documentId, documents.id))
    .where(eq(chunks.botId, botId))
    .orderBy(sql`distance`)
    .limit(topK);

  return rows
    .map((r) => ({
      chunk: r.chunk,
      score: 1 - Number(r.distance),
      document: r.document,
    }))
    .filter((r) => r.score >= minScore);
}
