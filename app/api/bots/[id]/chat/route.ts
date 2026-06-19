/**
 * Dashboard chat endpoint.
 *
 * Accepts `{ message: string }`, retrieves context, streams the assistant
 * answer back to the client as Server-Sent Events. The final event is
 * `{ type: 'citations', citations: [...] }` so the client can render footnotes
 * after the answer arrives. Both turns are persisted on the rolling
 * (user, bot) conversation.
 */
import { z } from 'zod';

import { getBotForUser } from '@/lib/server/bots';
import {
  appendAssistantMessage,
  appendUserMessage,
  getOrCreateDashboardConversation,
  listMessages,
} from '@/lib/server/conversations';
import { ragChat, type ChatTurn } from '@/lib/server/chat';
import {
  QuotaExceededError,
  assertCanSendMessage,
  getPlan,
  limitsFor,
} from '@/lib/server/plans';
import { requireAuth } from '@/lib/server/require-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_HISTORY_TURNS = 12;

const Input = z.object({
  message: z.string().trim().min(1, 'Message is required').max(4000),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id: botId } = await params;

  const bot = await getBotForUser(user.id, botId);
  if (!bot) {
    return new Response(JSON.stringify({ error: 'Bot not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  let body: { message: string };
  try {
    const parsed = Input.parse(await req.json());
    body = parsed;
  } catch (error) {
    const message = error instanceof z.ZodError ? error.errors[0].message : 'Invalid request body';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    await assertCanSendMessage(user.id);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      const plan = await getPlan(user.id);
      return new Response(
        JSON.stringify({
          error: `Monthly message limit reached (${limitsFor(plan).messagesPerMonth} on the ${plan} plan).`,
        }),
        { status: 402, headers: { 'content-type': 'application/json' } },
      );
    }
    throw error;
  }

  const conversation = await getOrCreateDashboardConversation(user.id, bot.id);
  const prior = await listMessages(conversation.id);
  const history: ChatTurn[] = prior
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  await appendUserMessage(conversation.id, body.message);

  const start = Date.now();
  const { stream, citations } = await ragChat({
    userId: user.id,
    botId: bot.id,
    systemPrompt: bot.systemPrompt,
    message: body.message,
    history,
  });

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

  return new Response(sse, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}

function sseEvent(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}
