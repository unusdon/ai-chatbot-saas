'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

type Chunk = { id: string; chunkIndex: number; content: string; tokens: number };
type Doc = {
  id: string;
  title: string;
  source: string;
  sourceUrl: string | null;
  status: string;
  error: string | null;
  chunkCount: number;
  bytes: number | null;
  createdAt: string;
  updatedAt: string;
};

export function PreviewDrawer({
  botId,
  documentId,
  onClose,
}: {
  botId: string;
  documentId: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<{ document: Doc; chunks: Chunk[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/bots/${botId}/documents/${documentId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
        return res.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [botId, documentId]);

  return (
    <Sheet open={Boolean(documentId)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full p-0 sm:max-w-2xl">
        <div className="flex h-full flex-col">
          <div className="border-b p-6">
            <SheetTitle>Preview</SheetTitle>
            {data ? (
              <div className="mt-3 space-y-1.5">
                <h2 className="line-clamp-2 text-lg font-semibold">{data.document.title}</h2>
                <p className="text-xs text-muted-foreground">
                  {data.document.source.toUpperCase()} · {data.document.chunkCount} chunks ·{' '}
                  Updated {new Date(data.document.updatedAt).toLocaleString()}
                </p>
                {data.document.sourceUrl ? (
                  <a
                    href={data.document.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-xs text-brand underline-offset-4 hover:underline"
                  >
                    {data.document.sourceUrl}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            ) : data && data.chunks.length === 0 ? (
              <p className="rounded-md border border-dashed bg-surface-2/50 px-4 py-8 text-center text-sm text-muted-foreground">
                No chunks yet. {data.document.status === 'pending' || data.document.status === 'processing'
                  ? 'Worker is still processing.'
                  : data.document.status === 'failed'
                    ? 'Ingestion failed. Try re-ingesting.'
                    : 'This document produced no embeddable chunks.'}
              </p>
            ) : data ? (
              <ol className="space-y-3">
                {data.chunks.map((c) => (
                  <li key={c.id} className="rounded-md border bg-card p-4 shadow-soft">
                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono">#{c.chunkIndex + 1}</span>
                      <span className="tabular-nums">~{c.tokens} tokens</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{c.content}</p>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
