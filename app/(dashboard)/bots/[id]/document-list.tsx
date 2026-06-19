'use client';

import { FileText, Globe, Trash2 } from 'lucide-react';

import type { Document } from '@/db/schema';

import { Button } from '@/components/ui/button';

import { deleteDocumentAction } from './documents/actions';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  processing: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  ready: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  failed: 'bg-destructive/10 text-destructive',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Failed',
};

export function DocumentList({ documents }: { documents: Document[] }) {
  if (documents.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-surface-2/50 px-4 py-8 text-center text-sm text-muted-foreground">
        No sources yet. Upload a PDF or add a URL above to get started.
      </div>
    );
  }

  return (
    <ul className="divide-y rounded-md border bg-card">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
            {doc.source === 'url' ? <Globe className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{doc.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {doc.source === 'url' ? doc.sourceUrl : formatBytes(doc.bytes)} ·{' '}
              {doc.chunkCount} {doc.chunkCount === 1 ? 'chunk' : 'chunks'} ·{' '}
              {doc.createdAt.toLocaleDateString()}
            </p>
            {doc.status === 'failed' && doc.error ? (
              <p className="mt-1 truncate text-xs text-destructive">{doc.error}</p>
            ) : null}
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[doc.status] ?? STATUS_STYLES.pending}`}
          >
            {STATUS_LABEL[doc.status] ?? doc.status}
          </span>
          <form action={deleteDocumentAction}>
            <input type="hidden" name="documentId" value={doc.id} />
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              title="Delete source"
              aria-label="Delete source"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        </li>
      ))}
    </ul>
  );
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
