/**
 * Shared chat pipeline used by every channel (web widget, Telegram,
 * WhatsApp). Takes a bot + an end-user message and returns the full answer
 * + citations + the assistant message row that got persisted.
 *
 * Why the pipeline is shared: the only thing that differs per channel is
 * the I/O (HTTP stream for the widget, sendMessage POST for Telegram, etc.).
 * Retrieval, prompt assembly, history loading, rate-limit accounting, and
 * conversation persistence are identical.
 */
import {
  appendAssistantMessage,
  appendUserMessage,
  getOrCreateWidgetConversation,
  listMessages,
} from '@/lib/server/conversations';
import { ragChat, type ChatTurn } from '@/lib/server/chat';
import { QuotaExceededError, assertCanSendMessage } from '@/lib/server/plans';
import type { Bot, Conversation } from '@/db/schema';

const MAX_HISTORY_TURNS = 10;

export type ChannelMessageInput = {
  bot: Bot;
  endUserId: string;
  message: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
};

export type ChannelMessageResult =
  | {
      ok: true;
      conversation: Conversation;
      answer: string;
      citations: Array<{ chunkId: string; score: number; documentTitle?: string; sourceUrl?: string | null }>;
      latencyMs: number;
    }
  | {
      ok: false;
      error: string;
      kind: 'quota' | 'backend' | 'invalid';
    };

export async function processChannelMessage(
  input: ChannelMessageInput,
): Promise<ChannelMessageResult> {
  // Owner-quota gate (each channel message counts against the bot owner's
  // monthly cap, since they're the one paying for the LLM tokens).
  try {
    await assertCanSendMessage(input.bot.userId);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return {
        ok: false,
        error: 'Monthly message limit reached. Please try again next month.',
        kind: 'quota',
      };
    }
    throw error;
  }

  const conversation = await getOrCreateWidgetConversation({
    botId: input.bot.id,
    endUserId: input.endUserId,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    referrer: input.referrer ?? null,
  });

  const prior = await listMessages(conversation.id);
  const history: ChatTurn[] = prior
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  await appendUserMessage(conversation.id, input.message);

  const start = Date.now();
  let result: Awaited<ReturnType<typeof ragChat>>;
  try {
    result = await ragChat({
      userId: input.bot.userId,
      botId: input.bot.id,
      systemPrompt: input.bot.systemPrompt,
      message: input.message,
      history,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Chat backend unavailable',
      kind: 'backend',
    };
  }

  let assembled = '';
  for await (const piece of result.stream) {
    assembled += piece;
  }
  const latencyMs = Date.now() - start;

  await appendAssistantMessage({
    conversationId: conversation.id,
    content: assembled,
    citations: result.citations.map((c) => ({ chunkId: c.chunkId, score: c.score })),
    latencyMs,
  });

  return {
    ok: true,
    conversation,
    answer: assembled,
    citations: result.citations,
    latencyMs,
  };
}
