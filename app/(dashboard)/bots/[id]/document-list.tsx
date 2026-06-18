'use client';

import { FileText, Globe, Trash2 } from 'lucide-react';

import type { Document } from '@/db/schema';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { deleteDocumentAction } from './documents/actions';

const STATUS_LABEL: Record<string, { label: string; variant: 'success' | 'secondary' | 'warning' | 'destructive' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  processing: { label: 'Processing', variant: 'warning' },
  ready: { label: 'Ready', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
};

export function DocumentList({ documents }: { documents: Document[] }) {
  if (documents.length === 0) {
    return (
      <p className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
        No sources yet. Upload a PDF or add a URL to get started.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
          <Icon source={doc.source} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{doc.title}</div>
            <div className="truncate text-xs text-muted-foreground">
              {doc.source === 'url' ? doc.sourceUrl : formatBytes(doc.bytes)} ·{' '}
              {doc.chunkCount} {doc.chunkCount === 1 ? 'chunk' : 'chunks'} ·{' '}
              {doc.createdAt.toLocaleDateString()}
            </div>
            {doc.status === 'failed' && doc.error ? (
              <p className="mt-1 text-xs text-destructive">{doc.error}</p>
            ) : null}
          </div>
          <Badge variant={STATUS_LABEL[doc.status]?.variant ?? 'secondary'}>
            {STATUS_LABEL[doc.status]?.label ?? doc.status}
          </Badge>
          <form action={deleteDocumentAction}>
            <input type="hidden" name="documentId" value={doc.id} />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              title="Delete source"
              aria-label="Delete source"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        </li>
      ))}
    </ul>
  );
}

function Icon({ source }: { source: string }) {
  if (source === 'url') return <Globe className="h-5 w-5 shrink-0 text-muted-foreground" />;
  return <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />;
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
