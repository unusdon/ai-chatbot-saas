'use client';

import { Loader2, Save } from 'lucide-react';
import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { updateProfileAction, type ActionState } from './actions';

const INITIAL: ActionState = { status: 'idle' };

export function ProfileForm({ defaultName }: { defaultName: string }) {
  const [state, formAction] = useActionState(updateProfileAction, INITIAL);

  useEffect(() => {
    if (state.status === 'ok') toast.success(state.message);
    if (state.status === 'error' && !state.field) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultName}
          required
          maxLength={120}
          aria-invalid={state.status === 'error' && state.field === 'name'}
        />
        {state.status === 'error' && state.field === 'name' ? (
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
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {pending ? 'Saving…' : 'Save name'}
    </Button>
  );
}
