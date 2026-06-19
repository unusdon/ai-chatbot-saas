'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  createChannel,
  deleteChannelForUser,
  generateWebhookSecret,
  getChannelForUser,
  setChannelActive,
  type TelegramConfig,
  type WhatsappConfig,
} from '@/lib/server/channels';
import { env } from '@/lib/env';
import { getMe, setWebhook, deleteWebhook } from '@/lib/server/telegram';
import { requireAuth } from '@/lib/server/require-auth';

export type ActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string; field?: string }
  | { status: 'ok'; message: string };

// ───────────────────────── Telegram ─────────────────────────

const TelegramInput = z.object({
  botId: z.string().uuid(),
  botToken: z.string().trim().regex(/^\d+:[\w-]+$/, 'Token format looks wrong — copy it from @BotFather'),
  groupMode: z.enum(['all', 'mention', 'reply']).default('mention'),
  label: z.string().trim().max(120).optional(),
});

export async function createTelegramChannelAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();
  const parsed = TelegramInput.safeParse({
    botId: formData.get('botId'),
    botToken: formData.get('botToken'),
    groupMode: formData.get('groupMode') ?? 'mention',
    label: formData.get('label') ?? undefined,
  });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.errors[0].message, field: parsed.error.errors[0].path[0] as string };
  }

  // Verify the token first by calling getMe.
  let me;
  try {
    me = await getMe(parsed.data.botToken);
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Could not validate bot token',
      field: 'botToken',
    };
  }

  // Create the channel locally first so we have a stable id for the webhook URL.
  const channel = await createChannel({
    userId: user.id,
    botId: parsed.data.botId,
    type: 'telegram',
    config: {
      botToken: parsed.data.botToken,
      groupMode: parsed.data.groupMode,
      username: me.username,
    } satisfies TelegramConfig,
    label: parsed.data.label,
    externalIdentity: me.username ? `@${me.username}` : me.first_name,
  });
  if (!channel) return { status: 'error', message: 'Bot not found' };

  // Point Telegram at our webhook. The webhookSecret goes both in the URL
  // (for routing) and in the Telegram secret_token header (for auth).
  const webhookUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/telegram/${channel.id}`;
  try {
    await setWebhook(parsed.data.botToken, webhookUrl, channel.webhookSecret);
  } catch (error) {
    await deleteChannelForUser(user.id, channel.id);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Setting Telegram webhook failed',
    };
  }

  revalidatePath(`/bots/${parsed.data.botId}/channels`);
  return { status: 'ok', message: `Connected @${me.username ?? me.first_name}. Send your bot a message to test.` };
}

// ───────────────────────── WhatsApp ─────────────────────────

const WhatsappInput = z.object({
  botId: z.string().uuid(),
  phoneNumberId: z.string().trim().regex(/^\d{10,}$/, 'Phone Number ID is the numeric value from Meta'),
  accessToken: z.string().trim().min(20, 'Access token looks too short'),
  appSecret: z.string().trim().min(20, 'App secret looks too short'),
  label: z.string().trim().max(120).optional(),
});

export async function createWhatsappChannelAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();
  const parsed = WhatsappInput.safeParse({
    botId: formData.get('botId'),
    phoneNumberId: formData.get('phoneNumberId'),
    accessToken: formData.get('accessToken'),
    appSecret: formData.get('appSecret'),
    label: formData.get('label') ?? undefined,
  });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.errors[0].message, field: parsed.error.errors[0].path[0] as string };
  }

  const verifyToken = generateWebhookSecret(); // we mint the verify token; admin pastes it into Meta dashboard
  const channel = await createChannel({
    userId: user.id,
    botId: parsed.data.botId,
    type: 'whatsapp',
    config: {
      phoneNumberId: parsed.data.phoneNumberId,
      accessToken: parsed.data.accessToken,
      verifyToken,
      appSecret: parsed.data.appSecret,
    } satisfies WhatsappConfig,
    label: parsed.data.label,
    externalIdentity: parsed.data.phoneNumberId,
  });
  if (!channel) return { status: 'error', message: 'Bot not found' };

  revalidatePath(`/bots/${parsed.data.botId}/channels`);
  return {
    status: 'ok',
    message:
      'Saved. Now configure the webhook in Meta dashboard with the URL and verify token shown on this page.',
  };
}

// ───────────────────────── Generic ─────────────────────────

const IdInput = z.object({ channelId: z.string().uuid(), botId: z.string().uuid() });

export async function toggleChannelActiveAction(input: {
  channelId: string;
  botId: string;
  isActive: boolean;
}): Promise<void> {
  const user = await requireAuth();
  const parsed = IdInput.safeParse({ channelId: input.channelId, botId: input.botId });
  if (!parsed.success) return;
  await setChannelActive(user.id, parsed.data.channelId, input.isActive);
  revalidatePath(`/bots/${parsed.data.botId}/channels`);
}

export async function deleteChannelAction(formData: FormData): Promise<void> {
  const user = await requireAuth();
  const parsed = IdInput.safeParse({
    channelId: formData.get('channelId'),
    botId: formData.get('botId'),
  });
  if (!parsed.success) return;

  // If it's a Telegram channel, also delete the webhook upstream so we
  // don't leave a dangling subscription that fails forever.
  const channel = await getChannelForUser(user.id, parsed.data.channelId);
  if (channel?.type === 'telegram') {
    const config = channel.config as unknown as TelegramConfig;
    if (config.botToken) {
      await deleteWebhook(config.botToken).catch(() => {});
    }
  }

  await deleteChannelForUser(user.id, parsed.data.channelId);
  revalidatePath(`/bots/${parsed.data.botId}/channels`);
}

