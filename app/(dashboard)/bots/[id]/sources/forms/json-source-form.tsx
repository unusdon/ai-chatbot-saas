'use client';

import { ListTree, Loader2, Save } from 'lucide-react';
import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { createJsonSourceAction, type DocumentActionState } from '../../documents/actions';

const INITIAL: DocumentActionState = { status: 'idle' };

const SAMPLE = JSON.stringify(
  [
    { question: 'Refund policy?', answer: '30 days, full refund, no questions asked.' },
    { question: 'Shipping?', answer: 'Free worldwide over $50.' },
  ],
  null,
  2,
);

export function JsonSourceForm({ botId }: { botId: string }) {
  const [state, formAction] = useActionState(createJsonSourceAction, INITIAL);
  const [content, setContent] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === 'ok') {
      toast.success(state.message);
      formRef.current?.reset();
      setContent('');
    }
    if (state.status === 'error' && !state.field) toast.error(state.message);
  }, [state]);

  const looksValid = (() => {
    if (!content.trim()) return null;
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListTree className="h-4 w-4" /> JSON source
        </CardTitle>
        <CardDescription>
          Arrays of objects become one chunk per row. Nested objects flatten to{' '}
          <code className="font-mono text-xs">path.key: value</code> lines. Useful for product
          catalogs, FAQ exports, knowledge bases.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="botId" value={botId} />
          <div className="space-y-1.5">
            <Label htmlFor="json-title">Title</Label>
            <Input
              id="json-title"
              name="title"
              placeholder="e.g. Product catalog Q1"
              required
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="json-content">JSON</Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setContent(SAMPLE)}
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Insert sample
                </button>
                {looksValid !== null ? (
                  <span
                    className={`text-xs tabular-nums ${
                      looksValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                    }`}
                  >
                    {looksValid ? 'Valid JSON' : 'Invalid JSON'}
                  </span>
                ) : null}
              </div>
            </div>
            <Textarea
              id="json-content"
              name="content"
              rows={14}
              required
              maxLength={2_000_000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={'[\n  { "question": "…", "answer": "…" }\n]'}
              className="font-mono text-xs leading-relaxed"
              aria-invalid={looksValid === false}
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
      {pending ? 'Saving…' : 'Save JSON source'}
    </Button>
  );
}
