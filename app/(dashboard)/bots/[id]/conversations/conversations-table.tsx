'use client';

import { ChevronLeft, ChevronRight, Eye, Flag, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { Conversation } from '@/db/schema';
import { parseUserAgent } from '@/lib/server/parse-ua';

import { bulkDeleteConversationsAction } from './actions';

type ListItem = Conversation & {
  messageCount: number;
  firstUserMessage: string | null;
  lastMessage: string | null;
};

const FLAG_STYLES: Record<string, string> = {
  review: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  abuse: 'bg-destructive/10 text-destructive',
  spam: 'bg-muted text-muted-foreground',
  star: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
};

export function ConversationsTable({
  botId,
  items,
  total,
  page,
  totalPages,
  pageSize,
  search,
  range,
  flag,
  archived,
}: {
  botId: string;
  items: ListItem[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  search: string;
  range: '24h' | '7d' | '30d' | 'all';
  flag: string;
  archived: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(search);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));

  function nav(params: Record<string, string | null>) {
    const next = new URLSearchParams(sp?.toString() ?? '');
    for (const [k, v] of Object.entries(params)) {
      if (v == null || v === '') next.delete(k);
      else next.set(k, v);
    }
    router.push(`?${next.toString()}`);
  }

  function toggleAll() {
    setSelected((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        items.forEach((i) => next.delete(i.id));
        return next;
      }
      return new Set([...prev, ...items.map((i) => i.id)]);
    });
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} conversation${selected.size === 1 ? '' : 's'}? This is permanent.`)) return;
    startTransition(async () => {
      const res = await bulkDeleteConversationsAction({ botId, conversationIds: [...selected] });
      toast.success(`Deleted ${res.deleted} conversation${res.deleted === 1 ? '' : 's'}`);
      setSelected(new Set());
      router.refresh();
    });
  }

  const showingTo = useMemo(() => Math.min((page - 1) * pageSize + items.length, total), [page, pageSize, items.length, total]);
  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form
          className="relative w-full lg:max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            nav({ q: q || null, page: '1' });
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search message content…"
            className="pl-9"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {(['24h', '7d', '30d', 'all'] as const).map((r) => (
            <Pill key={r} active={range === r} onClick={() => nav({ range: r === 'all' ? null : r, page: '1' })}>
              {r === 'all' ? 'All time' : `Last ${r}`}
            </Pill>
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          <Pill active={!flag} onClick={() => nav({ flag: null, page: '1' })}>Any flag</Pill>
          {(['review', 'star', 'abuse', 'spam'] as const).map((f) => (
            <Pill key={f} active={flag === f} onClick={() => nav({ flag: f, page: '1' })}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${flagDot(f)}`} />
              {f}
            </Pill>
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          <Pill active={archived} onClick={() => nav({ archived: archived ? null : '1', page: '1' })}>
            {archived ? '✓ ' : ''}Archived
          </Pill>
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="flex items-center justify-between rounded-md border bg-card px-4 py-2 shadow-soft">
          <span className="text-sm">
            <strong className="tabular-nums">{selected.size}</strong> selected
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button variant="destructive" size="sm" onClick={deleteSelected} disabled={pending}>
              <Trash2 className="h-4 w-4" /> Delete selected
            </Button>
          </div>
        </div>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all"
                      className="h-4 w-4 cursor-pointer rounded border-border"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">Visitor</th>
                  <th className="px-4 py-3 text-left">First question</th>
                  <th className="px-4 py-3 text-left">Last reply</th>
                  <th className="px-4 py-3 text-left">Last active</th>
                  <th className="px-4 py-3 text-left">Messages</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No conversations match these filters.
                    </td>
                  </tr>
                ) : (
                  items.map((c) => {
                    const ua = parseUserAgent(c.userAgent);
                    return (
                      <tr key={c.id} className="hover:bg-accent/40">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(c.id)}
                            onChange={() => toggle(c.id)}
                            aria-label={`Select ${c.id}`}
                            className="h-4 w-4 cursor-pointer rounded border-border"
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className="font-mono">{c.endUserId?.slice(0, 14) ?? 'anonymous'}</span>
                            <span className="text-muted-foreground">{ua.browser} on {ua.os}</span>
                            <span className="text-muted-foreground">{c.ipAddress ?? '—'}</span>
                            {c.flag ? (
                              <span className={`mt-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${FLAG_STYLES[c.flag] ?? FLAG_STYLES.review}`}>
                                <Flag className="h-2.5 w-2.5" /> {c.flag}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="line-clamp-2 max-w-md text-sm">{c.firstUserMessage ?? <em className="text-muted-foreground">(no user message)</em>}</p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="line-clamp-2 max-w-md text-xs text-muted-foreground">{c.lastMessage ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-muted-foreground tabular-nums">
                          {fmtTime(c.lastMessageAt)}
                        </td>
                        <td className="px-4 py-3 align-top tabular-nums">{c.messageCount}</td>
                        <td className="px-4 py-3 align-top">
                          <Button asChild size="icon-sm" variant="ghost" title="View transcript">
                            <Link href={`/bots/${botId}/conversations/${c.id}`} aria-label="View transcript">
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          Showing {showingFrom}–{showingTo} of {total.toLocaleString()}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => nav({ page: String(page - 1) })}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => nav({ page: String(page + 1) })}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? 'border-foreground/30 bg-foreground text-background'
          : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function flagDot(f: string): string {
  switch (f) {
    case 'review':
      return 'bg-amber-500';
    case 'abuse':
      return 'bg-destructive';
    case 'star':
      return 'bg-emerald-500';
    case 'spam':
      return 'bg-muted-foreground';
    default:
      return 'bg-muted-foreground';
  }
}

function fmtTime(date: Date): string {
  const d = new Date(date);
  const ms = Date.now() - d.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString();
}
