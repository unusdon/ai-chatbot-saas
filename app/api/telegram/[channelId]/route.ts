/**
 * Telegram webhook endpoint.
 *
 * One route per bot channel. Telegram POSTs Updates here whenever a user
 * messages the bot. We verify the secret header, gate on group-mode rules,
 * push the message through the shared chat pipeline, and reply via
 * sendMessage.
 *
 * Channel id is in the URL; the per-channel webhook secret is in the
 * X-Telegram-Bot-Api-Secret-Token header. Both must match before we
 * process anything.
 */
import { NextResponse } from 'next/server';

import {
  getChannelByWebhookSecret,
  updateChannelMeta,
  type TelegramConfig,
} from '@/lib/server/channels';
import { processChannelMessage } from '@/lib/server/chat-pipeline';
import { db } from '@/db';
import { bots } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  sendMessage,
  sendTyping,
  shouldRespond,
  stripMention,
  type TelegramUpdate,
} from '@/lib/server/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const { channelId } = await params;
  const headerSecret = req.headers.get('x-telegram-bot-api-secret-token');
  if (!headerSecret) return new NextResponse('Missing secret token', { status: 401 });

  const lookup = await getChannelByWebhookSecret(channelId, headerSecret);
  if (!lookup || lookup.channel.type !== 'telegram') {
    return new NextResponse('Unknown channel', { status: 404 });
  }
  const { channel } = lookup;
  const config = channel.config as unknown as TelegramConfig;

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return new NextResponse('Bad JSON', { status: 400 });
  }

  const msg = update.message;
  if (!msg?.text || !msg.chat) {
    // Non-message updates (e.g., edits, status updates) — acknowledge silently.
    return NextResponse.json({ ok: true });
  }

  const mode = config.groupMode ?? 'mention';
  if (!shouldRespond(msg, mode, config.username, undefined)) {
    return NextResponse.json({ ok: true });
  }

  // We run the chat pipeline async-but-awaited because Telegram needs a 2xx
  // ack within ~60s. With our typical latency this is fine.
  try {
    void sendTyping(config.botToken, msg.chat.id).catch(() => {});

    const bot = await db.query.bots.findFirst({ where: eq(bots.id, channel.botId) });
    if (!bot || !bot.isActive) {
      return NextResponse.json({ ok: true });
    }

    const cleanedText = stripMention(msg.text, config.username);
    if (!cleanedText) return NextResponse.json({ ok: true });

    // One conversation per (channel, chat) — every member of a group shares
    // the same thread; in private chats the chat id IS the user id.
    const endUserId = `tg:${channel.id}:${msg.chat.id}`;

    const result = await processChannelMessage({
      bot,
      endUserId,
      message: cleanedText,
      userAgent: 'Telegram',
      referrer: msg.chat.title ? `tg://${msg.chat.title}` : null,
    });

    if (!result.ok) {
      await sendMessage(config.botToken, msg.chat.id, `⚠️ ${result.error}`, {
        replyToMessageId: msg.chat.type !== 'private' ? msg.message_id : undefined,
      }).catch(() => {});
      await updateChannelMeta(channel.id, { lastError: result.error });
      return NextResponse.json({ ok: true });
    }

    await sendMessage(config.botToken, msg.chat.id, result.answer, {
      replyToMessageId: msg.chat.type !== 'private' ? msg.message_id : undefined,
    });

    await updateChannelMeta(channel.id, { lastSeenAt: new Date(), lastError: null });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateChannelMeta(channel.id, { lastError: message }).catch(() => {});
    return NextResponse.json({ ok: true });
  }
}
