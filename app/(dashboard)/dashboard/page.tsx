import { Bot, FileText, MessageSquare, Plus } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/auth';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const session = await auth();
  const displayName = session?.user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {displayName}</h1>
          <p className="text-muted-foreground">
            You haven&apos;t built any chatbots yet. Create your first one to get started.
          </p>
        </div>
        <Button disabled title="Bot creation ships in Milestone 2">
          <Plus className="mr-2 h-4 w-4" /> New chatbot
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={<Bot className="h-4 w-4" />} label="Chatbots" value="0" />
        <Stat icon={<FileText className="h-4 w-4" />} label="Documents" value="0" />
        <Stat icon={<MessageSquare className="h-4 w-4" />} label="Conversations" value="0" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What&apos;s next</CardTitle>
          <CardDescription>
            Milestone 1 ships auth and the dashboard shell. The next milestones add bot creation,
            document ingestion, RAG chat, and the embed widget.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="https://github.com/cyberunite/ai-chatbot-saas#roadmap" target="_blank">
              View roadmap
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link
              href="https://github.com/cyberunite/ai-chatbot-saas/blob/main/CONTRIBUTING.md"
              target="_blank"
            >
              Contribute
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
