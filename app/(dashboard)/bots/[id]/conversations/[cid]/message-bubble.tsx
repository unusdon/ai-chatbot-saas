'use client';

import { BookOpenCheck, Bot, Sparkles, User } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { PromoteSheet } from './promote-sheet';
import { UnpromoteButton } from './unpromote-button';

type Citation = { chunkId: string; score: number };

export type MessageBubbleProps = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  citations: Citation[];
  latencyMs: number | null;
  precedingUserContent: string | null;
  promotedDocumentId: string | null;
  botId: string;
  conversationId: string;
};

export function MessageBubble({
  id,
  role,
  content,
  createdAt,
  citations,
  latencyMs,
  precedingUserContent,
  promotedDocumentId,
  botId,
  conversationId,
}: MessageBubbleProps) {
  const [promoteOpen, setPromoteOpen] = useState(false);
  const isUser = role === 'user';
  const isPromoted = Boolean(promotedDocumentId);
  const canPromote = !isUser && precedingUserContent !== null;

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-foreground text-background' : 'bg-secondary text-secondary-foreground'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser ? 'rounded-tr-sm bg-primary text-primary-foreground' : 'rounded-tl-sm border bg-card'
          }`}
        >
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{createdAt.toLocaleString()}</span>
          {latencyMs ? <span>· {latencyMs}ms</span> : null}
          {citations.length > 0 ? (
            <span>
              · {citations.length} citation{citations.length === 1 ? '' : 's'}
            </span>
          ) : null}
          {isPromoted ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 normal-case tracking-normal text-[10px] text-emerald-700 dark:text-emerald-300">
              <BookOpenCheck className="h-3 w-3" /> Trained
            </span>
          ) : null}
        </div>
        {canPromote ? (
          <div className="flex flex-wrap gap-2 px-1 pt-1">
            {isPromoted ? (
              <UnpromoteButton botId={botId} conversationId={conversationId} messageId={id} />
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPromoteOpen(true)}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Sparkles className="h-3 w-3" /> Add to training
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {canPromote && !isPromoted ? (
        <PromoteSheet
          open={promoteOpen}
          onClose={() => setPromoteOpen(false)}
          botId={botId}
          conversationId={conversationId}
          assistantMessageId={id}
          defaultQuestion={precedingUserContent ?? ''}
          defaultAnswer={content}
        />
      ) : null}
    </div>
  );
}
