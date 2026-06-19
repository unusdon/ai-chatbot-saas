/**
 * FAQ entries — single source of truth. The landing page renders these as
 * HTML; the FAQ JSON-LD schema mirrors them so the same questions are
 * eligible for Google's rich-result "People also ask" treatment.
 */
export type Faq = { q: string; a: string };

export const FAQS: Faq[] = [
  {
    q: 'Which LLM providers does it support?',
    a: 'Five chat providers, all swappable via one env var: OpenAI (gpt-4o-mini), Anthropic Claude (claude-3-5-haiku), Google Gemini (1.5-flash), Deepseek, and Ollama for fully local self-hosted (llama3.2 + nomic-embed-text). Set CHAT_PROVIDER and EMBEDDING_PROVIDER independently — for example Ollama chat with OpenAI embeddings.',
  },
  {
    q: 'Which file formats can I upload as training data?',
    a: 'PDF, DOCX (Word), XLSX (Excel — each row flattened to a sentence), JSON (arrays of objects walked into row chunks, nested objects flattened), Markdown, plain text, URLs, sitemap.xml (auto-crawl up to 200 pages), and manual Q&A pairs (the question is what gets embedded for retrieval).',
  },
  {
    q: 'Do I own the data and the source code?',
    a: 'Yes. The repo is MIT-licensed. You self-host the full stack — every commit is in the repo, no vendor lock-in. Your customers’ data lives in your Postgres + your S3 bucket.',
  },
  {
    q: 'How does retrieval work?',
    a: 'pgvector with an HNSW index on cosine distance. The chunker uses recursive separators with overlap (~1000-char chunks, 150-char overlap). Top-K retrieval with a configurable similarity floor so irrelevant chunks never reach the LLM context.',
  },
  {
    q: 'Can I manage the customer chat sessions?',
    a: 'Yes — every customer conversation is admin-manageable: full transcript with citations, token counts, and latency per message; metadata including IP, browser, referrer, duration; search across message content; filter by date range and flag (review/star/abuse/spam); bulk delete; archive; JSON export per conversation. Live stats: active-24h, active-7d, unique end-users, avg messages per session.',
  },
  {
    q: 'Can I see who is signed into my admin account?',
    a: 'Yes. /account/sessions lists every device you are signed in on with browser, OS, IP, and last-active time. Revoke any session you don’t recognise or sign-out-everywhere-else in one click. Changing your password automatically revokes every other session.',
  },
  {
    q: 'Can I host the app on Vercel?',
    a: 'Yes for the Next.js app. The ingest worker (BullMQ + provider embeddings) needs a separate host (Railway, Render, Fly.io) because Vercel serverless can’t hold a long-lived BullMQ connection. Full deploy guide in DEPLOY.md.',
  },
  {
    q: 'Is the embed widget customizable?',
    a: 'Via script-tag data-* attributes today: data-title, data-greeting, data-accent (color), data-api-base. The widget is ~3.2 KB gzipped, ships in a Shadow DOM so your site’s CSS can’t conflict with it, sets a stable end-user cookie per bot so conversations persist, and works on any host page.',
  },
  {
    q: 'Are there usage limits?',
    a: 'Per-plan caps on bots, documents, storage, and monthly messages — enforced server-side at every resource-creation point. The /account/usage page shows live progress bars + Stripe-backed Upgrade buttons. Free plan: 3 bots, 25 docs, 50 MB storage, 200 messages/month.',
  },
  {
    q: 'How is multi-tenant isolation enforced?',
    a: 'Every read and write in the data layer takes a userId and joins through bot.userId. There is no admin escape hatch. Adversarial integration tests verify a second user cannot read, update, or delete the first user’s bots, documents, conversations, or chunks.',
  },
];
