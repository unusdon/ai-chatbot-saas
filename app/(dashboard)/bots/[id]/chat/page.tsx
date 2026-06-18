import { notFound } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getBotForUser } from '@/lib/server/bots';
import { getOrCreateDashboardConversation, listMessages } from '@/lib/server/conversations';
import { requireAuth } from '@/lib/server/require-auth';

import { ChatPlayground } from './chat-playground';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const bot = await getBotForUser(user.id, id);
  return { title: bot ? `Chat with ${bot.name}` : 'Chat' };
}

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const bot = await getBotForUser(user.id, id);
  if (!bot) notFound();

  const conversation = await getOrCreateDashboardConversation(user.id, bot.id);
  const prior = await listMessages(conversation.id);
  const initialMessages = prior.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    citations: (m.citations ?? []) as Array<{ chunkId: string; score: number }>,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/bots/${bot.id}`}>← Back to {bot.name}</Link>
          </Button>
          <h1 className="mt-2 text-2xl font-bold">Chat with {bot.name}</h1>
          <p className="text-sm text-muted-foreground">
            This playground uses the same RAG pipeline your embed widget will. Answers are grounded
            in this bot&apos;s sources only.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Playground</CardTitle>
          <CardDescription>
            Conversation is saved per-bot for your account. Clear it anytime.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ChatPlayground botId={bot.id} initialMessages={initialMessages} />
        </CardContent>
      </Card>
    </div>
  );
}
