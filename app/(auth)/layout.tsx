import type { Metadata } from 'next';
import { CheckCircle2, Sparkles } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  // Auth flows shouldn't surface in search results.
  robots: { index: false, follow: true, nocache: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left brand panel — hidden on mobile */}
      <aside className="relative isolate hidden w-1/2 flex-col justify-between overflow-hidden border-r bg-surface-2 p-10 lg:flex xl:p-14">
        <div aria-hidden className="bg-grid absolute inset-0 -z-10 opacity-60" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-background/40 via-transparent to-background" />
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span>AI Chatbot SaaS</span>
        </Link>
        <div>
          <h2 className="text-balance text-3xl font-bold tracking-tight xl:text-4xl">
            Multi-tenant RAG chat. Self-host friendly.
          </h2>
          <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
              <span>Postgres + pgvector retrieval with HNSW</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
              <span>Streamed answers with inline citations</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
              <span>3.2 KB Shadow-DOM widget — embed anywhere</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
              <span>Stripe-backed plans + per-tenant usage caps</span>
            </li>
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Cyberunite</p>
      </aside>

      {/* Right form panel */}
      <main className="flex flex-1 flex-col">
        <div className="container flex items-center justify-between py-6 lg:hidden">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span>AI Chatbot SaaS</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:py-16">
          <div className="w-full max-w-md animate-in-up">{children}</div>
        </div>
      </main>
    </div>
  );
}
