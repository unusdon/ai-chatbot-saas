import { ArrowLeft, Flag, MessageSquare, TrendingUp, UserCircle2, Users } from 'lucide-react';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { getBotForUser } from '@/lib/server/bots';
import { getConversationStats, listConversationsForBot } from '@/lib/server/conversations';
import { requireAuth } from '@/lib/server/require-auth';

import { ConversationsTable } from './conversations-table';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const bot = await getBotForUser(user.id, id);
  return { title: bot ? `Conversations · ${bot.name}` : 'Conversations' };
}

const PAGE_SIZE = 50;

export default async function ConversationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
    flag?: string;
    range?: '24h' | '7d' | '30d' | 'all';
    archived?: '1';
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireAuth();
  const bot = await getBotForUser(user.id, id);
  if (!bot) notFound();

  const page = Math.max(1, Number(sp.page ?? '1'));
  const offset = (page - 1) * PAGE_SIZE;
  const since = (() => {
    const now = Date.now();
    switch (sp.range) {
      case '24h':
        return new Date(now - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now - 30 * 24 * 60 * 60 * 1000);
      default:
        return undefined;
    }
  })();

  const [{ items, total }, stats] = await Promise.all([
    listConversationsForBot(user.id, bot.id, {
      search: sp.q,
      since,
      flag: sp.flag ?? null,
      includeArchived: sp.archived === '1',
      limit: PAGE_SIZE,
      offset,
    }),
    getConversationStats(user.id, bot.id),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href={`/bots/${bot.id}`}>
            <ArrowLeft className="h-4 w-4" /> Back to {bot.name}
          </Link>
        </Button>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Customer conversations</h1>
          <p className="text-sm text-muted-foreground">
            Every chat session your end-users had with this bot — search, filter, flag, export, or delete.
          </p>
        </div>
      </div>

      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard icon={<MessageSquare className="h-4 w-4" />} label="Total sessions" value={stats.total.toLocaleString()} />
          <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Active · 24h" value={stats.activeLast24h.toLocaleString()} />
          <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Active · 7d" value={stats.activeLast7d.toLocaleString()} />
          <StatCard icon={<UserCircle2 className="h-4 w-4" />} label="Unique users" value={stats.uniqueEndUsers.toLocaleString()} />
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Avg / session"
            value={stats.avgMessagesPerConversation > 0 ? stats.avgMessagesPerConversation.toFixed(1) : '—'}
            hint="messages"
          />
        </div>
      ) : null}

      {stats && stats.flagged > 0 ? (
        <div className="flex items-center gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <Flag className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <p className="text-sm">
            <strong className="font-medium">{stats.flagged}</strong> conversation
            {stats.flagged === 1 ? '' : 's'} flagged for review.{' '}
            <Link href={`/bots/${bot.id}/conversations?flag=review`} className="underline-offset-4 hover:underline">
              View flagged
            </Link>
          </p>
        </div>
      ) : null}

      <ConversationsTable
        botId={bot.id}
        items={items}
        total={total}
        page={page}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        search={sp.q ?? ''}
        range={sp.range ?? 'all'}
        flag={sp.flag ?? ''}
        archived={sp.archived === '1'}
      />
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
