/**
 * FAQ entries — single source of truth. The landing page renders these as
 * HTML; the FAQ JSON-LD schema mirrors them so the same questions are
 * eligible for Google's rich-result "People also ask" treatment.
 */
export type Faq = { q: string; a: string };

export const FAQS: Faq[] = [
  {
    q: 'Do I own the data and the source code?',
    a: 'Yes. The repo is MIT-licensed. You self-host the full stack — every commit is in the repo, no vendor lock-in. Your customers’ data lives in your Postgres + your S3 bucket.',
  },
  {
    q: 'What LLM does it use?',
    a: 'OpenAI by default (gpt-4o-mini for chat, text-embedding-3-small for retrieval). Anthropic is pluggable via the LLM_PROVIDER env var so you can switch without code changes.',
  },
  {
    q: 'How does retrieval work?',
    a: 'pgvector with an HNSW index on cosine distance. The chunker uses recursive separators with overlap. Top-K retrieval with a configurable similarity floor so irrelevant chunks never reach the LLM context.',
  },
  {
    q: 'Which file formats can I upload as training data?',
    a: 'PDF, DOCX (Word), XLSX (Excel — flattened to row sentences), JSON (arrays of objects walked into row chunks), Markdown, and plain text. You can also paste raw text/markdown directly, add a URL, crawl a sitemap.xml, or save Q&A pairs.',
  },
  {
    q: 'Can I host the app on Vercel?',
    a: 'Yes for the Next.js app. The ingest worker (BullMQ + OpenAI) needs a separate host (Railway, Render, Fly.io) because Vercel serverless can’t hold a long-lived BullMQ connection. See DEPLOY.md.',
  },
  {
    q: 'Is the embed widget customizable?',
    a: 'Via script-tag data-* attributes today: data-title, data-greeting, data-accent (color), data-api-base. The widget is ~3.2 KB gzipped, ships in a Shadow DOM so your site’s CSS can’t conflict with it, and works on any host page.',
  },
  {
    q: 'Are there usage limits?',
    a: 'Per-plan caps on bots, documents, storage, and monthly messages — enforced server-side at every resource-creation point. The /account/usage page shows live progress bars. Free plan: 3 bots, 25 docs, 50 MB storage, 200 messages/month.',
  },
  {
    q: 'How is multi-tenant isolation enforced?',
    a: 'Every read and write in the data layer takes a userId and joins through bot.userId. There is no admin escape hatch. Adversarial integration tests verify a second user cannot read, update, or delete the first user’s bots, documents, conversations, or chunks.',
  },
];
