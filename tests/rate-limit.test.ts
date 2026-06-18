/**
 * Rate limiter behaviour against the real Redis (docker compose redis on 6379).
 * Skipped unless RUN_INTEGRATION_TESTS=1.
 */
import { afterAll, describe, expect, it } from 'vitest';

const enabled = process.env.RUN_INTEGRATION_TESTS === '1';

describe.skipIf(!enabled)('rate limiter — Redis-backed', () => {
  type Mod = typeof import('@/lib/server/rate-limit');
  let mod: Mod;

  afterAll(async () => {
    if (mod) await mod.closeRateLimit();
  });

  it('counts within the window and refuses past max', async () => {
    mod = await import('@/lib/server/rate-limit');

    const key = `unit-test:${Date.now()}-${Math.random()}`;
    const opts = { windowSeconds: 60, max: 3 };

    const r1 = await mod.rateLimit(key, opts);
    const r2 = await mod.rateLimit(key, opts);
    const r3 = await mod.rateLimit(key, opts);
    const r4 = await mod.rateLimit(key, opts);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
    expect(r4.allowed).toBe(false);
  });

  it('isolates different keys', async () => {
    mod = await import('@/lib/server/rate-limit');

    const opts = { windowSeconds: 60, max: 1 };
    const stamp = `${Date.now()}-${Math.random()}`;

    const a1 = await mod.rateLimit(`a:${stamp}`, opts);
    const a2 = await mod.rateLimit(`a:${stamp}`, opts);
    const b1 = await mod.rateLimit(`b:${stamp}`, opts);

    expect(a1.allowed).toBe(true);
    expect(a2.allowed).toBe(false);
    expect(b1.allowed).toBe(true);
  });
});
