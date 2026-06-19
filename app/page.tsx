import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Code2,
  FileText,
  Github,
  LayoutDashboard,
  Lock,
  MessageSquare,
  Send,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { auth } from '@/lib/auth';
import { FAQS } from '@/lib/seo/faqs';
import { PRIMARY_KEYWORDS, SITE, absoluteUrl } from '@/lib/seo/site';
import { FaqJsonLd, SoftwareApplicationJsonLd } from '@/lib/seo/structured-data';

export const metadata: Metadata = {
  title: 'AI chatbot SaaS — RAG chat platform with citations',
  description: SITE.description,
  keywords: PRIMARY_KEYWORDS,
  alternates: { canonical: '/' },
  openGraph: {
    title: 'AI Chatbot SaaS — train AI on your content. Embed anywhere.',
    description: SITE.description,
    url: SITE.url,
    type: 'website',
    images: [
      {
        url: absoluteUrl('/opengraph-image'),
        width: 1200,
        height: 630,
        alt: SITE.tagline,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Chatbot SaaS — train AI on your content',
    description: SITE.tagline,
    images: [absoluteUrl('/opengraph-image')],
  },
};

export default async function LandingPage() {
  const session = await auth();

  return (
    <main className="relative flex min-h-screen flex-col bg-background">
      <SoftwareApplicationJsonLd />
      <FaqJsonLd faqs={FAQS} />
      <SiteHeader signedIn={Boolean(session?.user)} />
      <Hero />
      <Trustbar />
      <FeatureGrid />
      <HowItWorks />
      <EmbedShowcase />
      <FaqSection />
      <CtaSection />
      <SiteFooter />
    </main>
  );
}

function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <LogoMark />
          <span className="text-base">AI Chatbot SaaS</span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
          <a href="#features" className="rounded-md px-3 py-2 hover:bg-accent hover:text-foreground">Features</a>
          <a href="#how-it-works" className="rounded-md px-3 py-2 hover:bg-accent hover:text-foreground">How it works</a>
          <a href="#embed" className="rounded-md px-3 py-2 hover:bg-accent hover:text-foreground">Embed</a>
          <a href="#faq" className="rounded-md px-3 py-2 hover:bg-accent hover:text-foreground">FAQ</a>
          <Link
            href="https://github.com/cyberunite/ai-chatbot-saas"
            className="ml-1 inline-flex items-center gap-1.5 rounded-md px-3 py-2 hover:bg-accent hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            <Github className="h-4 w-4" />
            <span>GitHub</span>
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Button asChild size="sm">
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">
                  Get started <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden className="bg-grid absolute inset-0 -z-10" />
      <div aria-hidden className="bg-spotlight absolute inset-0 -z-10" />
      <div className="container py-20 sm:py-28 lg:py-36">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center stagger">
          <span className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            Production-ready RAG, multi-tenant out of the box
          </span>
          <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Train an AI chatbot on{' '}
            <span className="bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
              your content
            </span>{' '}
            in minutes.
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Upload PDFs and URLs. Get an embeddable widget that answers questions grounded in your
            sources — with inline citations, streaming, and per-tenant isolation.
          </p>
          <div className="mt-10 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="xl" className="w-full sm:w-auto">
              <Link href="/signup">
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline" className="w-full sm:w-auto">
              <Link href="https://github.com/cyberunite/ai-chatbot-saas" target="_blank" rel="noreferrer">
                <Github className="h-4 w-4" /> View on GitHub
              </Link>
            </Button>
          </div>
          <p className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Free plan: 3 bots · 25 documents · 200 messages/month
          </p>
        </div>
      </div>
    </section>
  );
}

function Trustbar() {
  const items = [
    'Next.js 15',
    'OpenAI',
    'Claude',
    'Gemini',
    'Deepseek',
    'Ollama',
    'Telegram',
    'WhatsApp',
    'pgvector',
    'BullMQ · Redis',
    'S3 · MinIO',
    'Auth.js v5',
    'Stripe',
  ];
  return (
    <section className="border-y bg-surface-2">
      <div className="container py-6">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Built on the stack you already trust
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          {items.map((t) => (
            <li key={t} className="font-medium">{t}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FeatureGrid() {
  const features = [
    {
      icon: <FileText className="h-5 w-5" />,
      title: 'Ingest anything',
      body: 'PDF, DOCX, XLSX, JSON, Markdown, plain text, URLs, sitemap.xml crawl (up to 200 pages), and Q&A pairs. All chunked + embedded automatically.',
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: 'Any LLM you want',
      body: 'OpenAI, Anthropic Claude, Google Gemini, Deepseek, or fully local Ollama — swap with one env var. Mix providers (Ollama chat + OpenAI embeddings).',
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      title: 'Cited answers',
      body: 'Every response links back to the source chunk so users can verify. No hallucinations on brand facts.',
    },
    {
      icon: <Code2 className="h-5 w-5" />,
      title: 'Embed anywhere',
      body: 'One <script> tag. Shadow-DOM widget — 3.2 KB gzipped. CSS-isolated. Works on any site.',
    },
    {
      icon: <Send className="h-5 w-5" />,
      title: 'Telegram + WhatsApp',
      body: 'Connect the same bot to Telegram (private + groups w/ configurable mention mode) and WhatsApp Cloud API. All channels route into one conversation admin.',
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: 'Conversation manager',
      body: 'Every customer chat is admin-manageable across all channels: full transcript, IP, device, search, filter, flag, archive, JSON export. Bulk actions included.',
    },
    {
      icon: <BookOpenCheck className="h-5 w-5" />,
      title: 'Promote to training',
      body: 'Click "Add to training" on any good customer Q&A. Editable, then it becomes a permanent retrieval source — your bot gets smarter over time.',
    },
    {
      icon: <Lock className="h-5 w-5" />,
      title: 'Multi-tenant isolation',
      body: 'Every read/write scoped to the owning user. Tested with adversarial fixtures, not just trust.',
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: 'Streaming + low latency',
      body: 'Server-Sent Events for token-by-token streaming. pgvector HNSW retrieval in single-digit ms.',
    },
    {
      icon: <LayoutDashboard className="h-5 w-5" />,
      title: 'Analytics + content gaps',
      body: 'Top questions, content gaps, daily volume, latency. Find the docs your bot most needs you to add.',
    },
    {
      icon: <Lock className="h-5 w-5" />,
      title: 'Admin session security',
      body: 'Per-device login list with revoke. Password changes revoke other sessions. Full security audit log.',
    },
  ];
  return (
    <section id="features" className="container py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          A chat platform that ships features, not promises.
        </h2>
        <p className="mt-4 text-pretty text-muted-foreground">
          Every capability listed below is shipped, tested, and ready to deploy today.
        </p>
      </div>
      <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <li
            key={f.title}
            className="group relative rounded-lg border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated"
          >
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
              {f.icon}
            </div>
            <h3 className="text-base font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      step: '01',
      title: 'Create a chatbot',
      body: 'One bot per knowledge base. Add a system prompt or use the RAG-friendly default.',
    },
    {
      step: '02',
      title: 'Upload your sources',
      body: 'Drop in PDFs or paste URLs. The worker chunks + embeds in the background. Watch status flip to Ready.',
    },
    {
      step: '03',
      title: 'Embed the widget',
      body: 'Copy the script snippet, paste it into any site. End-users chat with answers grounded in your docs.',
    },
  ];
  return (
    <section id="how-it-works" className="border-y bg-surface-2">
      <div className="container py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Three steps from zero to deployed.
          </h2>
        </div>
        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.step} className="rounded-lg border bg-card p-6 shadow-soft">
              <span className="font-mono text-xs font-semibold text-muted-foreground">{s.step}</span>
              <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function EmbedShowcase() {
  const snippet = `<script
  src="https://your-app.com/widget.js"
  data-bot-key="bot_..."
  data-title="Ask Acme"
  data-accent="#7c3aed"
  defer
></script>`;
  return (
    <section id="embed" className="container py-20 sm:py-28">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
            <Code2 className="h-3.5 w-3.5" /> One script tag
          </span>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Drop in the snippet. Done.
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            The widget bundles its own styles inside a Shadow DOM, so it can&apos;t conflict with your
            site. ~3.2&nbsp;KB gzipped. No framework required.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
              <span>CORS open + stable end-user cookie per bot</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
              <span>Redis-backed rate limits per key + per IP</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
              <span>Theming via <code className="font-mono text-xs">data-accent</code>, <code className="font-mono text-xs">data-title</code></span>
            </li>
          </ul>
        </div>
        <div className="relative">
          <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-brand/10 to-brand/0 blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-xl border bg-card shadow-elevated">
            <div className="flex items-center gap-2 border-b bg-surface-2 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              <span className="ml-3 font-mono text-xs text-muted-foreground">index.html</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-xs leading-relaxed">
              <code>{snippet}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="border-t bg-surface-2">
      <div className="container py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Everything new self-hosters want to know before they clone the repo.
          </p>
        </div>
        <dl className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-2">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-lg border bg-card p-6 shadow-soft">
              <dt className="text-base font-semibold">{f.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="container py-20 sm:py-28">
      <div className="relative isolate overflow-hidden rounded-2xl border bg-card px-6 py-16 text-center shadow-elevated sm:px-12 sm:py-20">
        <div aria-hidden className="bg-grid-sm absolute inset-0 -z-10 opacity-40" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-background/40 to-background" />
        <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Ship your AI support widget this week.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
          Free to start. No credit card. Upgrade when you outgrow the free plan caps.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="xl">
            <Link href="/signup">
              Create your first chatbot <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="xl" variant="outline">
            <Link href="https://github.com/cyberunite/ai-chatbot-saas" target="_blank" rel="noreferrer">
              <Github className="h-4 w-4" /> Star on GitHub
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="container py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <LogoMark />
              <span>AI Chatbot SaaS</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Open-source RAG chatbot platform by Cyberunite.
            </p>
          </div>
          <FooterCol
            title="Product"
            links={[
              { label: 'Features', href: '#features' },
              { label: 'How it works', href: '#how-it-works' },
              { label: 'Embed', href: '#embed' },
              { label: 'FAQ', href: '#faq' },
            ]}
          />
          <FooterCol
            title="Resources"
            links={[
              { label: 'GitHub', href: 'https://github.com/cyberunite/ai-chatbot-saas' },
              { label: 'Deploy guide', href: 'https://github.com/cyberunite/ai-chatbot-saas/blob/main/DEPLOY.md' },
              { label: 'Changelog', href: 'https://github.com/cyberunite/ai-chatbot-saas/blob/main/CHANGELOG.md' },
              { label: 'Security', href: 'https://github.com/cyberunite/ai-chatbot-saas/blob/main/SECURITY.md' },
            ]}
          />
          <FooterCol
            title="Account"
            links={[
              { label: 'Log in', href: '/login' },
              { label: 'Sign up', href: '/signup' },
              { label: 'Forgot password', href: '/forgot-password' },
            ]}
          />
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Cyberunite. All rights reserved.</span>
          <span className="font-mono">MIT-licensed · self-host friendly</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LogoMark() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
      <Sparkles className="h-3.5 w-3.5" />
    </span>
  );
}
