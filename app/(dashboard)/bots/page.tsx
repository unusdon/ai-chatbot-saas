import { ArrowRight, Bot as BotIcon, Plus, Search } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { listBotsForUser } from '@/lib/server/bots';
import { requireAuth } from '@/lib/server/require-auth';

export const metadata = { title: 'Chatbots' };
export const dynamic = 'force-dynamic';

export default async function BotsPage() {
  const user = await requireAuth();
  const bots = await listBotsForUser(user.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Chatbots</h1>
          <p className="text-sm text-muted-foreground">
            One bot per use-case. Upload sources, embed the widget anywhere.
          </p>
        </div>
        <Button asChild>
          <Link href="/bots/new">
            <Plus className="h-4 w-4" /> New chatbot
          </Link>
        </Button>
      </div>

      {bots.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {bots.map((bot) => (
            <Link key={bot.id} href={`/bots/${bot.id}`} className="group block">
              <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-elevated">
                <CardContent className="flex h-full flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
                      <BotIcon className="h-4 w-4" />
                    </span>
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
                  <div className="space-y-1.5">
                    <h2 className="text-base font-semibold leading-snug">{bot.name}</h2>
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{bot.systemPrompt}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span>Created {bot.createdAt.toLocaleDateString()}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
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
      <CardContent className="flex flex-col items-center gap-4 py-20 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-soft">
          <Search className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">No chatbots yet</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Each chatbot is a separate knowledge base. Create one for your product docs, another for
            help articles, another for internal Q&amp;A. They share nothing.
          </p>
        </div>
        <Button asChild>
          <Link href="/bots/new">
            <Plus className="h-4 w-4" /> Create your first chatbot
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
