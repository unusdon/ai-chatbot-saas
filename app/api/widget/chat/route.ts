/**
 * Public widget chat endpoint.
 *
 * Auth model: a bot's `publicKey` is the only credential. We assume it leaks
 * to anyone visiting an embedding site, so we lean on:
 *   - rate limits per publicKey + per IP (Redis-backed)
 *   - the bot owner can rotate the key from the dashboard
 *   - rate limits failing open during a Redis outage are an explicit choice
 *     (chat down >> chat unmetered for an outage window)
 *
 * Streaming format mirrors the dashboard chat endpoint so the widget bundle
 * and the dashboard playground can share SSE parsing.
 */
import { z } from 'zod';

import {
  appendAssistantMessage,
  appendUserMessage,
  listMessages,
} from '@/lib/server/conversations';
import { ragChat, type ChatTurn } from '@/lib/server/chat';
import { QuotaExceededError, assertCanSendMessage } from '@/lib/server/plans';
import { rateLimit } from '@/lib/server/rate-limit';
import { getOrCreateWidgetConversation } from '@/lib/server/conversations';
import {
  END_USER_COOKIE_PREFIX,
  findBotByPublicKey,
  generateEndUserId,
} from '@/lib/server/widget';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_HISTORY_TURNS = 10;
const PER_KEY_LIMIT = { windowSeconds: 60, max: 30 };
const PER_IP_LIMIT = { windowSeconds: 60, max: 20 };

const Input = z.object({
  bot_key: z.string().regex(/^bot_[A-Za-z0-9_-]{32}$/),
  message: z.string().trim().min(1).max(2000),
  end_user_id: z.string().optional(),
});

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
} as const;

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  let body: z.infer<typeof Input>;
  try {
    body = Input.parse(await req.json());
  } catch (error) {
    const message = error instanceof z.ZodError ? error.errors[0].message : 'Invalid request';
    return json({ error: message }, 400);
  }

  const bot = await findBotByPublicKey(body.bot_key);
  if (!bot) return json({ error: 'Invalid bot key' }, 404);

  // The bot owner's plan caps usage even when end-users drive it via the
  // widget — they're the customer being metered, not the visitor.
  try {
    await assertCanSendMessage(bot.userId);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return json({ error: 'This chat is temporarily unavailable. Please try again later.' }, 503);
    }
    throw error;
  }

  const ip = clientIp(req);
  const [keyLimit, ipLimit] = await Promise.all([
    rateLimit(`widget:key:${body.bot_key}`, PER_KEY_LIMIT),
    rateLimit(`widget:ip:${ip}`, PER_IP_LIMIT),
  ]);
  if (!keyLimit.allowed || !ipLimit.allowed) {
    const resetAt = Math.max(keyLimit.resetAt, ipLimit.resetAt);
    return json(
      { error: 'Rate limit exceeded', resetAt },
      429,
      {
        'retry-after': String(Math.max(1, resetAt - Math.floor(Date.now() / 1000))),
      },
    );
  }

  // Per-bot stable end-user id. The widget bundle reads it from a cookie and
  // echoes it back; on first message it'll be absent and we mint one.
  const cookieName = `${END_USER_COOKIE_PREFIX}${bot.id}`;
  const cookieValue = readCookie(req, cookieName) ?? body.end_user_id;
  const endUserId = cookieValue ?? generateEndUserId();
  const setCookie = cookieValue
    ? undefined
    : `${cookieName}=${endUserId}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=None; Secure`;

  const conversation = await getOrCreateWidgetConversation({
    botId: bot.id,
    endUserId,
    ipAddress: ip === 'unknown' ? null : ip,
    userAgent: req.headers.get('user-agent'),
    referrer: req.headers.get('referer'),
  });
  const prior = await listMessages(conversation.id);
  const history: ChatTurn[] = prior
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  await appendUserMessage(conversation.id, body.message);

  const start = Date.now();
  let ragResult: Awaited<ReturnType<typeof ragChat>>;
  try {
    ragResult = await ragChat({
      userId: bot.userId,
      botId: bot.id,
      systemPrompt: bot.systemPrompt,
      message: body.message,
      history,
    });
  } catch (error) {
    // Anything thrown synchronously by ragChat (e.g., OPENAI_API_KEY missing)
    // turns into a JSON error so the widget can surface it instead of "HTTP 500".
    const message = error instanceof Error ? error.message : 'Chat backend unavailable';
    return json({ error: message }, 503);
  }
  const { stream, citations } = ragResult;

  const encoder = new TextEncoder();
  let assembled = '';

  const sse = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const piece of stream) {
          assembled += piece;
          controller.enqueue(encoder.encode(sseEvent({ type: 'token', token: piece })));
        }
        const latencyMs = Date.now() - start;
        await appendAssistantMessage({
          conversationId: conversation.id,
          content: assembled,
          citations: citations.map((c) => ({ chunkId: c.chunkId, score: c.score })),
          latencyMs,
        });
        controller.enqueue(encoder.encode(sseEvent({ type: 'citations', citations })));
        controller.enqueue(encoder.encode(sseEvent({ type: 'done', latencyMs })));
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Chat failed';
        controller.enqueue(encoder.encode(sseEvent({ type: 'error', message })));
        controller.close();
      }
    },
  });

  const headers: Record<string, string> = {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    ...CORS,
  };
  if (setCookie) headers['set-cookie'] = setCookie;
  return new Response(sse, { headers });
}

function json(payload: unknown, status: number, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json', ...CORS, ...extra },
  });
}

function sseEvent(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return undefined;
}
