import { describe, expect, it } from 'vitest';

import { generatePublicKey } from '@/lib/keys';

describe('generatePublicKey', () => {
  it('uses the bot_ prefix by default', () => {
    expect(generatePublicKey()).toMatch(/^bot_[A-Za-z0-9_-]{32}$/);
  });

  it('accepts a custom prefix', () => {
    expect(generatePublicKey('widget')).toMatch(/^widget_[A-Za-z0-9_-]{32}$/);
  });

  it('produces unique values across calls', () => {
    const set = new Set(Array.from({ length: 50 }, () => generatePublicKey()));
    expect(set.size).toBe(50);
  });
});
