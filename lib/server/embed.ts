/**
 * OpenAI embeddings client with batching.
 *
 * `text-embedding-3-small` accepts up to 2048 inputs per request and up to
 * 8192 tokens per input. We batch on whichever constraint hits first.
 *
 * Constructor takes an OpenAI-shaped client so tests can pass a fake and so
 * future providers (Anthropic, local sentence-transformers) can drop in.
 */
import OpenAI from 'openai';

import { env } from '@/lib/env';
import { estimateTokens } from '@/lib/server/chunker';

export const EMBEDDING_DIMENSIONS = 1536;

const MAX_BATCH = 96;
const MAX_TOKENS_PER_REQUEST = 250_000; // safely under the 300k/min TPM limit

export interface EmbeddingsClient {
  embed(inputs: string[]): Promise<number[][]>;
}

class OpenAIEmbeddings implements EmbeddingsClient {
  constructor(private readonly client: OpenAI, private readonly model: string) {}

  async embed(inputs: string[]): Promise<number[][]> {
    if (inputs.length === 0) return [];
    const out: number[][] = new Array(inputs.length);
    let cursor = 0;
    while (cursor < inputs.length) {
      let batchEnd = cursor;
      let batchTokens = 0;
      while (
        batchEnd < inputs.length &&
        batchEnd - cursor < MAX_BATCH &&
        batchTokens + estimateTokens(inputs[batchEnd]) <= MAX_TOKENS_PER_REQUEST
      ) {
        batchTokens += estimateTokens(inputs[batchEnd]);
        batchEnd++;
      }
      // Always make progress, even if a single input exceeds the soft cap.
      if (batchEnd === cursor) batchEnd = cursor + 1;

      const slice = inputs.slice(cursor, batchEnd);
      const res = await this.client.embeddings.create({
        model: this.model,
        input: slice,
      });
      // The API returns embeddings in the same order as the inputs.
      for (let i = 0; i < res.data.length; i++) {
        out[cursor + i] = res.data[i].embedding;
      }
      cursor = batchEnd;
    }
    return out;
  }
}

let cached: EmbeddingsClient | null = null;

export function getEmbeddingsClient(): EmbeddingsClient {
  if (cached) return cached;
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for embedding. Add it to .env.local.');
  }
  cached = new OpenAIEmbeddings(
    new OpenAI({ apiKey: env.OPENAI_API_KEY }),
    env.OPENAI_EMBEDDING_MODEL,
  );
  return cached;
}

// Exported for tests so they can inject a fake instead of hitting OpenAI.
export function _setEmbeddingsClient(impl: EmbeddingsClient | null) {
  cached = impl;
}
