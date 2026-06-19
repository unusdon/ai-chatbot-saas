import {
  ArrowLeft,
  Clock,
  Download,
  Flag,
  Globe,
  Monitor,
  User,
} from 'lucide-react';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getBotForUser } from '@/lib/server/bots';
import { getConversationDetail } from '@/lib/server/conversations';
import { parseUserAgent } from '@/lib/server/parse-ua';
import { requireAuth } from '@/lib/server/require-auth';

import { ConversationActions } from './conversation-actions';
import { DeleteConversationButton } from './delete-conversation-button';
import { MessageBubble } from './message-bubble';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string; cid: string }> }) {
  const { cid } = await params;
  return { title: `Conversation · ${cid.slice(0, 8)}` };
}

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string; cid: string }>;
}) {
  const { id, cid } = await params;
  const user = await requireAuth();
  const bot = await getBotForUser(user.id, id);
  if (!bot) notFound();
  const detail = await getConversationDetail(user.id, cid);
  if (!detail) notFound();

  const { conversation, messages } = detail;
  const ua = parseUserAgent(conversation.userAgent);
  const duration = computeDuration(conversation.createdAt, conversation.lastMessageAt);

  // Walk the transcript and map every assistant message to its immediately
  // preceding user message so the "Add to training" button can pre-fill both
  // sides of the Q&A pair.
  const precedingMap = new Map<string, string>();
  let lastUserContent: string | null = null;
  for (const m of messages) {
    if (m.role === 'user') {
      lastUserContent = m.content;
    } else if (m.role === 'assistant' && lastUserContent) {
      precedingMap.set(m.id, lastUserContent);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href={`/bots/${bot.id}/conversations`}>
            <ArrowLeft className="h-4 w-4" /> All conversations
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight">Conversation</h1>
            <p className="font-mono text-xs text-muted-foreground">{conversation.id}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/bots/${bot.id}/conversations/${conversation.id}/export`} download>
                <Download className="h-4 w-4" /> Export JSON
              </a>
            </Button>
            <ConversationActions botId={bot.id} conversation={conversation} />
            <DeleteConversationButton botId={bot.id} conversationId={conversation.id} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Transcript ({messages.length} message{messages.length === 1 ? '' : 's'})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {messages.length === 0 ? (
              <p className="rounded-md border border-dashed bg-surface-2/50 px-4 py-8 text-center text-sm text-muted-foreground">
                No messages in this conversation yet.
              </p>
            ) : (
              messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  id={m.id}
                  role={m.role as 'user' | 'assistant'}
                  content={m.content}
                  createdAt={m.createdAt}
                  citations={(m.citations as Array<{ chunkId: string; score: number }>) ?? []}
                  latencyMs={m.latencyMs}
                  precedingUserContent={precedingMap.get(m.id) ?? null}
                  promotedDocumentId={m.promotedDocumentId}
                  botId={bot.id}
                  conversationId={conversation.id}
                />
              ))
            )}
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Session details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row icon={<User className="h-4 w-4" />} label="End-user id">
                <span className="font-mono text-xs">{conversation.endUserId ?? 'anonymous'}</span>
              </Row>
              <Row icon={<Monitor className="h-4 w-4" />} label="Device">
                {ua.browser} on {ua.os}
                <span className="block text-xs uppercase tracking-wider text-muted-foreground">{ua.type}</span>
              </Row>
              <Row icon={<Globe className="h-4 w-4" />} label="IP address">
                {conversation.ipAddress ?? '—'}
              </Row>
              {conversation.referrer ? (
                <Row icon={<Globe className="h-4 w-4" />} label="Referrer">
                  <a href={conversation.referrer} target="_blank" rel="noreferrer" className="break-all text-xs underline-offset-4 hover:underline">
                    {conversation.referrer}
                  </a>
                </Row>
              ) : null}
              <Row icon={<Clock className="h-4 w-4" />} label="Started">
                {conversation.createdAt.toLocaleString()}
              </Row>
              <Row icon={<Clock className="h-4 w-4" />} label="Last active">
                {conversation.lastMessageAt.toLocaleString()}
              </Row>
              <Row icon={<Clock className="h-4 w-4" />} label="Duration">
                {duration}
              </Row>
              {conversation.flag ? (
                <Row icon={<Flag className="h-4 w-4" />} label="Flag">
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    {conversation.flag}
                  </span>
                </Row>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="break-words">{children}</div>
      </div>
    </div>
  );
}

function computeDuration(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}
