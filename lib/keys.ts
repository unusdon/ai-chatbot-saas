import { randomBytes } from 'node:crypto';

/**
 * Generates a URL-safe random key for embedding into the public widget snippet.
 *
 * We use `base64url` so the value is safe to drop into URLs and HTML
 * attributes without escaping. 32 bytes of entropy → 256 bits, far beyond any
 * brute-force attack against the chat API.
 */
export function generatePublicKey(prefix = 'bot'): string {
  return `${prefix}_${randomBytes(24).toString('base64url')}`;
}
