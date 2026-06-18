import { describe, expect, it } from 'vitest';

import { chunkText, estimateTokens } from '@/lib/server/chunker';

describe('chunkText', () => {
  it('returns an empty array for empty input', () => {
    expect(chunkText('')).toHaveLength(0);
    expect(chunkText('   \n  \n  ')).toHaveLength(0);
  });

  it('returns a single chunk when the text fits in chunkSize', () => {
    const r = chunkText('short text', { chunkSize: 1000 });
    expect(r).toHaveLength(1);
    expect(r[0].content).toBe('short text');
  });

  it('splits long text into multiple ~chunkSize-sized chunks', () => {
    const para = 'This is one sentence. '.repeat(200);
    const r = chunkText(para, { chunkSize: 200, chunkOverlap: 30 });
    expect(r.length).toBeGreaterThan(1);
    for (const c of r) {
      expect(c.content.length).toBeLessThanOrEqual(220);
    }
  });

  it('overlaps adjacent chunks', () => {
    const text = 'a'.repeat(400) + 'b'.repeat(400) + 'c'.repeat(400);
    const r = chunkText(text, { chunkSize: 500, chunkOverlap: 100 });
    expect(r.length).toBeGreaterThanOrEqual(2);
    // Overlap means each chunk shares at least a few chars with the prior tail.
    for (let i = 1; i < r.length; i++) {
      const tail = r[i - 1].content.slice(-40);
      const head = r[i].content.slice(0, 40);
      const overlap = countSharedChars(tail, head);
      expect(overlap).toBeGreaterThan(0);
    }
  });

  it('records a token estimate per chunk', () => {
    const r = chunkText('hello world');
    expect(r[0].tokens).toBeGreaterThan(0);
    expect(r[0].tokens).toBeLessThan(10);
  });

  it('rejects nonsensical overlap configuration', () => {
    expect(() => chunkText('x', { chunkSize: 100, chunkOverlap: 200 })).toThrow();
  });
});

describe('estimateTokens', () => {
  it('returns at least 1 for any non-empty string', () => {
    expect(estimateTokens('x')).toBeGreaterThanOrEqual(1);
  });
  it('roughly scales 1 token / 4 chars', () => {
    expect(estimateTokens('a'.repeat(40))).toBeGreaterThanOrEqual(10);
    expect(estimateTokens('a'.repeat(40))).toBeLessThanOrEqual(15);
  });
});

function countSharedChars(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[a.length - 1 - i] === b[i]) i++;
  return i;
}
