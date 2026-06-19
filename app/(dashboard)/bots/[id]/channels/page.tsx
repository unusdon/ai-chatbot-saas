import { ArrowLeft, Plug, Send } from 'lucide-react';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getBotForUser } from '@/lib/server/bots';
import { listChannelsForBot } from '@/lib/server/channels';
import { env } from '@/lib/env';
import { requireAuth } from '@/lib/server/require-auth';

import { ChannelList } from './channel-list';
import { TelegramAddForm } from './telegram-add-form';
import { WhatsappAddForm } from './whatsapp-add-form';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const bot = await getBotForUser(user.id, id);
  return { title: bot ? `Channels · ${bot.name}` : 'Channels' };
}

export default async function ChannelsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const bot = await getBotForUser(user.id, id);
  if (!bot) notFound();

  const channels = await listChannelsForBot(user.id, bot.id);
  const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href={`/bots/${bot.id}`}>
            <ArrowLeft className="h-4 w-4" /> Back to {bot.name}
          </Link>
        </Button>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Channels</h1>
          <p className="text-sm text-muted-foreground">
            Connect your bot to Telegram (private + groups) or WhatsApp (1-to-1). Same knowledge base,
            same conversation admin.
          </p>
        </div>
      </div>

      <ChannelList botId={bot.id} channels={channels} baseUrl={baseUrl} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-4 w-4" /> Add a channel
          </CardTitle>
          <CardDescription>
            Each channel routes messages through the same RAG pipeline. Conversations from every
            channel show up in the Conversations admin alongside web-widget chats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="telegram">
            <TabsList className="h-9">
              <TabsTrigger value="telegram" className="px-4 text-sm">
                <Send className="h-3.5 w-3.5" /> Telegram
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="px-4 text-sm">
                <Send className="h-3.5 w-3.5" /> WhatsApp
              </TabsTrigger>
            </TabsList>
            <TabsContent value="telegram">
              <TelegramAddForm botId={bot.id} />
            </TabsContent>
            <TabsContent value="whatsapp">
              <WhatsappAddForm botId={bot.id} baseUrl={baseUrl} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
