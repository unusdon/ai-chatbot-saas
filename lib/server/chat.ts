/**
 * RAG chat orchestration with pluggable LLM providers.
 *
 * Steps:
 *   1. Retrieve top-K chunks for the user query.
 *   2. Assemble a system prompt + retrieved context + the prior conversation
 *      turns + the new user message.
 *   3. Call the configured chat provider (OpenAI / Anthropic / Google /
 *      Deepseek / Ollama) and stream tokens.
 *   4. Return both the stream and the citations (chunkIds + scores) the caller
 *      should persist on the assistant message + render in the UI.
 *
 * Provider selection comes from CHAT_PROVIDER. Each provider has its own API
 * shape but every implementation conforms to the same `ChatClient` interface,
 * so the route handlers don't need to know which one's live.
 */
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

type ChatStreamArgs = { model: string; system: string; messages: ChatTurn[] };

export interface ChatClient {
  stream(args: ChatStreamArgs): AsyncIterable<string>;
}

let cachedClient: ChatClient | null = null;
let cachedModel: string | null = null;

export function _setChatClient(impl: ChatClient | null) {
  cachedClient = impl;
  // Tests don't care about the model name; default it so getProviderClient
  // short-circuits past the env-required-key check.
  cachedModel = impl ? 'test-model' : null;
}

function getProviderClient(): { client: ChatClient; model: string } {
  if (cachedClient && cachedModel) return { client: cachedClient, model: cachedModel };

  const provider = env.CHAT_PROVIDER;
  let client: ChatClient;
  let model: string;

  switch (provider) {
    case 'openai':
      if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required when CHAT_PROVIDER=openai');
      client = openaiCompatClient({ apiKey: env.OPENAI_API_KEY });
      model = env.OPENAI_CHAT_MODEL;
      break;
    case 'deepseek':
      if (!env.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY is required when CHAT_PROVIDER=deepseek');
      client = openaiCompatClient({
        apiKey: env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com/v1',
      });
      model = env.DEEPSEEK_CHAT_MODEL;
      break;
    case 'ollama':
      // Ollama exposes an OpenAI-compatible /v1/chat/completions endpoint.
      // No API key needed but the SDK requires a non-empty string.
      client = openaiCompatClient({
        apiKey: 'ollama',
        baseURL: `${env.OLLAMA_BASE_URL.replace(/\/$/, '')}/v1`,
      });
      model = env.OLLAMA_CHAT_MODEL;
      break;
    case 'anthropic':
      if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required when CHAT_PROVIDER=anthropic');
      client = anthropicClient({ apiKey: env.ANTHROPIC_API_KEY });
      model = env.ANTHROPIC_CHAT_MODEL;
      break;
    case 'google':
      if (!env.GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY is required when CHAT_PROVIDER=google');
      client = googleClient({ apiKey: env.GOOGLE_API_KEY });
      model = env.GOOGLE_CHAT_MODEL;
      break;
  }

  cachedClient = client;
  cachedModel = model;
  return { client, model };
}

function openaiCompatClient(config: { apiKey: string; baseURL?: string }): ChatClient {
  const openai = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
  return {
    stream({ model, system, messages }) {
      return iterateOpenAI(
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

async function* iterateOpenAI(
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

function anthropicClient(config: { apiKey: string }): ChatClient {
  const anthropic = new Anthropic({ apiKey: config.apiKey });
  return {
    stream({ model, system, messages }) {
      return iterateAnthropic(anthropic, { model, system, messages });
    },
  };
}

async function* iterateAnthropic(
  anthropic: Anthropic,
  args: ChatStreamArgs,
): AsyncIterable<string> {
  // Anthropic API: system is top-level; messages must alternate user/assistant
  // and end with a user message.
  const stream = anthropic.messages.stream({
    model: args.model,
    system: args.system,
    max_tokens: 1024,
    messages: args.messages.map((m) => ({ role: m.role, content: m.content })),
  });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      if (event.delta.text) yield event.delta.text;
    }
  }
}

function googleClient(config: { apiKey: string }): ChatClient {
  const genai = new GoogleGenerativeAI(config.apiKey);
  return {
    stream({ model, system, messages }) {
      return iterateGoogle(genai, { model, system, messages });
    },
  };
}

async function* iterateGoogle(
  genai: GoogleGenerativeAI,
  args: ChatStreamArgs,
): AsyncIterable<string> {
  const m = genai.getGenerativeModel({
    model: args.model,
    systemInstruction: args.system,
  });
  // Gemini chat history uses `role: 'user' | 'model'` (not 'assistant').
  const history = args.messages.slice(0, -1).map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));
  const lastUser = args.messages[args.messages.length - 1];
  const chat = m.startChat({ history });
  const stream = await chat.sendMessageStream(lastUser?.content ?? '');
  for await (const chunk of stream.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
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
  const { client, model } = getProviderClient();
  const stream = client.stream({
    model,
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
