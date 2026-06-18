/**
 * Source extraction.
 *
 *   - PDF → text via `pdf-parse` (handles text-based PDFs; scanned PDFs would
 *     need OCR, which we punt to M4).
 *   - URL → fetch HTML, parse with jsdom, feed to @mozilla/readability to get
 *     just the article body, then strip remaining HTML tags.
 *
 * Both paths run inside the worker (Node runtime). The URL fetcher applies a
 * second-layer SSRF defense: we resolve the URL and refuse loopback/private
 * targets even if the action-layer SSRF guard somehow let it through.
 *
 * The extractor is swappable via `_setExtractor()` for tests, mirroring the
 * embeddings client design — that way the ingest pipeline integration test
 * doesn't depend on synthesizing a byte-perfect PDF.
 */
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const URL_FETCH_TIMEOUT_MS = 30_000;
const URL_MAX_BYTES = 5 * 1024 * 1024;

export type Extracted = { text: string; title?: string };

export interface Extractor {
  fromPdf(buffer: Buffer): Promise<Extracted>;
  fromUrl(url: string): Promise<Extracted>;
}

const defaultExtractor: Extractor = {
  async fromPdf(buffer: Buffer): Promise<Extracted> {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    const text = data.text.replace(/ /g, '').trim();
    if (!text) throw new Error('PDF contained no extractable text (it may be image-only)');
    return { text, title: data.info?.Title ? String(data.info.Title) : undefined };
  },
  async fromUrl(url: string): Promise<Extracted> {
    return extractFromUrlImpl(url);
  },
};

let extractor: Extractor = defaultExtractor;

export function _setExtractor(impl: Extractor | null) {
  extractor = impl ?? defaultExtractor;
}

export async function extractFromPdf(buffer: Buffer): Promise<Extracted> {
  return extractor.fromPdf(buffer);
}

export async function extractFromUrl(url: string): Promise<Extracted> {
  return extractor.fromUrl(url);
}

async function extractFromUrlImpl(url: string): Promise<Extracted> {
  assertSafeUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);
  let html: string;
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'AIChatbotSaaS/1.0 (+https://github.com/cyberunite/ai-chatbot-saas)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);
    if (res.redirected) assertSafeUrl(res.url);
    const contentType = res.headers.get('content-type') ?? '';
    if (!/text\/html|application\/xhtml/i.test(contentType)) {
      throw new Error(`Unsupported content-type: ${contentType || '(unknown)'} — only HTML pages are supported`);
    }
    html = await readBoundedText(res, URL_MAX_BYTES);
  } finally {
    clearTimeout(timeout);
  }

  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();
  if (!article?.textContent) {
    throw new Error('Could not extract readable content from the URL');
  }
  const text = collapseWhitespace(article.textContent);
  if (!text) throw new Error('Extracted content was empty');
  return { text, title: article.title ?? undefined };
}

async function readBoundedText(res: Response, limit: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return res.text();
  let received = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > limit) {
      await reader.cancel();
      throw new Error(`Response exceeds ${limit / (1024 * 1024)} MB limit`);
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(merged);
}

function collapseWhitespace(s: string): string {
  return s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function assertSafeUrl(raw: string): void {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error('Invalid URL');
  }
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Only http(s) URLs are allowed');
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
    throw new Error('Loopback hosts are not allowed');
  }
  if (host.endsWith('.localhost') || host.endsWith('.local')) {
    throw new Error('mDNS / localhost-suffix hosts are not allowed');
  }
  if (
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    throw new Error('Private IP ranges are not allowed');
  }
}
