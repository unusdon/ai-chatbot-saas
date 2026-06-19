/**
 * Strict, typed environment-variable validation.
 *
 * Read once at module load; throws loudly with a list of missing keys if
 * misconfigured so misconfig fails fast at boot, not on the first request.
 */
import { z } from 'zod';

const Server = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  AUTH_SECRET: z.string().min(16, 'AUTH_SECRET must be at least 16 characters'),
  AUTH_URL: z.string().url().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  DATABASE_URL: z.string().url(),

  REDIS_URL: z.string().url().optional(),

  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),

  // Two independent provider knobs:
  //   CHAT_PROVIDER     — which LLM streams chat answers
  //   EMBEDDING_PROVIDER — which model turns chunks into vectors
  // They can differ (e.g., Ollama chat + OpenAI embeddings) since embeddings
  // need a 1536-dim model to fit the existing pgvector column without a
  // schema change.
  CHAT_PROVIDER: z
    .enum(['openai', 'anthropic', 'google', 'deepseek', 'ollama'])
    .default('openai'),
  EMBEDDING_PROVIDER: z.enum(['openai', 'google', 'ollama']).default('openai'),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_CHAT_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),

  // Anthropic (Claude) — chat only
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_CHAT_MODEL: z.string().default('claude-3-5-haiku-latest'),

  // Google (Gemini) — chat + embeddings
  GOOGLE_API_KEY: z.string().optional(),
  GOOGLE_CHAT_MODEL: z.string().default('gemini-1.5-flash'),
  GOOGLE_EMBEDDING_MODEL: z.string().default('text-embedding-004'),

  // Deepseek — OpenAI-compatible API, chat only
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_CHAT_MODEL: z.string().default('deepseek-chat'),

  // Ollama — local, OpenAI-compatible chat + embeddings. No API key needed.
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_CHAT_MODEL: z.string().default('llama3.2'),
  OLLAMA_EMBEDDING_MODEL: z.string().default('nomic-embed-text'),

  // Legacy alias — used by older code paths. Pre-existing env files should
  // continue to work.
  LLM_PROVIDER: z.enum(['openai', 'anthropic']).optional(),

  // Stripe — all optional. When unset, the /billing endpoints respond with a
  // "billing not configured" error so the rest of the app still boots.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
});

const Client = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

const parsed = Server.merge(Client).safeParse({
  ...process.env,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

if (!parsed.success) {
  // Surface the missing/invalid keys at startup so we don't fail at first request.
  // eslint-disable-next-line no-console
  console.error(
    '❌ Invalid environment variables:',
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
  throw new Error('Invalid environment configuration — see logs above.');
}

export const env = parsed.data;
export type Env = typeof env;
