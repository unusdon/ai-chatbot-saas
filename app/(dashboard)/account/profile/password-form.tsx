'use client';

import { KeyRound, Loader2 } from 'lucide-react';
import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { changePasswordAction, type ActionState } from './actions';

const INITIAL: ActionState = { status: 'idle' };

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, formAction] = useActionState(changePasswordAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === 'ok') {
      toast.success(state.message);
      formRef.current?.reset();
    }
    if (state.status === 'error' && !state.field) toast.error(state.message);
  }, [state]);

  if (!hasPassword) {
    return (
      <p className="rounded-md border border-dashed bg-surface-2/50 px-4 py-4 text-sm text-muted-foreground">
        Your account uses OAuth sign-in. Manage your password with your identity provider.
      </p>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.status === 'error' && state.field === 'currentPassword'}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-invalid={state.status === 'error' && state.field === 'newPassword'}
        />
        {state.status === 'error' && state.field === 'newPassword' ? (
          <p className="text-xs text-destructive">{state.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={state.status === 'error' && state.field === 'confirmPassword'}
        />
        {state.status === 'error' && state.field === 'confirmPassword' ? (
          <p className="text-xs text-destructive">{state.message}</p>
        ) : null}
      </div>
      {state.status === 'error' && state.field === 'currentPassword' ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
      {pending ? 'Changing…' : 'Change password'}
    </Button>
  );
}
