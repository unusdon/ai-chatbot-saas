'use client';

import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { deleteAccountAction } from './actions';

export function DeleteAccountCard({ hasPassword }: { hasPassword: boolean }) {
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [pending, startTransition] = useTransition();

  const PHRASE = 'delete my account';
  const canSubmit = confirm === PHRASE && (!hasPassword || password.length > 0);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('confirm', confirm);
      if (hasPassword) fd.set('currentPassword', password);
      try {
        const result = await deleteAccountAction(fd);
        if (result && result.status === 'error') toast.error(result.message);
      } catch (error) {
        // redirect() throws — that's the success path
        if (!(error instanceof Error) || !/NEXT_REDIRECT/.test(error.message)) {
          toast.error(error instanceof Error ? error.message : 'Delete failed');
        }
      }
    });
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="space-y-1.5">
          <CardTitle className="text-destructive">Delete account</CardTitle>
          <CardDescription>
            Removes your user record, all chatbots, sources, conversations, and audit history.
            Permanent.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="delete-confirm">
              Type <code className="font-mono text-xs">{PHRASE}</code> to confirm
            </Label>
            <Input
              id="delete-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              placeholder={PHRASE}
              className="max-w-md"
            />
          </div>
          {hasPassword ? (
            <div className="space-y-1.5">
              <Label htmlFor="delete-password">Current password</Label>
              <Input
                id="delete-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="max-w-md"
              />
            </div>
          ) : null}
          <Button type="submit" variant="destructive" disabled={!canSubmit || pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {pending ? 'Deleting…' : 'Delete my account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
