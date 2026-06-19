/**
 * Source extraction.
 *
 * Every supported source type produces a plain-text `Extracted` payload that
 * the chunker can split + the embedder can vectorize. The extractor is
 * swappable via `_setExtractor()` for tests, so the ingest pipeline can be
 * exercised without real PDFs / network / Office files.
 *
 * Supported types:
 *   - pdf       → pdf-parse
 *   - url       → fetch + Readability (article text only)
 *   - text      → identity (already plain text)
 *   - markdown  → identity (chunker handles MD-friendly separators)
 *   - docx      → mammoth (raw text)
 *   - xlsx      → row-flatten ("Header: value, …" per row)
 *   - json      → walk + flatten (arrays of objects become row chunks)
 *   - qa        → handled directly by the ingest pipeline (no extractor)
 *   - sitemap   → not an extractor; the URL importer parses XML directly
 */
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const URL_FETCH_TIMEOUT_MS = 30_000;
const URL_MAX_BYTES = 5 * 1024 * 1024;

export type Extracted = { text: string; title?: string };

export interface Extractor {
  fromPdf(buffer: Buffer): Promise<Extracted>;
  fromUrl(url: string): Promise<Extracted>;
  fromText(content: string): Promise<Extracted>;
  fromMarkdown(content: string): Promise<Extracted>;
  fromDocx(buffer: Buffer): Promise<Extracted>;
  fromXlsx(buffer: Buffer): Promise<Extracted>;
  fromJson(content: string): Promise<Extracted>;
}

const defaultExtractor: Extractor = {
  async fromPdf(buffer: Buffer): Promise<Extracted> {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    const text = collapseWhitespace(data.text);
    if (!text) throw new Error('PDF contained no extractable text (it may be image-only)');
    return { text, title: data.info?.Title ? String(data.info.Title) : undefined };
  },

  async fromUrl(url: string): Promise<Extracted> {
    return extractFromUrlImpl(url);
  },

  async fromText(content: string): Promise<Extracted> {
    const text = collapseWhitespace(content);
    if (!text) throw new Error('Text source is empty');
    return { text };
  },

  async fromMarkdown(content: string): Promise<Extracted> {
    // Markdown is already chunker-friendly (the recursive separator list
    // splits on \n\n, \n, ". ", " " — which matches MD paragraph breaks).
    const text = collapseWhitespace(content);
    if (!text) throw new Error('Markdown source is empty');
    return { text };
  },

  async fromDocx(buffer: Buffer): Promise<Extracted> {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    const text = collapseWhitespace(result.value);
    if (!text) throw new Error('DOCX contained no extractable text');
    return { text };
  },

  async fromXlsx(buffer: Buffer): Promise<Extracted> {
    // Each row becomes a sentence: "Header A: value, Header B: value …".
    // This is the standard pattern for RAG over tabular data — keeps the
    // semantic meaning of each row while letting the chunker treat them
    // as separable paragraphs.
    const XLSX = await import('xlsx');
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const lines: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
        raw: false,
      });
      if (rows.length === 0) continue;
      lines.push(`### Sheet: ${sheetName}`);
      for (const row of rows) {
        const parts: string[] = [];
        for (const [key, value] of Object.entries(row)) {
          if (value === '' || value == null) continue;
          parts.push(`${key}: ${String(value)}`);
        }
        if (parts.length > 0) lines.push(parts.join(' · '));
      }
      lines.push('');
    }
    const text = collapseWhitespace(lines.join('\n'));
    if (!text) throw new Error('XLSX file contained no rows');
    return { text };
  },

  async fromJson(content: string): Promise<Extracted> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    const text = collapseWhitespace(flattenJson(parsed).join('\n'));
    if (!text) throw new Error('JSON produced no extractable text');
    return { text };
  },
};

let extractor: Extractor = defaultExtractor;

export function _setExtractor(impl: Partial<Extractor> | null) {
  if (!impl) {
    extractor = defaultExtractor;
    return;
  }
  extractor = { ...defaultExtractor, ...impl };
}

export async function extractFromPdf(buffer: Buffer): Promise<Extracted> {
  return extractor.fromPdf(buffer);
}
export async function extractFromUrl(url: string): Promise<Extracted> {
  return extractor.fromUrl(url);
}
export async function extractFromText(content: string): Promise<Extracted> {
  return extractor.fromText(content);
}
export async function extractFromMarkdown(content: string): Promise<Extracted> {
  return extractor.fromMarkdown(content);
}
export async function extractFromDocx(buffer: Buffer): Promise<Extracted> {
  return extractor.fromDocx(buffer);
}
export async function extractFromXlsx(buffer: Buffer): Promise<Extracted> {
  return extractor.fromXlsx(buffer);
}
export async function extractFromJson(content: string): Promise<Extracted> {
  return extractor.fromJson(content);
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
        'user-agent': 'AIChatbotSaaS/1.0 (+https://github.com/unusdon/ai-chatbot-saas)',
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
  // Try Readability first — it strips nav, footer, ads, sidebars.
  const article = new Readability(dom.window.document.cloneNode(true) as Document).parse();
  let text = article?.textContent ? collapseWhitespace(article.textContent) : '';
  let title = article?.title ?? undefined;

  // Fallback: Readability often returns null on landing pages, listings, or
  // pages without a clear article body. Grab the <body> text directly,
  // dropping noisy elements first.
  if (!text || text.length < 200) {
    const body = dom.window.document.body;
    body.querySelectorAll('script, style, nav, header, footer, aside, noscript, svg, iframe').forEach((el) => el.remove());
    text = collapseWhitespace(body.textContent ?? '');
    if (!title) title = dom.window.document.title || undefined;
  }

  if (!text) throw new Error('Page contained no extractable text');
  return { text, title };
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
  return s.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Walk a JSON value and emit one line per leaf path so chunking works on
 * structured data. Arrays of objects → one row per element. Primitive values
 * get inlined.
 */
function flattenJson(value: unknown, path: string[] = []): string[] {
  const out: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      const childPath = [...path, `[${i}]`];
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        // Row representation: "key: value · key: value"
        const parts = Object.entries(item as Record<string, unknown>)
          .filter(([, v]) => v != null && v !== '')
          .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
        if (parts.length > 0) out.push(parts.join(' · '));
      } else {
        out.push(...flattenJson(item, childPath));
      }
    });
  } else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (v !== null && typeof v === 'object') {
        out.push(...flattenJson(v, [...path, k]));
      } else if (v !== null && v !== '') {
        out.push(`${[...path, k].join('.')}: ${String(v)}`);
      }
    }
  } else if (value !== null && value !== '') {
    out.push(String(value));
  }
  return out;
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

/**
 * Parses a sitemap.xml and returns the list of contained URLs. Supports both
 * regular sitemaps (<urlset><url><loc>) and sitemap indexes (<sitemapindex>).
 * For sitemap indexes it recurses once.
 */
export async function fetchSitemapUrls(sitemapUrl: string, opts: { maxUrls?: number } = {}): Promise<string[]> {
  assertSafeUrl(sitemapUrl);
  const maxUrls = opts.maxUrls ?? 200;
  const { XMLParser } = await import('fast-xml-parser');
  const parser = new XMLParser({ ignoreAttributes: true });

  async function fetchXml(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'user-agent': 'AIChatbotSaaS/1.0', accept: 'application/xml,text/xml' },
      });
      if (!res.ok) throw new Error(`Sitemap fetch failed: HTTP ${res.status}`);
      if (res.redirected) assertSafeUrl(res.url);
      return await readBoundedText(res, URL_MAX_BYTES);
    } finally {
      clearTimeout(timeout);
    }
  }

  const seen = new Set<string>();
  const collected: string[] = [];
  const queue: string[] = [sitemapUrl];
  // Bound the recursion: at most 5 sitemap files traversed (sitemap index
  // pointing to up to 5 child sitemaps).
  let sitemapsTraversed = 0;
  while (queue.length > 0 && sitemapsTraversed < 5 && collected.length < maxUrls) {
    const next = queue.shift()!;
    if (seen.has(next)) continue;
    seen.add(next);
    sitemapsTraversed++;
    const xml = await fetchXml(next);
    const parsed = parser.parse(xml);
    const urlset = parsed.urlset?.url;
    const sitemapIndex = parsed.sitemapindex?.sitemap;
    if (Array.isArray(urlset) || urlset) {
      const arr = Array.isArray(urlset) ? urlset : [urlset];
      for (const u of arr) {
        const loc = typeof u === 'string' ? u : u.loc;
        if (typeof loc === 'string' && collected.length < maxUrls) {
          try {
            assertSafeUrl(loc);
            collected.push(loc);
          } catch {
            // skip unsafe URLs
          }
        }
      }
    }
    if (Array.isArray(sitemapIndex) || sitemapIndex) {
      const arr = Array.isArray(sitemapIndex) ? sitemapIndex : [sitemapIndex];
      for (const s of arr) {
        const loc = typeof s === 'string' ? s : s.loc;
        if (typeof loc === 'string') queue.push(loc);
      }
    }
  }
  return collected;
}
