/**
 * RAG chat orchestration.
 *
 * Steps:
 *   1. Retrieve top-K chunks for the user query.
 *   2. Assemble a system prompt + retrieved context + the prior conversation
 *      turns + the new user message.
 *   3. Call OpenAI chat completions (streamed).
 *   4. Return both the stream and the citations (chunkIds + scores) the caller
 *      should persist on the assistant message + render in the UI.
 *
 * The OpenAI client is swappable for tests.
 */
import OpenAI from 'openai';

import { env } from '@/lib/env';
import { retrieveContext, type RetrievedChunk } from '@/lib/server/retrieval';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export type RagChatInput = {
  userId: string;
  botId: string;
  systemPrompt: string;
  message: string;
  history?: ChatTurn[];
};

export type RagChatResult = {
  stream: AsyncIterable<string>;
  citations: Array<{ chunkId: string; score: number; documentTitle: string; sourceUrl: string | null }>;
};

const NO_CONTEXT_FALLBACK =
  "I don't have any source material that answers this question. " +
  'Add a PDF or URL to this bot, then try again.';

let openaiClient: { stream(args: ChatStreamArgs): AsyncIterable<string> } | null = null;

type ChatStreamArgs = { model: string; system: string; messages: ChatTurn[] };

function defaultClient() {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required to chat. Add it to .env.local.');
  }
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return {
    stream({ model, system, messages }: ChatStreamArgs): AsyncIterable<string> {
      return iterateChunks(
        openai.chat.completions.create({
          model,
          stream: true,
          messages: [
            { role: 'system', content: system },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
      );
    },
  };
}

async function* iterateChunks(
  streamPromise: Promise<
    AsyncIterable<{ choices: Array<{ delta: { content?: string | null } }> }>
  >,
): AsyncIterable<string> {
  const stream = await streamPromise;
  for await (const chunk of stream) {
    const piece = chunk.choices[0]?.delta?.content;
    if (piece) yield piece;
  }
}

export function _setChatClient(impl: typeof openaiClient) {
  openaiClient = impl;
}

export async function ragChat(input: RagChatInput): Promise<RagChatResult> {
  const retrieved = await retrieveContext(input.userId, input.botId, input.message, {
    topK: 6,
    minScore: 0.2,
  });

  if (retrieved.length === 0) {
    return {
      stream: yieldOnce(NO_CONTEXT_FALLBACK),
      citations: [],
    };
  }

  const system = buildSystemPrompt(input.systemPrompt, retrieved);
  const client = openaiClient ?? defaultClient();
  const stream = client.stream({
    model: env.OPENAI_CHAT_MODEL,
    system,
    messages: [...(input.history ?? []), { role: 'user', content: input.message }],
  });

  return {
    stream,
    citations: retrieved.map((r) => ({
      chunkId: r.chunk.id,
      score: r.score,
      documentTitle: r.document.title,
      sourceUrl: r.document.sourceUrl,
    })),
  };
}

function buildSystemPrompt(userSystem: string, retrieved: RetrievedChunk[]): string {
  const contextBlock = retrieved
    .map((r, i) => `[${i + 1}] (from "${r.document.title}")\n${r.chunk.content.trim()}`)
    .join('\n\n---\n\n');

  return [
    userSystem.trim(),
    '',
    'Use ONLY the context below to answer. If the answer is not in the context, say you don\'t know — do NOT invent facts.',
    'Cite sources inline as [1], [2], etc., matching the numbered chunks. Keep citations next to the claim they support.',
    '',
    'Context:',
    contextBlock,
  ].join('\n');
}

async function* yieldOnce(s: string): AsyncIterable<string> {
  yield s;
}
