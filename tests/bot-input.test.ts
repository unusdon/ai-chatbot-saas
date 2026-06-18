import { describe, expect, it } from 'vitest';
import { z } from 'zod';

// Mirror the schema in app/(dashboard)/bots/actions.ts so we can validate it
// in isolation without booting Next.
const BotInput = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  systemPrompt: z
    .string()
    .trim()
    .max(8000)
    .optional()
    .or(z.literal('')),
});

describe('bot input validation', () => {
  it('accepts a valid name and empty system prompt', () => {
    const r = BotInput.safeParse({ name: 'Acme Help Center', systemPrompt: '' });
    expect(r.success).toBe(true);
  });

  it('rejects empty names', () => {
    const r = BotInput.safeParse({ name: '   ', systemPrompt: '' });
    expect(r.success).toBe(false);
  });

  it('rejects names longer than 120 chars', () => {
    const r = BotInput.safeParse({ name: 'a'.repeat(121), systemPrompt: '' });
    expect(r.success).toBe(false);
  });

  it('rejects system prompts longer than 8000 chars', () => {
    const r = BotInput.safeParse({ name: 'ok', systemPrompt: 'a'.repeat(8001) });
    expect(r.success).toBe(false);
  });

  it('trims whitespace from the name', () => {
    const r = BotInput.safeParse({ name: '  Acme  ', systemPrompt: '' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.name).toBe('Acme');
  });
});
