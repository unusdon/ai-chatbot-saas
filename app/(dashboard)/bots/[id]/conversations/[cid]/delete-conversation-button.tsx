'use client';

import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { deleteConversationAction } from '../actions';

export function DeleteConversationButton({
  botId,
  conversationId,
}: {
  botId: string;
  conversationId: string;
}) {
  return (
    <form
      action={deleteConversationAction}
      onSubmit={(e) => {
        if (!confirm('Delete this conversation? This is permanent.')) e.preventDefault();
      }}
    >
      <input type="hidden" name="botId" value={botId} />
      <input type="hidden" name="conversationId" value={conversationId} />
      <Button type="submit" variant="destructive" size="sm">
        <Trash2 className="h-4 w-4" /> Delete
      </Button>
    </form>
  );
}
