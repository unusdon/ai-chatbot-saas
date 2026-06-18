/**
 * Redis-backed fixed-window rate limiter.
 *
 * Simple by design: count requests in N-second buckets. Not as smooth as a
 * sliding window but the math is bulletproof and Redis-cheap (a single
 * INCR + EXPIRE per request).
 *
 * Falls back to "always allowed" when REDIS_URL is unset so the rest of the
 * app boots without Redis — explicit-fail-open is the right choice because
 * the widget endpoint is auth-less; refusing all requests during a Redis
 * outage would take customers' chat down.
 */
import { Redis } from 'ioredis';

import { env } from '@/lib/env';

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number; // unix seconds when the current window expires
};

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!env.REDIS_URL) return null;
  if (redis) return redis;
  redis = new Redis(env.REDIS_URL, {
    // Buffer commands during the initial connect handshake (the default).
    // maxRetriesPerRequest caps per-command retries so we don't queue
    // forever when Redis is genuinely down — the rateLimit catch block
    // then fails open.
    maxRetriesPerRequest: 2,
  });
  redis.on('error', (e) => {
    // eslint-disable-next-line no-console
    console.error('[rate-limit] redis error:', e.message);
  });
  return redis;
}

export type RateLimitOptions = {
  windowSeconds: number;
  max: number;
};

export async function rateLimit(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  const r = getRedis();
  const nowSec = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(nowSec / opts.windowSeconds);
  const resetAt = (bucket + 1) * opts.windowSeconds;

  if (!r) {
    return { allowed: true, remaining: opts.max, resetAt };
  }

  const redisKey = `rl:${key}:${bucket}`;
  try {
    const count = await r.incr(redisKey);
    if (count === 1) {
      // First request in this bucket — set TTL so the key dies with the window.
      await r.expire(redisKey, opts.windowSeconds);
    }
    return {
      allowed: count <= opts.max,
      remaining: Math.max(0, opts.max - count),
      resetAt,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[rate-limit] failure, failing open:', (error as Error).message);
    return { allowed: true, remaining: opts.max, resetAt };
  }
}

export async function closeRateLimit() {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
