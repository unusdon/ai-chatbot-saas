/**
 * Recursive character text splitter.
 *
 * Splits text into chunks of ~`chunkSize` characters with `chunkOverlap`
 * characters of overlap, trying separators in order ("\n\n" → "\n" → ". " → " ")
 * so we cut at natural boundaries when possible. Mirrors the LangChain
 * implementation closely but without the LangChain dependency.
 */
export type Chunk = { content: string; tokens: number };

const DEFAULT_SEPARATORS = ['\n\n', '\n', '. ', ' ', ''];

export type ChunkerOptions = {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
};

export function chunkText(input: string, opts: ChunkerOptions = {}): Chunk[] {
  const chunkSize = opts.chunkSize ?? 1000;
  const chunkOverlap = opts.chunkOverlap ?? 150;
  if (chunkOverlap >= chunkSize) {
    throw new Error('chunkOverlap must be less than chunkSize');
  }
  const separators = opts.separators ?? DEFAULT_SEPARATORS;

  const cleaned = input.replace(/\r\n/g, '\n').trim();
  if (!cleaned) return [];

  const splits = splitRecursively(cleaned, separators, chunkSize);
  const merged = mergeSplits(splits, chunkSize, chunkOverlap);
  return merged.map((content) => ({ content, tokens: estimateTokens(content) }));
}

function splitRecursively(text: string, separators: string[], chunkSize: number): string[] {
  if (text.length <= chunkSize) return [text];

  const [sep, ...rest] = separators;
  if (sep === undefined) return [text];

  const pieces = sep === '' ? text.split('') : text.split(sep);
  const result: string[] = [];
  for (const piece of pieces) {
    const fragment = sep && piece ? `${piece}${sep}` : piece;
    if (fragment.length === 0) continue;
    if (fragment.length <= chunkSize) {
      result.push(fragment);
    } else {
      result.push(...splitRecursively(fragment, rest, chunkSize));
    }
  }
  return result;
}

function mergeSplits(splits: string[], chunkSize: number, chunkOverlap: number): string[] {
  const out: string[] = [];
  let current: string[] = [];
  let currentLen = 0;

  for (const piece of splits) {
    if (currentLen + piece.length > chunkSize && current.length > 0) {
      out.push(current.join('').trim());
      // Slide the window: carry the trailing `chunkOverlap` characters into
      // the next chunk so we don't break mid-sentence context.
      while (currentLen > chunkOverlap && current.length > 0) {
        const dropped = current.shift()!;
        currentLen -= dropped.length;
      }
    }
    current.push(piece);
    currentLen += piece.length;
  }
  if (current.length > 0) {
    const tail = current.join('').trim();
    if (tail) out.push(tail);
  }
  return out;
}

/**
 * Rough token estimate. OpenAI charges by tokens; we keep a per-chunk count so
 * we can budget batching against the 8192-token-per-input limit without
 * pulling in tiktoken (which is a hefty native dep).
 *
 * The 4-chars-per-token heuristic is what OpenAI itself recommends for English
 * prose; it underestimates code and CJK text but is good enough for budgeting.
 */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
