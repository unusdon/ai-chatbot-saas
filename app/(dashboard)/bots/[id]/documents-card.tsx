import { ArrowRight, FileType2 } from 'lucide-react';
import Link from 'next/link';

import type { Document } from '@/db/schema';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function DocumentsCard({ botId, documents }: { botId: string; documents: Document[] }) {
  const counts = {
    total: documents.length,
    ready: documents.filter((d) => d.status === 'ready').length,
    processing: documents.filter((d) => d.status === 'processing' || d.status === 'pending').length,
    failed: documents.filter((d) => d.status === 'failed').length,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Training sources</CardTitle>
          <CardDescription>
            {counts.total === 0
              ? 'No sources yet. Add files, URLs, text, JSON, or Q&A pairs.'
              : `${counts.total} source${counts.total === 1 ? '' : 's'} powering this bot.`}
          </CardDescription>
        </div>
        <Button asChild>
          <Link href={`/bots/${botId}/sources`}>
            <FileType2 className="h-4 w-4" /> {counts.total === 0 ? 'Add sources' : 'Manage'}{' '}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      {counts.total > 0 ? (
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Ready" value={counts.ready} accent="emerald" />
            <Stat label="In progress" value={counts.processing} accent="amber" />
            <Stat label="Failed" value={counts.failed} accent="destructive" />
          </div>
          {documents.length > 0 ? (
            <ul className="mt-4 divide-y rounded-md border bg-card">
              {documents.slice(0, 5).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="truncate font-medium">{d.title}</span>
                  <span className="shrink-0 text-xs uppercase text-muted-foreground">{d.source}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {documents.length > 5 ? (
            <p className="mt-2 text-right text-xs text-muted-foreground">
              + {documents.length - 5} more on the{' '}
              <Link href={`/bots/${botId}/sources`} className="underline-offset-4 hover:underline">
                Sources page
              </Link>
            </p>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: 'emerald' | 'amber' | 'destructive';
}) {
  const colorMap = {
    emerald: 'text-emerald-700 dark:text-emerald-300',
    amber: 'text-amber-700 dark:text-amber-300',
    destructive: 'text-destructive',
  };
  return (
    <div className="rounded-md border bg-surface-2 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${value > 0 ? colorMap[accent] : ''}`}>
        {value}
      </p>
    </div>
  );
}
