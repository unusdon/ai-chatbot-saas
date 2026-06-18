'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { createBotAction, updateBotAction, type BotActionState } from './actions';

const initial: BotActionState = { status: 'idle' };

type Props =
  | { mode: 'create' }
  | { mode: 'edit'; bot: { id: string; name: string; systemPrompt: string } };

export function BotForm(props: Props) {
  const action = props.mode === 'create' ? createBotAction : updateBotAction;
  const [state, formAction] = useActionState(action, initial);

  useEffect(() => {
    if (state.status === 'ok') toast.success(state.message);
    if (state.status === 'error' && !state.field) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {props.mode === 'edit' ? <input type="hidden" name="id" value={props.bot.id} /> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={120}
          defaultValue={props.mode === 'edit' ? props.bot.name : ''}
          placeholder="e.g. Acme Help Center"
          aria-invalid={state.status === 'error' && state.field === 'name'}
        />
        {state.status === 'error' && state.field === 'name' ? (
          <p className="text-sm text-destructive">{state.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="systemPrompt">System prompt</Label>
        <Textarea
          id="systemPrompt"
          name="systemPrompt"
          rows={6}
          maxLength={8000}
          defaultValue={props.mode === 'edit' ? props.bot.systemPrompt : ''}
          placeholder="You are a helpful assistant for Acme. Answer using only the provided context…"
          aria-invalid={state.status === 'error' && state.field === 'systemPrompt'}
        />
        {state.status === 'error' && state.field === 'systemPrompt' ? (
          <p className="text-sm text-destructive">{state.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Leave blank to use the default RAG-friendly prompt.
          </p>
        )}
      </div>

      <SubmitButton mode={props.mode} />
    </form>
  );
}

function SubmitButton({ mode }: { mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus();
  const labels = {
    create: { idle: 'Create chatbot', pending: 'Creating…' },
    edit: { idle: 'Save changes', pending: 'Saving…' },
  } as const;
  return (
    <Button type="submit" disabled={pending}>
      {pending ? labels[mode].pending : labels[mode].idle}
    </Button>
  );
}
