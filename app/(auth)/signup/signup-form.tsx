'use client';

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
    <form action={formAction} className="flex flex-col gap-4">
      <Field
        id="name"
        label="Full name"
        type="text"
        autoComplete="name"
        required
        error={state.status === 'error' && state.field === 'name' ? state.message : undefined}
      />
      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        error={state.status === 'error' && state.field === 'email' ? state.message : undefined}
      />
      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        error={state.status === 'error' && state.field === 'password' ? state.message : undefined}
        helper="Minimum 8 characters."
      />
      {state.status === 'error' && !state.field ? (
        <p className="text-sm text-destructive" role="alert">
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
    <div className="flex flex-col gap-1.5">
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
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Creating account…' : 'Create account'}
    </Button>
  );
}
