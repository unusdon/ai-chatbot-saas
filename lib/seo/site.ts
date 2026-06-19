/**
 * Site-wide SEO constants. Single source of truth for the brand, URL, social
 * handles, and the keyword list every page draws from.
 */
import { env } from '@/lib/env';

export const SITE = {
  name: 'AI Chatbot SaaS',
  shortName: 'Chatbot SaaS',
  tagline: 'Train an AI on your content. Embed anywhere.',
  description:
    'Open-source multi-tenant RAG chatbot platform. Upload PDFs, DOCX, XLSX, JSON, Markdown, URLs, sitemaps, or Q&A pairs. Pick any LLM: OpenAI, Anthropic Claude, Google Gemini, Deepseek, or fully local Ollama. Deploy across channels: embeddable Shadow-DOM widget, Telegram (private + groups), and WhatsApp Cloud API — all with citations, streaming, conversation management, and per-tenant isolation.',
  url: env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ''),
  locale: 'en_US',
  twitter: '@cyberunite',
  author: {
    name: 'Cyberunite',
    url: 'https://cyberunite.com',
    email: 'info@cyberunite.com',
  },
  github: 'https://github.com/unusdon/ai-chatbot-saas',
  themeColor: { light: '#ffffff', dark: '#0a0a0a' },
  brandHsl: '221 83% 53%',
} as const;

export const PRIMARY_KEYWORDS = [
  'AI chatbot SaaS',
  'RAG chatbot',
  'embeddable AI widget',
  'self-hosted chatbot platform',
  'open-source chatbot',
  'PDF chatbot',
  'DOCX chatbot',
  'Excel chatbot',
  'document chatbot',
  'AI support widget',
  'OpenAI chatbot SaaS',
  'Ollama chatbot',
  'Claude chatbot',
  'Gemini chatbot',
  'Deepseek chatbot',
  'pgvector chatbot',
  'Next.js chatbot template',
  'multi-tenant AI SaaS',
  'cite-source chatbot',
  'customer chat analytics',
  'conversation management dashboard',
  'admin chat dashboard',
  'Telegram chatbot SaaS',
  'WhatsApp chatbot SaaS',
  'Telegram bot platform',
  'WhatsApp Cloud API bot',
  'Telegram group bot',
  'multi-channel chatbot',
  'embed widget + Telegram + WhatsApp',
];

export function absoluteUrl(path = '/'): string {
  if (!path.startsWith('/')) path = `/${path}`;
  return `${SITE.url}${path === '/' ? '' : path}`;
}
