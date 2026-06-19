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
    'Multi-tenant RAG chatbot platform. Upload PDFs, DOCX, XLSX, JSON, URLs, or Q&A pairs — get an embeddable AI support widget grounded in your content with citations, streaming, and per-tenant isolation.',
  url: env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ''),
  locale: 'en_US',
  twitter: '@cyberunite',
  author: {
    name: 'Cyberunite',
    url: 'https://cyberunite.com',
    email: 'info@cyberunite.com',
  },
  github: 'https://github.com/cyberunite/ai-chatbot-saas',
  themeColor: { light: '#ffffff', dark: '#0a0a0a' },
  brandHsl: '221 83% 53%',
} as const;

export const PRIMARY_KEYWORDS = [
  'AI chatbot SaaS',
  'RAG chatbot',
  'embeddable AI widget',
  'self-hosted chatbot platform',
  'PDF chatbot',
  'document chatbot',
  'AI support widget',
  'OpenAI chatbot SaaS',
  'pgvector chatbot',
  'Next.js chatbot template',
  'multi-tenant AI SaaS',
  'cite-source chatbot',
];

export function absoluteUrl(path = '/'): string {
  if (!path.startsWith('/')) path = `/${path}`;
  return `${SITE.url}${path === '/' ? '' : path}`;
}
