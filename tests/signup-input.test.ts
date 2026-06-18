import { describe, expect, it } from 'vitest';
import { z } from 'zod';

// Re-declared locally so we can test the schema independently of `db` and
// `auth` imports inside the server-action module.
const SignupInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
});

describe('signup input validation', () => {
  it('accepts a valid payload', () => {
    const result = SignupInput.safeParse({
      name: 'Ada Lovelace',
      email: 'Ada@Example.com',
      password: 'analytical-engine',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('ada@example.com');
    }
  });

  it('rejects passwords shorter than 8 characters', () => {
    const result = SignupInput.safeParse({ name: 'A', email: 'a@b.co', password: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects malformed email addresses', () => {
    const result = SignupInput.safeParse({ name: 'A', email: 'not-an-email', password: 'longenough' });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from name', () => {
    const result = SignupInput.safeParse({
      name: '  Grace Hopper  ',
      email: 'grace@example.com',
      password: 'compiler-1959',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe('Grace Hopper');
  });
});
