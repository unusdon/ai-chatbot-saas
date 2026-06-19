'use client';

import { Loader2, UserPlus } from 'lucide-react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { signupAction, type SignupState } from './actions';

const initialState: SignupState = { status: 'idle' };

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <Field
        id="name"
        label="Full name"
        type="text"
        autoComplete="name"
        required
        autoFocus
        placeholder="Ada Lovelace"
        error={state.status === 'error' && state.field === 'name' ? state.message : undefined}
      />
      <Field
        id="email"
        label="Work email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@company.com"
        error={state.status === 'error' && state.field === 'email' ? state.message : undefined}
      />
      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        placeholder="At least 8 characters"
        helper="Use a passphrase you'll actually remember."
        error={state.status === 'error' && state.field === 'password' ? state.message : undefined}
      />
      {state.status === 'error' && !state.field ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

function Field({
  id,
  label,
  helper,
  error,
  ...inputProps
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  helper?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} aria-invalid={Boolean(error)} {...inputProps} />
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : helper ? (
        <p className="text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="lg" className="w-full">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
      {pending ? 'Creating account…' : 'Create account'}
    </Button>
  );
}
