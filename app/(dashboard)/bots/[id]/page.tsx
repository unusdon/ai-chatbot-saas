import { notFound } from 'next/navigation';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
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
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/bots">← All chatbots</Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{bot.name}</h1>
          <p className="text-sm text-muted-foreground">
            Created {bot.createdAt.toLocaleDateString()} · Last updated{' '}
            {bot.updatedAt.toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={bot.isActive ? 'success' : 'secondary'}>
            {bot.isActive ? 'Active' : 'Paused'}
          </Badge>
          <Button asChild>
            <Link href={`/bots/${bot.id}/chat`}>Open playground</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Name and system prompt control how this bot responds.</CardDescription>
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
