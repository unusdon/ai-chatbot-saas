import { Activity, AlertTriangle, ArrowLeft, MessageSquare, Timer, Users } from 'lucide-react';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getBotForUser } from '@/lib/server/bots';
import {
  getBotStats,
  getContentGaps,
  getDailyMessageCounts,
  getTopQueries,
} from '@/lib/server/analytics';
import { requireAuth } from '@/lib/server/require-auth';

import { DailyMessageChart } from './daily-chart';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const bot = await getBotForUser(user.id, id);
  return { title: bot ? `Analytics · ${bot.name}` : 'Analytics' };
}

export default async function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const bot = await getBotForUser(user.id, id);
  if (!bot) notFound();

  const [stats, daily, topQueries, contentGaps] = await Promise.all([
    getBotStats(user.id, bot.id),
    getDailyMessageCounts(user.id, bot.id, 14),
    getTopQueries(user.id, bot.id, 10),
    getContentGaps(user.id, bot.id, 10),
  ]);
  if (!stats) notFound();

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href={`/bots/${bot.id}`}>
            <ArrowLeft className="h-4 w-4" /> Back to {bot.name}
          </Link>
        </Button>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Last 14 days. The Content Gaps card surfaces the highest-ROI sources to add next.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<MessageSquare className="h-4 w-4" />}
          label="Total messages"
          value={stats.totalMessages.toLocaleString()}
          hint={`${stats.userMessages.toLocaleString()} user · ${stats.assistantMessages.toLocaleString()} assistant`}
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Conversations"
          value={stats.totalConversations.toLocaleString()}
        />
        <StatCard
          icon={<Timer className="h-4 w-4" />}
          label="Avg latency"
          value={stats.avgLatencyMs == null ? '—' : `${Math.round(stats.avgLatencyMs)} ms`}
          hint="From query to first byte"
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Tokens (in / out)"
          value={`${formatTokens(stats.totalPromptTokens)} / ${formatTokens(stats.totalCompletionTokens)}`}
          hint="From OpenAI responses"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Messages — last 14 days</CardTitle>
          <CardDescription>Daily volume of end-user questions.</CardDescription>
        </CardHeader>
        <CardContent>
          <DailyMessageChart data={daily} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top questions</CardTitle>
            <CardDescription>Most-asked user prompts.</CardDescription>
          </CardHeader>
          <CardContent>
            {topQueries.length === 0 ? (
              <EmptyState label="No questions yet." />
            ) : (
              <ul className="divide-y rounded-md border">
                {topQueries.map((q, i) => (
                  <li key={i} className="flex items-start gap-3 px-4 py-3">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <p className="line-clamp-2 flex-1 text-sm leading-snug">{q.content}</p>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                      {q.count}×
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Content gaps
            </CardTitle>
            <CardDescription>
              Questions the bot couldn&apos;t answer (no relevant chunks). Add a source for these.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contentGaps.length === 0 ? (
              <EmptyState label="No content gaps detected." />
            ) : (
              <ul className="divide-y rounded-md border">
                {contentGaps.map((g) => (
                  <li key={g.messageId} className="px-4 py-3">
                    <p className="line-clamp-2 text-sm font-medium">{g.question}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {g.createdAt.toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed bg-surface-2/50 px-4 py-8 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function formatTokens(n: number): string {
  if (n < 1000) return n.toLocaleString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}
