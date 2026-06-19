import { ArrowRight, FileText, MessageSquare, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { auth } from '@/lib/auth';

export default async function LandingPage() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b">
      <script src="http://192.168.0.59:3000/widget.js" data-bot-key="bot_7abxbWBJv41QJXe0yBq-q7T7YkLS_T8S" defer></script>
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-5 w-5" />
            <span>AI Chatbot SaaS</span>
          </Link>
          <nav className="flex items-center gap-3">
            {session?.user ? (
              <Button asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Get started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 py-24 text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground">
          <Zap className="h-3.5 w-3.5" /> Production-ready RAG, multi-tenant out of the box
        </span>
        <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl">
          Train an AI chatbot on <span className="text-primary">your content</span> in minutes.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Upload PDFs, paste URLs, get an embeddable widget grounded in your docs — with citations,
          streaming responses, and per-tenant isolation.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">
              Start free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="https://github.com/cyberunite/ai-chatbot-saas" target="_blank">
              View on GitHub
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-3">
          <Feature
            icon={<FileText className="h-5 w-5" />}
            title="Ingest anything"
            body="PDFs, URLs, Markdown, plain text. Chunked, embedded, stored in pgvector."
          />
          <Feature
            icon={<MessageSquare className="h-5 w-5" />}
            title="Cited answers"
            body="Every response links back to the source chunk so users can verify."
          />
          <Feature
            icon={<Sparkles className="h-5 w-5" />}
            title="Embed anywhere"
            body="Single-script widget. Shadow DOM, no CSS conflicts, works on any site."
          />
        </div>
      </section>

      <footer className="mt-auto border-t">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Cyberunite</span>
          <div className="flex gap-4">
            <Link href="https://github.com/cyberunite/ai-chatbot-saas" className="hover:text-foreground">
              GitHub
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-muted">{icon}</div>
      <h3 className="mb-1 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
