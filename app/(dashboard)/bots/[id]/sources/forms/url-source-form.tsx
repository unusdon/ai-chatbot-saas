'use client';

import { Globe, Loader2 } from 'lucide-react';
import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { ingestUrlAction, type DocumentActionState } from '../../documents/actions';

const INITIAL: DocumentActionState = { status: 'idle' };

export function UrlSourceForm({ botId }: { botId: string }) {
  const [state, formAction] = useActionState(ingestUrlAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === 'ok') {
      toast.success(state.message);
      formRef.current?.reset();
    }
    if (state.status === 'error' && !state.field) toast.error(state.message);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-4 w-4" /> Single URL
        </CardTitle>
        <CardDescription>
          Fetch the page, extract the article body (nav and footer stripped), embed it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="botId" value={botId} />
          <div className="space-y-1.5">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              name="url"
              type="url"
              placeholder="https://docs.example.com/getting-started"
              required
              aria-invalid={state.status === 'error' && state.field === 'url'}
            />
            {state.status === 'error' && state.field === 'url' ? (
              <p className="text-xs text-destructive">{state.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title (optional)</Label>
            <Input id="title" name="title" placeholder="Defaults to the URL" />
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
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
      {pending ? 'Adding…' : 'Add URL'}
    </Button>
  );
}
