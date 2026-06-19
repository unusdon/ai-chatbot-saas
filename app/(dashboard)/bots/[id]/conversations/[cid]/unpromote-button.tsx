'use client';

import { BookMinus } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { unpromoteMessageAction } from '../actions';

export function UnpromoteButton({
  botId,
  conversationId,
  messageId,
}: {
  botId: string;
  conversationId: string;
  messageId: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm('Remove the training Q&A this message produced?')) return;
        startTransition(async () => {
          const res = await unpromoteMessageAction({ botId, conversationId, messageId });
          if (res.ok) toast.success('Removed from training');
          else toast.error('Could not remove');
        });
      }}
    >
      <BookMinus className="h-3 w-3" /> Remove from training
    </Button>
  );
}
