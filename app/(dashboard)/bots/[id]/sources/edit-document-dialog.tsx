'use client';

import { Loader2, Save } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

import type { Document } from '@/db/schema';

import { editDocumentContentAction, renameDocumentAction } from '../documents/actions';

export function EditDocumentDialog({
  document,
  onClose,
}: {
  document: Document;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(document.title);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isInlineEditable = ['text', 'markdown', 'json', 'qa'].includes(document.source);

  useEffect(() => {
    if (!isInlineEditable) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/bots/${document.botId}/documents/${document.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
        return res.json();
      })
      .then((d) => setContent(d.content ?? ''))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [document.botId, document.id, isInlineEditable]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.set('documentId', document.id);
      fd.set('title', title);
      if (isInlineEditable) {
        fd.set('content', content);
        const result = await editDocumentContentAction({ status: 'idle' }, fd);
        if (result.status === 'ok') {
          toast.success(result.message);
          onClose();
        } else if (result.status === 'error') {
          toast.error(result.message);
        }
      } else {
        const result = await renameDocumentAction({ status: 'idle' }, fd);
        if (result.status === 'ok') {
          toast.success(result.message);
          onClose();
        } else if (result.status === 'error') {
          toast.error(result.message);
        }
      }
    });
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full p-0 sm:max-w-2xl">
        <form onSubmit={save} className="flex h-full flex-col">
          <div className="border-b p-6">
            <SheetTitle>Edit source</SheetTitle>
            <p className="mt-1.5 text-xs uppercase tracking-wider text-muted-foreground">
              {document.source}
            </p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">{document.source === 'qa' ? 'Question' : 'Title'}</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={500}
              />
            </div>

            {isInlineEditable ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-content">
                    {document.source === 'qa' ? 'Answer' : 'Content'}
                  </Label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {content.length.toLocaleString()} chars
                  </span>
                </div>
                {loading ? (
                  <div className="flex h-64 items-center justify-center rounded-md border bg-surface-2/50 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <Textarea
                    id="edit-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={16}
                    required
                    className="font-mono text-xs leading-relaxed"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Saving re-ingests the source. The bot uses the new content from the next chat.
                </p>
              </div>
            ) : (
              <p className="rounded-md border border-dashed bg-surface-2/50 px-4 py-6 text-sm text-muted-foreground">
                File-type sources (PDF / DOCX / XLSX) can be renamed here. To replace the file
                content, delete this source and re-upload.
              </p>
            )}

            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t p-6">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || loading}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
