import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';

import { ThemeProvider } from '@/components/theme-provider';
import { env } from '@/lib/env';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: 'AI Chatbot SaaS — train an AI on your docs in minutes',
    template: '%s · AI Chatbot SaaS',
  },
  description:
    'Multi-tenant RAG chatbot platform. Upload PDFs and URLs, get an embeddable AI support widget grounded in your content with citations.',
  keywords: ['RAG', 'chatbot', 'AI', 'SaaS', 'OpenAI', 'pgvector', 'Next.js'],
  authors: [{ name: 'Cyberunite', url: 'https://cyberunite.com' }],
  openGraph: {
    type: 'website',
    title: 'AI Chatbot SaaS',
    description: 'Train an AI chatbot on your content. Embed anywhere.',
    url: env.NEXT_PUBLIC_APP_URL,
    siteName: 'AI Chatbot SaaS',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Chatbot SaaS',
    description: 'Train an AI chatbot on your content. Embed anywhere.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
