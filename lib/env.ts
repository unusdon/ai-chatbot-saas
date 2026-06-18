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

  LLM_PROVIDER: z.enum(['openai', 'anthropic']).default('openai'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_CHAT_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_CHAT_MODEL: z.string().default('claude-haiku-4-5'),
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
