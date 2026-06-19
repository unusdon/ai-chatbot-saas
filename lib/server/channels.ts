/**
 * Channels data layer — bot ↔ Telegram / WhatsApp wiring.
 *
 * Per-provider config shapes are union-typed so the rest of the code never
 * deals with `unknown` jsonb. Ownership is enforced through bot.userId on
 * every read/write.
 */
import { randomBytes } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { bots, botChannels, type BotChannel } from '@/db/schema';

export type ChannelType = 'telegram' | 'whatsapp';

export type TelegramConfig = {
  botToken: string;
  /**
   * Group mode:
   *   - 'all'     → respond to every message in the chat
   *   - 'mention' → only when @botusername is in the text (default)
   *   - 'reply'   → only when the message is a reply to one of ours
   */
  groupMode: 'all' | 'mention' | 'reply';
  /** Cached @username — fetched on creation via getMe(). */
  username?: string;
};

export type WhatsappConfig = {
  /** Meta WABA phone number id (NOT the phone number). */
  phoneNumberId: string;
  /** Long-lived system-user access token. */
  accessToken: string;
  /** Verify token the admin set in Meta dashboard webhook config. */
  verifyToken: string;
  /** App secret used to validate X-Hub-Signature-256. */
  appSecret: string;
  /** Cached display phone number. */
  phoneNumber?: string;
};

export type ChannelConfigFor<T extends ChannelType> = T extends 'telegram'
  ? TelegramConfig
  : WhatsappConfig;

export function generateWebhookSecret(): string {
  return randomBytes(24).toString('base64url');
}

export async function listChannelsForBot(userId: string, botId: string): Promise<BotChannel[]> {
  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.id, botId), eq(bots.userId, userId)),
  });
  if (!bot) return [];
  return db
    .select()
    .from(botChannels)
    .where(eq(botChannels.botId, botId))
    .orderBy(asc(botChannels.createdAt));
}

export async function getChannelForUser(
  userId: string,
  channelId: string,
): Promise<BotChannel | null> {
  const rows = await db
    .select({ channel: botChannels })
    .from(botChannels)
    .innerJoin(bots, eq(botChannels.botId, bots.id))
    .where(and(eq(botChannels.id, channelId), eq(bots.userId, userId)))
    .limit(1);
  return rows[0]?.channel ?? null;
}

/**
 * Webhook lookup: routes find a channel by its embedded secret + verify the
 * bot owns it. Used by the inbound webhook endpoints — no userId because
 * the request comes from Telegram / WhatsApp, not from an admin session.
 */
export async function getChannelByWebhookSecret(
  channelId: string,
  webhookSecret: string,
): Promise<{ channel: BotChannel; ownerUserId: string } | null> {
  const rows = await db
    .select({ channel: botChannels, ownerUserId: bots.userId })
    .from(botChannels)
    .innerJoin(bots, eq(botChannels.botId, bots.id))
    .where(
      and(
        eq(botChannels.id, channelId),
        eq(botChannels.webhookSecret, webhookSecret),
        eq(botChannels.isActive, true),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

type CreateChannelInput<T extends ChannelType> = {
  userId: string;
  botId: string;
  type: T;
  config: ChannelConfigFor<T>;
  label?: string;
  externalIdentity?: string;
};

export async function createChannel<T extends ChannelType>(
  input: CreateChannelInput<T>,
): Promise<BotChannel | null> {
  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.id, input.botId), eq(bots.userId, input.userId)),
  });
  if (!bot) return null;

  const [row] = await db
    .insert(botChannels)
    .values({
      botId: input.botId,
      type: input.type,
      webhookSecret: generateWebhookSecret(),
      config: input.config as Record<string, unknown>,
      label: input.label ?? null,
      externalIdentity: input.externalIdentity ?? null,
    })
    .returning();
  return row;
}

export async function updateChannelMeta(
  channelId: string,
  patch: { externalIdentity?: string; lastSeenAt?: Date; lastError?: string | null },
): Promise<void> {
  const set: Partial<typeof botChannels.$inferInsert> = { updatedAt: new Date() };
  if (patch.externalIdentity !== undefined) set.externalIdentity = patch.externalIdentity;
  if (patch.lastSeenAt !== undefined) set.lastSeenAt = patch.lastSeenAt;
  if (patch.lastError !== undefined) set.lastError = patch.lastError;
  await db.update(botChannels).set(set).where(eq(botChannels.id, channelId));
}

export async function setChannelActive(
  userId: string,
  channelId: string,
  isActive: boolean,
): Promise<boolean> {
  const channel = await getChannelForUser(userId, channelId);
  if (!channel) return false;
  await db
    .update(botChannels)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(botChannels.id, channelId));
  return true;
}

export async function updateChannelConfig<T extends ChannelType>(
  userId: string,
  channelId: string,
  config: Partial<ChannelConfigFor<T>>,
): Promise<boolean> {
  const existing = await getChannelForUser(userId, channelId);
  if (!existing) return false;
  const merged = { ...(existing.config as Record<string, unknown>), ...config };
  await db
    .update(botChannels)
    .set({ config: merged, updatedAt: new Date() })
    .where(eq(botChannels.id, channelId));
  return true;
}

export async function deleteChannelForUser(userId: string, channelId: string): Promise<boolean> {
  const channel = await getChannelForUser(userId, channelId);
  if (!channel) return false;
  await db.delete(botChannels).where(eq(botChannels.id, channelId));
  return true;
}
