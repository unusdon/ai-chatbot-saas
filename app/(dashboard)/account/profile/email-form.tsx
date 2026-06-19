'use client';

import { Loader2, Mail } from 'lucide-react';
import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { updateEmailAction, type ActionState } from './actions';

const INITIAL: ActionState = { status: 'idle' };

export function EmailForm({
  defaultEmail,
  hasPassword,
}: {
  defaultEmail: string;
  hasPassword: boolean;
}) {
  const [state, formAction] = useActionState(updateEmailAction, INITIAL);

  useEffect(() => {
    if (state.status === 'ok') toast.success(state.message);
    if (state.status === 'error' && !state.field) toast.error(state.message);
  }, [state]);

  if (!hasPassword) {
    return (
      <p className="rounded-md border border-dashed bg-surface-2/50 px-4 py-4 text-sm text-muted-foreground">
        You signed up via OAuth. Email changes go through your identity provider.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={defaultEmail}
          required
          aria-invalid={state.status === 'error' && state.field === 'email'}
        />
        {state.status === 'error' && state.field === 'email' ? (
          <p className="text-xs text-destructive">{state.message}</p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword-email">Current password</Label>
        <Input
          id="currentPassword-email"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.status === 'error' && state.field === 'currentPassword'}
        />
        {state.status === 'error' && state.field === 'currentPassword' ? (
          <p className="text-xs text-destructive">{state.message}</p>
        ) : null}
      </div>
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
      {pending ? 'Updating…' : 'Update email'}
    </Button>
  );
}
