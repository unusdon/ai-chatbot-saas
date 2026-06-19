import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';

import { ThemeProvider } from '@/components/theme-provider';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';

import './globals.css';

const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: 'AI Chatbot SaaS — train an AI on your docs in minutes',
    template: '%s · AI Chatbot SaaS',
  },
  description:
    'Multi-tenant RAG chatbot platform. Upload PDFs and URLs, get an embeddable AI support widget grounded in your content with citations.',
  keywords: ['RAG', 'chatbot', 'AI', 'SaaS', 'OpenAI', 'pgvector', 'Next.js', 'support automation'],
  authors: [{ name: 'Cyberunite', url: 'https://cyberunite.com' }],
  creator: 'Cyberunite',
  publisher: 'Cyberunite',
  openGraph: {
    type: 'website',
    title: 'AI Chatbot SaaS — RAG chat platform',
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
  icons: { icon: '/favicon.ico' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(sans.variable, mono.variable)}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors position="top-right" closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
