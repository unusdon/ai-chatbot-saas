import { Activity, AlertTriangle, MessageSquare, Timer, Users } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

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
  return { title: bot ? `Analytics — ${bot.name}` : 'Analytics' };
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
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/bots/${bot.id}`}>← Back to {bot.name}</Link>
        </Button>
        <h1 className="mt-2 text-2xl font-bold">Analytics for {bot.name}</h1>
        <p className="text-sm text-muted-foreground">
          Last 14 days. Use the content-gap list to find questions your sources can&apos;t yet
          answer.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<MessageSquare className="h-4 w-4" />}
          label="Total messages"
          value={stats.totalMessages.toLocaleString()}
          hint={`${stats.userMessages.toLocaleString()} user · ${stats.assistantMessages.toLocaleString()} assistant`}
        />
        <Stat
          icon={<Users className="h-4 w-4" />}
          label="Conversations"
          value={stats.totalConversations.toLocaleString()}
        />
        <Stat
          icon={<Timer className="h-4 w-4" />}
          label="Avg latency"
          value={stats.avgLatencyMs == null ? '—' : `${Math.round(stats.avgLatencyMs)} ms`}
        />
        <Stat
          icon={<Activity className="h-4 w-4" />}
          label="Tokens (in/out)"
          value={`${formatTokens(stats.totalPromptTokens)} / ${formatTokens(stats.totalCompletionTokens)}`}
          hint="Estimated from OpenAI responses"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">User messages — last 14 days</CardTitle>
          <CardDescription>Daily volume of end-user questions hitting this bot.</CardDescription>
        </CardHeader>
        <CardContent>
          <DailyMessageChart data={daily} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top questions</CardTitle>
            <CardDescription>Most frequent user messages.</CardDescription>
          </CardHeader>
          <CardContent>
            {topQueries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No questions yet.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {topQueries.map((q, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                    <span className="line-clamp-2 flex-1">{q.content}</span>
                    <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs tabular-nums">
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
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Content gaps
            </CardTitle>
            <CardDescription>
              Questions the bot couldn&apos;t answer (no relevant chunks). These are the highest-ROI
              sources to add next.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contentGaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No content gaps detected.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {contentGaps.map((g) => (
                  <li key={g.messageId} className="px-3 py-2.5 text-sm">
                    <p className="line-clamp-2 font-medium">{g.question}</p>
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

function Stat({
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function formatTokens(n: number): string {
  if (n < 1000) return n.toLocaleString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}
