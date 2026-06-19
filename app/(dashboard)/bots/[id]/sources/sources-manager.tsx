'use client';

import {
  Edit3,
  Eye,
  FileText,
  FileType2,
  Globe,
  ListTree,
  MessagesSquare,
  RotateCw,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import type { Document } from '@/db/schema';

import {
  bulkDeleteDocumentsAction,
  deleteDocumentAction,
  reingestDocumentAction,
} from '../documents/actions';
import { EditDocumentDialog } from './edit-document-dialog';
import { PreviewDrawer } from './preview-drawer';

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileType2 className="h-4 w-4" />,
  docx: <FileType2 className="h-4 w-4" />,
  xlsx: <FileType2 className="h-4 w-4" />,
  url: <Globe className="h-4 w-4" />,
  text: <FileText className="h-4 w-4" />,
  markdown: <FileText className="h-4 w-4" />,
  json: <ListTree className="h-4 w-4" />,
  qa: <MessagesSquare className="h-4 w-4" />,
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  processing: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  ready: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  failed: 'bg-destructive/10 text-destructive',
};

type FilterKey = 'all' | 'pdf' | 'docx' | 'xlsx' | 'url' | 'text' | 'markdown' | 'json' | 'qa';
type FilterStatus = 'all' | 'pending' | 'processing' | 'ready' | 'failed';

export function SourcesManager({ botId, documents }: { botId: string; documents: Document[] }) {
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<FilterKey>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Document | null>(null);
  const [bulkPending, setBulkPending] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (kindFilter !== 'all' && d.source !== kindFilter) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) || d.sourceUrl?.toLowerCase().includes(q) || false
      );
    });
  }, [documents, search, kindFilter, statusFilter]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((d) => selected.has(d.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        filtered.forEach((d) => next.delete(d.id));
        return next;
      }
      return new Set([...prev, ...filtered.map((d) => d.id)]);
    });
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} source${selected.size === 1 ? '' : 's'}? This is permanent.`)) {
      return;
    }
    setBulkPending(true);
    try {
      const res = await bulkDeleteDocumentsAction({ documentIds: [...selected] });
      toast.success(`Deleted ${res.deleted} source${res.deleted === 1 ? '' : 's'}`);
      setSelected(new Set());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setBulkPending(false);
    }
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-soft">
            <FileType2 className="h-5 w-5" />
          </span>
          <h3 className="text-base font-semibold">No sources yet</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Switch to the Add tab to upload files, paste text, add URLs, ingest JSON, or write Q&amp;A
            pairs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or URL…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill
            active={kindFilter === 'all'}
            onClick={() => setKindFilter('all')}
            label="All types"
          />
          {(['pdf', 'docx', 'xlsx', 'url', 'text', 'markdown', 'json', 'qa'] as const).map((k) => (
            <FilterPill
              key={k}
              active={kindFilter === k}
              onClick={() => setKindFilter(k)}
              label={labelFor(k)}
              count={documents.filter((d) => d.source === k).length}
            />
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          {(['all', 'ready', 'processing', 'pending', 'failed'] as const).map((s) => (
            <FilterPill
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              label={s === 'all' ? 'Any status' : s}
            />
          ))}
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
            <Button
              variant="destructive"
              size="sm"
              onClick={deleteSelected}
              disabled={bulkPending}
            >
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
                      checked={allFilteredSelected}
                      onChange={toggleAll}
                      aria-label="Select all"
                      className="h-4 w-4 cursor-pointer rounded border-border"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Chunks</th>
                  <th className="px-4 py-3 text-left">Updated</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No sources match these filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((doc) => (
                    <tr key={doc.id} className="hover:bg-accent/40">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(doc.id)}
                          onChange={() => toggle(doc.id)}
                          aria-label={`Select ${doc.title}`}
                          className="h-4 w-4 cursor-pointer rounded border-border"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                            {SOURCE_ICONS[doc.source] ?? <FileText className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0">
                            <p className="line-clamp-1 font-medium">{doc.title}</p>
                            {doc.sourceUrl ? (
                              <p className="line-clamp-1 text-xs text-muted-foreground">{doc.sourceUrl}</p>
                            ) : doc.bytes ? (
                              <p className="text-xs text-muted-foreground">{formatBytes(doc.bytes)}</p>
                            ) : null}
                            {doc.status === 'failed' && doc.error ? (
                              <p className="mt-0.5 line-clamp-1 text-xs text-destructive">{doc.error}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{labelFor(doc.source as FilterKey)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[doc.status] ?? STATUS_STYLES.pending}`}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{doc.chunkCount}</td>
                      <td className="px-4 py-3 text-muted-foreground">{doc.updatedAt.toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => setPreviewId(doc.id)}
                            title="Preview chunks"
                            aria-label="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isInlineEditable(doc.source) ? (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => setEditing(doc)}
                              title="Edit"
                              aria-label="Edit"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {doc.status === 'failed' || doc.status === 'pending' ? (
                            <form action={reingestDocumentAction}>
                              <input type="hidden" name="documentId" value={doc.id} />
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                type="submit"
                                title="Re-ingest"
                                aria-label="Re-ingest"
                              >
                                <RotateCw className="h-4 w-4" />
                              </Button>
                            </form>
                          ) : null}
                          <form action={deleteDocumentAction}>
                            <input type="hidden" name="documentId" value={doc.id} />
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              type="submit"
                              title="Delete"
                              aria-label="Delete"
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <PreviewDrawer
        botId={botId}
        documentId={previewId}
        onClose={() => setPreviewId(null)}
      />

      {editing ? (
        <EditDocumentDialog document={editing} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
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
      <span className="capitalize">{label}</span>
      {count !== undefined && count > 0 ? (
        <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${active ? 'bg-background/20' : 'bg-muted'}`}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

function isInlineEditable(source: string): boolean {
  return ['text', 'markdown', 'json', 'qa'].includes(source);
}

function labelFor(k: FilterKey): string {
  return {
    all: 'all',
    pdf: 'PDF',
    docx: 'DOCX',
    xlsx: 'Excel',
    url: 'URL',
    text: 'Text',
    markdown: 'Markdown',
    json: 'JSON',
    qa: 'Q&A',
  }[k];
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
