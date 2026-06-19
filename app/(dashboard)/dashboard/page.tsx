import { ArrowRight, Bot, BookOpen, FileText, MessageSquare, Plus, Rocket } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listBotsForUser } from '@/lib/server/bots';
import { getPlan, getUsage, limitsFor } from '@/lib/server/plans';
import { requireAuth } from '@/lib/server/require-auth';

export const metadata = { title: 'Overview' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireAuth();
  const [bots, plan, usage] = await Promise.all([
    listBotsForUser(user.id),
    getPlan(user.id),
    getUsage(user.id),
  ]);
  const displayName = user.name?.split(' ')[0] ?? 'there';
  const limits = limitsFor(plan);
  const isEmpty = bots.length === 0;

  return (
    <div className="space-y-8">
      <PageHeader title={`Welcome back, ${displayName}.`} subtitle="A snapshot of your chatbots and account usage.">
        <Button asChild>
          <Link href="/bots/new">
            <Plus className="h-4 w-4" /> New chatbot
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Bot className="h-4 w-4" />} label="Chatbots" value={String(bots.length)} hint={`of ${limits.bots} on ${plan}`} />
        <StatCard icon={<FileText className="h-4 w-4" />} label="Documents" value={String(usage.documents)} hint={`of ${limits.documents.toLocaleString()}`} />
        <StatCard icon={<MessageSquare className="h-4 w-4" />} label="Messages (this month)" value={usage.messagesThisMonth.toLocaleString()} hint={`of ${limits.messagesPerMonth.toLocaleString()}`} />
        <StatCard icon={<Rocket className="h-4 w-4" />} label="Plan" value={plan} hint="Upgrade anytime" capitalize />
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-soft">
              <Bot className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Create your first chatbot</h2>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                A chatbot is a knowledge base + RAG pipeline. Upload PDFs or URLs and you&apos;ll have a
                grounded chat widget you can embed anywhere.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild>
                <Link href="/bots/new">
                  <Plus className="h-4 w-4" /> New chatbot
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="https://github.com/unusdon/ai-chatbot-saas/blob/main/DEPLOY.md" target="_blank" rel="noreferrer">
                  <BookOpen className="h-4 w-4" /> Read the deploy guide
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle>Your chatbots</CardTitle>
                <CardDescription>{bots.length} active · pick one to manage.</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/bots">
                  See all <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="divide-y rounded-md border">
                {bots.slice(0, 5).map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/bots/${b.id}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-accent"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{b.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          Updated {b.updatedAt.toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          b.isActive
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {b.isActive ? 'Active' : 'Paused'}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Get more from your bot</CardTitle>
              <CardDescription>Quick tips for the next 10 minutes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <TipRow label="Upload your top 5 help docs" />
              <TipRow label="Embed the widget on staging first" />
              <TipRow label="Check Analytics → Content gaps weekly" />
              <Button asChild variant="outline" className="mt-2 w-full">
                <Link href="/bots">
                  Manage chatbots <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex shrink-0 gap-2">{children}</div> : null}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  capitalize,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className={`mt-3 text-2xl font-bold tabular-nums ${capitalize ? 'capitalize' : ''}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function TipRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-brand" />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
