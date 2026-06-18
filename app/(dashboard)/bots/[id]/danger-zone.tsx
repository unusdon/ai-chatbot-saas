'use client';

import { Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { deleteBotAction } from '../actions';

export function DangerZone({ botId }: { botId: string }) {
  const [confirm, setConfirm] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const canDelete = confirm === 'delete';

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive">Delete this chatbot</CardTitle>
        <CardDescription>
          Deleting a chatbot removes its documents, conversations, and embeddings. This is irreversible.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={deleteBotAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={botId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delete-confirm">
              Type <span className="font-mono">delete</span> to confirm
            </Label>
            <Input
              id="delete-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              placeholder="delete"
            />
          </div>
          <Button type="submit" variant="destructive" disabled={!canDelete} className="w-fit">
            <Trash2 className="mr-2 h-4 w-4" /> Delete chatbot permanently
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
