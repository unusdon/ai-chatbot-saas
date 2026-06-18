import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { BotForm } from '../bot-form';

export const metadata = { title: 'New chatbot' };

export default function NewBotPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/bots">← All chatbots</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>New chatbot</CardTitle>
          <CardDescription>
            Give your bot a clear name. You can change the system prompt and upload sources after it&apos;s
            created.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BotForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
