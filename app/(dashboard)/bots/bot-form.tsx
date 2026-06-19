'use client';

import { Loader2, Save, Sparkles } from 'lucide-react';
import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

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
    <form action={formAction} className="space-y-5">
      {props.mode === 'edit' ? <input type="hidden" name="id" value={props.bot.id} /> : null}

      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={120}
          autoFocus={props.mode === 'create'}
          defaultValue={props.mode === 'edit' ? props.bot.name : ''}
          placeholder="e.g. Acme Help Center"
          aria-invalid={state.status === 'error' && state.field === 'name'}
        />
        {state.status === 'error' && state.field === 'name' ? (
          <p className="text-sm text-destructive">{state.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Shown in the embed widget header and analytics.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="systemPrompt">System prompt</Label>
        <Textarea
          id="systemPrompt"
          name="systemPrompt"
          rows={6}
          maxLength={8000}
          defaultValue={props.mode === 'edit' ? props.bot.systemPrompt : ''}
          placeholder="You are a helpful assistant for Acme. Answer only from the provided context…"
          aria-invalid={state.status === 'error' && state.field === 'systemPrompt'}
        />
        {state.status === 'error' && state.field === 'systemPrompt' ? (
          <p className="text-sm text-destructive">{state.message}</p>
        ) : (
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Leave blank to use the default RAG-friendly prompt.
          </p>
        )}
      </div>

      <SubmitButton mode={props.mode} />
    </form>
  );
}

function SubmitButton({ mode }: { mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="lg" className="w-full sm:w-auto">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {mode === 'create' ? (pending ? 'Creating…' : 'Create chatbot') : (pending ? 'Saving…' : 'Save changes')}
    </Button>
  );
}
