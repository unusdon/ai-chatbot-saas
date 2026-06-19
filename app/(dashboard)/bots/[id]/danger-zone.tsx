'use client';

import { AlertTriangle, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { deleteBotAction } from '../actions';

export function DangerZone({ botId }: { botId: string }) {
  const [confirm, setConfirm] = useState('');
  const canDelete = confirm === 'delete';

  return (
    <Card className="border-destructive/30">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="space-y-1.5">
          <CardTitle className="text-destructive">Delete this chatbot</CardTitle>
          <CardDescription>
            Removes the bot, its documents, embeddings, conversations, and analytics. Permanent.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form action={deleteBotAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={botId} />
          <div className="space-y-1.5">
            <Label htmlFor="delete-confirm">
              Type <code className="font-mono text-xs">delete</code> to confirm
            </Label>
            <Input
              id="delete-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              placeholder="delete"
              className="max-w-xs"
            />
          </div>
          <Button type="submit" variant="destructive" disabled={!canDelete} className="w-fit">
            <Trash2 className="h-4 w-4" /> Delete permanently
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
