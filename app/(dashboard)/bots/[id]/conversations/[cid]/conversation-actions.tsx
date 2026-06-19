'use client';

import { Archive, ArchiveRestore, Flag, Star } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import type { Conversation } from '@/db/schema';

import {
  setConversationArchivedAction,
  setConversationFlagAction,
} from '../actions';

export function ConversationActions({
  botId,
  conversation,
}: {
  botId: string;
  conversation: Conversation;
}) {
  const [pending, startTransition] = useTransition();

  function flag(value: 'review' | 'abuse' | 'star' | 'spam' | null) {
    startTransition(async () => {
      await setConversationFlagAction({ botId, conversationId: conversation.id, flag: value });
      toast.success(value ? `Flagged as ${value}` : 'Flag cleared');
    });
  }

  function archive(next: boolean) {
    startTransition(async () => {
      await setConversationArchivedAction({ botId, conversationId: conversation.id, archived: next });
      toast.success(next ? 'Archived' : 'Restored');
    });
  }

  const isFlagged = Boolean(conversation.flag);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => (conversation.flag === 'star' ? flag(null) : flag('star'))}
      >
        <Star className={`h-4 w-4 ${conversation.flag === 'star' ? 'fill-amber-400 text-amber-500' : ''}`} />
        {conversation.flag === 'star' ? 'Starred' : 'Star'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => (conversation.flag === 'review' ? flag(null) : flag('review'))}
      >
        <Flag className="h-4 w-4" />
        {conversation.flag === 'review' ? 'Reviewing' : 'Flag for review'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => archive(!conversation.isArchived)}
      >
        {conversation.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
        {conversation.isArchived ? 'Restore' : 'Archive'}
      </Button>
      {isFlagged ? (
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => flag(null)} className="text-muted-foreground">
          Clear flag
        </Button>
      ) : null}
    </>
  );
}
