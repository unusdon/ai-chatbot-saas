/**
 * WhatsApp Cloud API webhook endpoint.
 *
 *   GET  → URL verification step (echo hub.challenge if verify token matches)
 *   POST → inbound messages. Signature-verified via X-Hub-Signature-256.
 *
 * Channel id is in the URL — used to look up which bot the message routes
 * to. The verify token + app secret live in the channel's config blob.
 */
import { NextResponse } from 'next/server';

import {
  getChannelByWebhookSecret,
  updateChannelMeta,
  type WhatsappConfig,
} from '@/lib/server/channels';
import { processChannelMessage } from '@/lib/server/chat-pipeline';
import { db } from '@/db';
import { bots, botChannels } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import {
  sendWhatsappMessage,
  verifyWhatsappSignature,
  type WhatsappInboundValue,
} from '@/lib/server/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One-time URL verification when the admin saves the webhook in Meta's
 * dashboard. Meta calls our URL with hub.mode=subscribe + verify_token +
 * challenge; we echo the challenge if the verify token matches the one
 * stored on the channel.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const { channelId } = await params;
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  if (mode !== 'subscribe' || !token || !challenge) {
    return new NextResponse('Bad verification request', { status: 400 });
  }

  // The verify step has no signature header — instead we look the channel
  // up by id and check the verify token directly.
  const row = await db.query.botChannels.findFirst({
    where: and(eq(botChannels.id, channelId), eq(botChannels.type, 'whatsapp')),
  });
  if (!row) return new NextResponse('Unknown channel', { status: 404 });
  const config = row.config as unknown as WhatsappConfig;
  if (config.verifyToken !== token) {
    return new NextResponse('Bad verify token', { status: 403 });
  }
  return new NextResponse(challenge, { status: 200 });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const { channelId } = await params;

  // Read the raw body first — signature is over the exact bytes Meta sent.
  const raw = await req.text();
  const signature = req.headers.get('x-hub-signature-256');

  const row = await db.query.botChannels.findFirst({
    where: and(eq(botChannels.id, channelId), eq(botChannels.type, 'whatsapp'), eq(botChannels.isActive, true)),
  });
  if (!row) return new NextResponse('Unknown channel', { status: 404 });
  const config = row.config as unknown as WhatsappConfig;

  if (!verifyWhatsappSignature(raw, signature, config.appSecret)) {
    return new NextResponse('Bad signature', { status: 401 });
  }

  let body: { entry?: Array<{ changes?: Array<{ value: WhatsappInboundValue }> }> };
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse('Bad JSON', { status: 400 });
  }

  // WhatsApp updates are deeply nested. Walk to find message arrays.
  const messages: Array<{
    value: WhatsappInboundValue;
    message: NonNullable<WhatsappInboundValue['messages']>[number];
  }> = [];
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const m of change.value.messages ?? []) {
        messages.push({ value: change.value, message: m });
      }
    }
  }

  if (messages.length === 0) {
    // Status callbacks etc — ack and move on.
    return new NextResponse(null, { status: 200 });
  }

  const bot = await db.query.bots.findFirst({ where: eq(bots.id, row.botId) });
  if (!bot || !bot.isActive) {
    return new NextResponse(null, { status: 200 });
  }

  for (const { value, message } of messages) {
    if (message.type !== 'text' || !message.text?.body) continue;
    try {
      const endUserId = `wa:${row.id}:${message.from}`;
      const result = await processChannelMessage({
        bot,
        endUserId,
        message: message.text.body,
        userAgent: 'WhatsApp',
        referrer: value.metadata?.display_phone_number ?? null,
      });
      if (!result.ok) {
        await sendWhatsappMessage(
          config.phoneNumberId,
          config.accessToken,
          message.from,
          `⚠️ ${result.error}`,
        ).catch(() => {});
        await updateChannelMeta(row.id, { lastError: result.error });
        continue;
      }
      await sendWhatsappMessage(
        config.phoneNumberId,
        config.accessToken,
        message.from,
        result.answer,
      );
      await updateChannelMeta(row.id, { lastSeenAt: new Date(), lastError: null });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await updateChannelMeta(row.id, { lastError: msg }).catch(() => {});
    }
  }

  return new NextResponse(null, { status: 200 });
}
