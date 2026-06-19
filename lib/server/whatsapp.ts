/**
 * WhatsApp Cloud API client + webhook helpers.
 *
 * Reference: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Auth model on outbound (us → WhatsApp):
 *   - POST https://graph.facebook.com/v21.0/{phoneNumberId}/messages
 *   - Authorization: Bearer {accessToken}
 *
 * Auth model on inbound (Meta → us):
 *   - First a GET with hub.mode=subscribe + hub.verify_token + hub.challenge
 *     to validate the URL during setup. We echo the challenge if the verify
 *     token matches.
 *   - Then POSTs with X-Hub-Signature-256: sha256=HMAC(appSecret, body).
 *     We MUST verify this header on every request — the URL is public.
 *
 * Note on groups: WhatsApp Cloud API does NOT support group chats. This
 * integration is private 1-to-1 conversations only.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const API = 'https://graph.facebook.com/v21.0';

type WAResponse = { error?: { message: string; type: string; code: number } };

export type WhatsappInboundMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
};

export type WhatsappInboundValue = {
  messaging_product: 'whatsapp';
  metadata?: { display_phone_number: string; phone_number_id: string };
  contacts?: Array<{ profile?: { name?: string }; wa_id: string }>;
  messages?: WhatsappInboundMessage[];
};

export async function sendWhatsappMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string,
): Promise<void> {
  // WhatsApp caps messages at 4096 chars. Split the same way we do for Telegram.
  const chunks = splitForWhatsapp(text);
  for (const chunk of chunks) {
    const res = await fetch(`${API}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: chunk, preview_url: false },
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as WAResponse;
      throw new Error(`WhatsApp send failed: ${body.error?.message ?? res.statusText}`);
    }
  }
}

/**
 * Validate that an inbound POST is genuinely from Meta. Equality-checks the
 * sha256 HMAC of the raw body with the app secret in constant time.
 */
export function verifyWhatsappSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const expected = signatureHeader.slice('sha256='.length);
  const computed = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  if (expected.length !== computed.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(computed, 'hex'));
  } catch {
    return false;
  }
}

function splitForWhatsapp(text: string): string[] {
  const MAX = 4000;
  if (text.length <= MAX) return [text];
  const out: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    let end = Math.min(cursor + MAX, text.length);
    if (end < text.length) {
      const para = text.lastIndexOf('\n\n', end);
      const sent = text.lastIndexOf('. ', end);
      const breakAt = Math.max(para, sent);
      if (breakAt > cursor + MAX / 2) end = breakAt + 2;
    }
    out.push(text.slice(cursor, end).trim());
    cursor = end;
  }
  return out;
}
