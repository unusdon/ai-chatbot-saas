/**
 * Telegram Bot API client.
 *
 * Only the methods we actually use: getMe (verify the token + cache the
 * @username), setWebhook (point Telegram at our endpoint), deleteWebhook,
 * and sendMessage (the response leg). All call api.telegram.org/bot{token}.
 *
 * Telegram is OPEN to any HTTP client; no SDK needed. Errors come back in
 * the response body as { ok: false, description, error_code }.
 */
const API = 'https://api.telegram.org';

type TGResponse<T> = { ok: true; result: T } | { ok: false; description: string; error_code?: number };

async function call<T>(token: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as TGResponse<T>;
  if (!data.ok) throw new Error(`Telegram ${method} failed: ${data.description}`);
  return data.result;
}

export type TelegramUser = {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
};

export type TelegramChat = {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
};

export type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  reply_to_message?: TelegramMessage;
  entities?: Array<{ type: string; offset: number; length: number }>;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

export async function getMe(token: string): Promise<TelegramUser> {
  return call<TelegramUser>(token, 'getMe');
}

export async function setWebhook(
  token: string,
  url: string,
  secretToken: string,
): Promise<boolean> {
  // `secret_token` is sent back in the X-Telegram-Bot-Api-Secret-Token header
  // on every webhook call. We verify it inbound to reject spoofed requests.
  return call<boolean>(token, 'setWebhook', {
    url,
    secret_token: secretToken,
    allowed_updates: ['message'],
    drop_pending_updates: true,
  });
}

export async function deleteWebhook(token: string): Promise<boolean> {
  return call<boolean>(token, 'deleteWebhook', { drop_pending_updates: false });
}

export async function sendMessage(
  token: string,
  chatId: number,
  text: string,
  opts: { replyToMessageId?: number; parseMode?: 'Markdown' | 'HTML' } = {},
): Promise<TelegramMessage> {
  // Telegram caps a message at 4096 characters. We split + send sequential
  // chunks so long answers still land.
  const chunks = splitForTelegram(text);
  let last: TelegramMessage | null = null;
  for (let i = 0; i < chunks.length; i++) {
    last = await call<TelegramMessage>(token, 'sendMessage', {
      chat_id: chatId,
      text: chunks[i],
      parse_mode: opts.parseMode,
      reply_to_message_id: i === 0 ? opts.replyToMessageId : undefined,
      disable_web_page_preview: true,
    });
  }
  return last!;
}

export async function sendTyping(token: string, chatId: number): Promise<void> {
  await call(token, 'sendChatAction', { chat_id: chatId, action: 'typing' });
}

function splitForTelegram(text: string): string[] {
  const MAX = 4000;
  if (text.length <= MAX) return [text];
  const out: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    let end = Math.min(cursor + MAX, text.length);
    // Try to break on a paragraph or sentence boundary.
    if (end < text.length) {
      const para = text.lastIndexOf('\n\n', end);
      const sent = text.lastIndexOf('. ', end);
      const breakAt = Math.max(para, sent);
      if (breakAt > cursor + MAX / 2) end = breakAt + (breakAt === para ? 2 : 2);
    }
    out.push(text.slice(cursor, end).trim());
    cursor = end;
  }
  return out;
}

/**
 * Group-mode gate: should we respond to this message?
 *   - private chat → always yes
 *   - 'all' mode → yes regardless
 *   - 'mention' mode → only if our @username appears via a mention entity
 *   - 'reply' mode → only if message replies to a message from our bot
 */
export function shouldRespond(
  message: TelegramMessage,
  mode: 'all' | 'mention' | 'reply',
  botUsername: string | undefined,
  botUserId: number | undefined,
): boolean {
  if (message.chat.type === 'private') return true;
  if (mode === 'all') return true;
  if (mode === 'mention') {
    if (!botUsername || !message.text) return false;
    const mentionTag = `@${botUsername.toLowerCase()}`;
    return message.text.toLowerCase().includes(mentionTag);
  }
  if (mode === 'reply') {
    return Boolean(
      message.reply_to_message?.from?.is_bot &&
        (!botUserId || message.reply_to_message.from.id === botUserId),
    );
  }
  return false;
}

/**
 * Strip the leading @botname mention out of a message before sending it to
 * the LLM — the model shouldn't try to address itself.
 */
export function stripMention(text: string, botUsername: string | undefined): string {
  if (!botUsername) return text;
  const tag = `@${botUsername}`;
  const re = new RegExp(`(?:^|\\s)${tag.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'gi');
  return text.replace(re, '').trim();
}
