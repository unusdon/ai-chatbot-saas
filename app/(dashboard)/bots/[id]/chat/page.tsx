import { ArrowLeft, Settings2 } from 'lucide-react';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getBotForUser } from '@/lib/server/bots';
import { getOrCreateDashboardConversation, listMessages } from '@/lib/server/conversations';
import { requireAuth } from '@/lib/server/require-auth';

import { ChatPlayground } from './chat-playground';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const bot = await getBotForUser(user.id, id);
  return { title: bot ? `Chat · ${bot.name}` : 'Chat' };
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
    <div className="space-y-6">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href={`/bots/${bot.id}`}>
            <ArrowLeft className="h-4 w-4" /> Back to {bot.name}
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Playground</h1>
            <p className="text-sm text-muted-foreground">
              This uses the same RAG pipeline as your embed widget. Answers are grounded in this
              bot&apos;s sources only.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/bots/${bot.id}`}>
              <Settings2 className="h-4 w-4" /> Settings
            </Link>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <ChatPlayground botId={bot.id} initialMessages={initialMessages} />
        </CardContent>
      </Card>
    </div>
  );
}
