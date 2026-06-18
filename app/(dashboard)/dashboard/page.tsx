import { Bot, FileText, MessageSquare, Plus } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listBotsForUser } from '@/lib/server/bots';
import { requireAuth } from '@/lib/server/require-auth';

export const metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireAuth();
  const displayName = user.name?.split(' ')[0] ?? 'there';
  const bots = await listBotsForUser(user.id);
  const isEmpty = bots.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {displayName}</h1>
          <p className="text-muted-foreground">
            {isEmpty
              ? "You haven't built any chatbots yet. Create your first one to get started."
              : `You have ${bots.length} chatbot${bots.length === 1 ? '' : 's'}.`}
          </p>
        </div>
        <Button asChild>
          <Link href="/bots/new">
            <Plus className="mr-2 h-4 w-4" /> New chatbot
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={<Bot className="h-4 w-4" />} label="Chatbots" value={String(bots.length)} />
        <Stat icon={<FileText className="h-4 w-4" />} label="Documents" value="0" />
        <Stat icon={<MessageSquare className="h-4 w-4" />} label="Conversations" value="0" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEmpty ? "What's next" : 'Your chatbots'}</CardTitle>
          <CardDescription>
            {isEmpty
              ? 'Create a chatbot, upload your content, then embed the widget on any site.'
              : 'Jump back into a chatbot or create another.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/bots">{isEmpty ? 'Create a chatbot' : 'View all chatbots'}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="https://github.com/cyberunite/ai-chatbot-saas#roadmap" target="_blank">
              View roadmap
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
