import { describe, expect, it } from 'vitest';

import { env } from '@/lib/env';

describe('env validation', () => {
  it('parses the unit-test environment without throwing', () => {
    expect(env.AUTH_SECRET).toBeDefined();
    expect(env.AUTH_SECRET.length).toBeGreaterThanOrEqual(16);
    expect(env.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
  });

  it('applies safe defaults for optional fields', () => {
    expect(env.LLM_PROVIDER).toBe('openai');
    expect(env.OPENAI_CHAT_MODEL).toBe('gpt-4o-mini');
    expect(env.OPENAI_EMBEDDING_MODEL).toBe('text-embedding-3-small');
    expect(env.S3_REGION).toBe('us-east-1');
    expect(env.S3_FORCE_PATH_STYLE).toBe(false);
  });
});
