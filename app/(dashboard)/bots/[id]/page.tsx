import { ArrowLeft, BarChart3, MessageSquare } from 'lucide-react';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getBotForUser } from '@/lib/server/bots';
import { listDocumentsForBot } from '@/lib/server/documents';
import { requireAuth } from '@/lib/server/require-auth';

import { BotForm } from '../bot-form';
import { DangerZone } from './danger-zone';
import { DocumentsCard } from './documents-card';
import { EmbedSnippet } from './embed-snippet';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const bot = await getBotForUser(user.id, id);
  return { title: bot?.name ?? 'Chatbot' };
}

export default async function BotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const bot = await getBotForUser(user.id, id);
  if (!bot) notFound();

  const docs = await listDocumentsForBot(user.id, bot.id);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href="/bots">
            <ArrowLeft className="h-4 w-4" /> All chatbots
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{bot.name}</h1>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  bot.isActive
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {bot.isActive ? 'Active' : 'Paused'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Created {bot.createdAt.toLocaleDateString()} · Last updated{' '}
              {bot.updatedAt.toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/bots/${bot.id}/analytics`}>
                <BarChart3 className="h-4 w-4" /> Analytics
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/bots/${bot.id}/chat`}>
                <MessageSquare className="h-4 w-4" /> Open playground
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Name + system prompt control how this bot responds.</CardDescription>
        </CardHeader>
        <CardContent>
          <BotForm mode="edit" bot={{ id: bot.id, name: bot.name, systemPrompt: bot.systemPrompt }} />
        </CardContent>
      </Card>

      <DocumentsCard botId={bot.id} documents={docs} />

      <EmbedSnippet botId={bot.id} publicKey={bot.publicKey} />

      <DangerZone botId={bot.id} />
    </div>
  );
}
