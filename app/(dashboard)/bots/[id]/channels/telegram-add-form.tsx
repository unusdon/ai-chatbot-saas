'use client';

import { CheckCircle2, ExternalLink, Loader2, Send } from 'lucide-react';
import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { createTelegramChannelAction, type ActionState } from './actions';

const INITIAL: ActionState = { status: 'idle' };

export function TelegramAddForm({ botId }: { botId: string }) {
  const [state, formAction] = useActionState(createTelegramChannelAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === 'ok') {
      toast.success(state.message);
      formRef.current?.reset();
    }
    if (state.status === 'error' && !state.field) toast.error(state.message);
  }, [state]);

  return (
    <div className="space-y-5">
      <ol className="space-y-2 rounded-md border bg-surface-2/50 p-4 text-xs">
        <li>
          1. Open{' '}
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            @BotFather
            <ExternalLink className="ml-0.5 inline h-2.5 w-2.5" />
          </a>{' '}
          in Telegram and run <code className="font-mono">/newbot</code>. Follow the prompts; copy the
          token it gives you.
        </li>
        <li>
          2. Paste the token below. We&apos;ll verify it, register a webhook, and start receiving messages
          immediately.
        </li>
        <li>
          3. For groups: add the bot to your group. In <strong>mention</strong> mode (default) it
          responds only when you write <code className="font-mono">@yourbotname</code>.
        </li>
      </ol>

      <form ref={formRef} action={formAction} className="space-y-4">
        <input type="hidden" name="botId" value={botId} />
        <div className="space-y-1.5">
          <Label htmlFor="botToken">Bot token</Label>
          <Input
            id="botToken"
            name="botToken"
            placeholder="123456789:ABCdefGhIJKlmnoPQRsTUVwxyZ1234567890"
            required
            autoComplete="off"
            type="password"
            aria-invalid={state.status === 'error' && state.field === 'botToken'}
          />
          {state.status === 'error' && state.field === 'botToken' ? (
            <p className="text-xs text-destructive">{state.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Treat this like a password — anyone with it can post as your bot.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="groupMode">Group response mode</Label>
          <select
            id="groupMode"
            name="groupMode"
            defaultValue="mention"
            className="flex h-10 w-full max-w-md rounded-md border bg-background px-3 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="mention">Mention only — respond when @botname is in the message (recommended)</option>
            <option value="reply">Reply only — respond when a user replies to my bot&apos;s message</option>
            <option value="all">All messages — respond to every message in the group (chatty)</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Private chats always respond — this setting only applies to groups.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="label">Label (optional)</Label>
          <Input
            id="label"
            name="label"
            placeholder="e.g. Support bot"
            maxLength={120}
          />
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      {pending ? 'Connecting…' : 'Connect Telegram'}
    </Button>
  );
}
