import { Bot as BotIcon, Plus } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listBotsForUser } from '@/lib/server/bots';
import { requireAuth } from '@/lib/server/require-auth';

export const metadata = { title: 'Chatbots' };
export const dynamic = 'force-dynamic';

export default async function BotsPage() {
  const user = await requireAuth();
  const bots = await listBotsForUser(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Your chatbots</h1>
          <p className="text-sm text-muted-foreground">
            One bot per use-case. Upload your docs to each, then embed the widget anywhere.
          </p>
        </div>
        <Button asChild>
          <Link href="/bots/new">
            <Plus className="mr-2 h-4 w-4" /> New chatbot
          </Link>
        </Button>
      </div>

      {bots.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <Link key={bot.id} href={`/bots/${bot.id}`} className="group">
              <Card className="h-full transition-colors group-hover:border-foreground/30">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{bot.name}</CardTitle>
                    <Badge variant={bot.isActive ? 'success' : 'secondary'}>
                      {bot.isActive ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <CardDescription>
                    Created {bot.createdAt.toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{bot.systemPrompt}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="rounded-full bg-muted p-4">
          <BotIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="font-semibold">No chatbots yet</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Each chatbot is a separate knowledge base. Create one for your product docs, another for your
          help center, and so on.
        </p>
        <Button asChild className="mt-2">
          <Link href="/bots/new">
            <Plus className="mr-2 h-4 w-4" /> Create your first chatbot
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
