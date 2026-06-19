'use client';

import { Link as LinkIcon, Loader2 } from 'lucide-react';
import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { ingestUrlAction, type DocumentActionState } from './documents/actions';

const initial: DocumentActionState = { status: 'idle' };

export function UrlIngestForm({ botId }: { botId: string }) {
  const [state, formAction] = useActionState(ingestUrlAction, initial);

  useEffect(() => {
    if (state.status === 'ok') toast.success(state.message);
    if (state.status === 'error' && !state.field) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border bg-surface-2 p-4">
      <input type="hidden" name="botId" value={botId} />
      <div className="flex items-center justify-between">
        <Label htmlFor="ingest-url" className="text-sm font-semibold">
          Add URL
        </Label>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">html only</span>
      </div>
      <p className="text-xs text-muted-foreground">Article body is extracted; nav + footer dropped.</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Input
          id="ingest-url"
          name="url"
          type="url"
          placeholder="https://docs.example.com/getting-started"
          required
          aria-invalid={state.status === 'error' && state.field === 'url'}
        />
        <SubmitButton />
      </div>
      {state.status === 'error' && state.field === 'url' ? (
        <p className="text-xs text-destructive">{state.message}</p>
      ) : null}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant="outline" className="shrink-0">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
      {pending ? 'Adding' : 'Add URL'}
    </Button>
  );
}
