'use client';

import { FileText, Loader2, Save } from 'lucide-react';
import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { createTextSourceAction, type DocumentActionState } from '../../documents/actions';

const INITIAL: DocumentActionState = { status: 'idle' };

export function TextSourceForm({ botId }: { botId: string }) {
  const [state, formAction] = useActionState(createTextSourceAction, INITIAL);
  const [content, setContent] = useState('');
  const [kind, setKind] = useState<'text' | 'markdown'>('text');
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === 'ok') {
      toast.success(state.message);
      formRef.current?.reset();
      setContent('');
    }
    if (state.status === 'error' && !state.field) toast.error(state.message);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" /> Paste text or markdown
        </CardTitle>
        <CardDescription>
          For FAQs, policies, or any raw text you don&apos;t want to upload as a file. Editable later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="botId" value={botId} />
          <input type="hidden" name="kind" value={kind} />

          <div className="flex gap-2 rounded-md border bg-card p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setKind('text')}
              className={`rounded px-3 py-1 transition-colors ${
                kind === 'text' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Plain text
            </button>
            <button
              type="button"
              onClick={() => setKind('markdown')}
              className={`rounded px-3 py-1 transition-colors ${
                kind === 'markdown' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Markdown
            </button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g. Acme Refund Policy"
              required
              maxLength={200}
              aria-invalid={state.status === 'error' && state.field === 'title'}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Content</Label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {content.length.toLocaleString()} chars
              </span>
            </div>
            <Textarea
              id="content"
              name="content"
              rows={12}
              required
              maxLength={500000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                kind === 'markdown'
                  ? '## Acme refund policy\n\nWe accept returns within 30 days…'
                  : 'Paste your content here. Plain text only.'
              }
              className="font-mono text-xs leading-relaxed"
              aria-invalid={state.status === 'error' && state.field === 'content'}
            />
          </div>
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {pending ? 'Saving…' : 'Save source'}
    </Button>
  );
}
