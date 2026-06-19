/**
 * Widget-side helpers: end-user identification (cookie or generated id) and
 * bot lookup by publicKey.
 *
 * End-users are not authenticated. We give each browser a stable random id
 * via a cookie so we can keep conversation history coherent and so per-user
 * rate limits actually rate-limit a user, not just an IP that may rotate.
 *
 * The conversation persistence helpers live in `lib/server/conversations.ts`
 * — this file only owns the public-key lookup + cookie-id generation.
 */
import { randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { bots, type Bot } from '@/db/schema';

export const END_USER_COOKIE_PREFIX = 'aichatbot_eu_';

export async function findBotByPublicKey(publicKey: string): Promise<Bot | null> {
  const row = await db.query.bots.findFirst({
    where: and(eq(bots.publicKey, publicKey), eq(bots.isActive, true)),
  });
  return row ?? null;
}

export function generateEndUserId(): string {
  return `eu_${randomBytes(12).toString('base64url')}`;
}
