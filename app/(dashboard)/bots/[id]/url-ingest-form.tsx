'use client';

import { Link as LinkIcon } from 'lucide-react';
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
    <form action={formAction} className="flex flex-col gap-1.5 rounded-md border bg-card p-4">
      <input type="hidden" name="botId" value={botId} />
      <Label htmlFor="ingest-url" className="text-sm font-semibold">
        Add a URL
      </Label>
      <p className="text-xs text-muted-foreground">
        The worker fetches the page, extracts main content, and embeds it.
      </p>
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
      <LinkIcon className="mr-2 h-4 w-4" /> {pending ? 'Adding…' : 'Add URL'}
    </Button>
  );
}
