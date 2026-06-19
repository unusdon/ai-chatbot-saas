import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { BotForm } from '../bot-form';

export const metadata = { title: 'New chatbot' };

export default function NewBotPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
        <Link href="/bots">
          <ArrowLeft className="h-4 w-4" /> All chatbots
        </Link>
      </Button>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">New chatbot</h1>
        <p className="text-sm text-muted-foreground">
          Pick a clear name. You can change the system prompt and upload sources after it&apos;s
          created.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Anything you can change later, you can change later.</CardDescription>
        </CardHeader>
        <CardContent>
          <BotForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
