/**
 * Embedding client — pluggable provider.
 *
 * Provider selection comes from EMBEDDING_PROVIDER. The chunk.embedding
 * column is sized `vector(1536)` so providers with smaller native dims
 * (Google: 768, Ollama nomic-embed-text: 768) get zero-padded to 1536.
 * Cosine similarity in the padded space still works — zeros add no
 * energy, so the angular distance between two padded vectors equals
 * the distance between the original sub-vectors.
 *
 * `text-embedding-3-small` accepts up to 2048 inputs per request and up to
 * 8192 tokens per input. We batch on whichever constraint hits first.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

import { env } from '@/lib/env';
import { estimateTokens } from '@/lib/server/chunker';

export const EMBEDDING_DIMENSIONS = 1536;

const MAX_BATCH = 96;
const MAX_TOKENS_PER_REQUEST = 250_000;

export interface EmbeddingsClient {
  embed(inputs: string[]): Promise<number[][]>;
}

let cached: EmbeddingsClient | null = null;

export function _setEmbeddingsClient(impl: EmbeddingsClient | null) {
  cached = impl;
}

export function isEmbeddingConfigured(): boolean {
  // Tests inject a fake client via `_setEmbeddingsClient` — that counts.
  if (cached) return true;
  switch (env.EMBEDDING_PROVIDER) {
    case 'openai':
      return Boolean(env.OPENAI_API_KEY);
    case 'google':
      return Boolean(env.GOOGLE_API_KEY);
    case 'ollama':
      return Boolean(env.OLLAMA_BASE_URL);
  }
}

export function getEmbeddingsClient(): EmbeddingsClient {
  if (cached) return cached;

  switch (env.EMBEDDING_PROVIDER) {
    case 'openai':
      if (!env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai');
      }
      cached = new OpenAICompatEmbeddings(
        new OpenAI({ apiKey: env.OPENAI_API_KEY }),
        env.OPENAI_EMBEDDING_MODEL,
      );
      break;
    case 'ollama':
      // Ollama exposes an OpenAI-compatible /v1/embeddings endpoint. nomic
      // returns 768-dim vectors — we pad to 1536 in finalize().
      cached = new OpenAICompatEmbeddings(
        new OpenAI({
          apiKey: 'ollama',
          baseURL: `${env.OLLAMA_BASE_URL.replace(/\/$/, '')}/v1`,
        }),
        env.OLLAMA_EMBEDDING_MODEL,
      );
      break;
    case 'google':
      if (!env.GOOGLE_API_KEY) {
        throw new Error('GOOGLE_API_KEY is required when EMBEDDING_PROVIDER=google');
      }
      cached = new GoogleEmbeddings(new GoogleGenerativeAI(env.GOOGLE_API_KEY), env.GOOGLE_EMBEDDING_MODEL);
      break;
  }
  return cached!;
}

class OpenAICompatEmbeddings implements EmbeddingsClient {
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
      if (batchEnd === cursor) batchEnd = cursor + 1;

      const slice = inputs.slice(cursor, batchEnd);
      const res = await this.client.embeddings.create({ model: this.model, input: slice });
      for (let i = 0; i < res.data.length; i++) {
        out[cursor + i] = finalize(res.data[i].embedding);
      }
      cursor = batchEnd;
    }
    return out;
  }
}

class GoogleEmbeddings implements EmbeddingsClient {
  constructor(private readonly genai: GoogleGenerativeAI, private readonly model: string) {}

  async embed(inputs: string[]): Promise<number[][]> {
    if (inputs.length === 0) return [];
    const m = this.genai.getGenerativeModel({ model: this.model });
    const out: number[][] = [];
    for (const input of inputs) {
      const res = await m.embedContent(input);
      out.push(finalize(res.embedding.values));
    }
    return out;
  }
}

/**
 * Normalize a provider's native vector to EMBEDDING_DIMENSIONS. Smaller
 * vectors get zero-padded; larger get truncated. Both operations preserve
 * cosine direction in the relevant sub-space.
 */
function finalize(v: number[]): number[] {
  if (v.length === EMBEDDING_DIMENSIONS) return v;
  if (v.length < EMBEDDING_DIMENSIONS) {
    const padded = new Array(EMBEDDING_DIMENSIONS).fill(0);
    for (let i = 0; i < v.length; i++) padded[i] = v[i];
    return padded;
  }
  return v.slice(0, EMBEDDING_DIMENSIONS);
}
