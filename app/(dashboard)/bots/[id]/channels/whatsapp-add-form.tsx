'use client';

import { ExternalLink, Loader2, MessageCircle } from 'lucide-react';
import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { createWhatsappChannelAction, type ActionState } from './actions';

const INITIAL: ActionState = { status: 'idle' };

export function WhatsappAddForm({ botId, baseUrl }: { botId: string; baseUrl: string }) {
  const [state, formAction] = useActionState(createWhatsappChannelAction, INITIAL);
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
          1. Go to the{' '}
          <a
            href="https://developers.facebook.com/apps/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Meta App Dashboard
            <ExternalLink className="ml-0.5 inline h-2.5 w-2.5" />
          </a>
          , create an app, add the <strong>WhatsApp</strong> product. Get your{' '}
          <strong>Phone Number ID</strong>, <strong>System User Access Token</strong>, and{' '}
          <strong>App Secret</strong>.
        </li>
        <li>
          2. Paste them below and save — we&apos;ll mint a verify token for the webhook.
        </li>
        <li>
          3. Back in Meta dashboard: <strong>WhatsApp → Configuration → Webhook</strong>. Use the
          webhook URL and verify token shown on the channel card after saving. Subscribe to{' '}
          <code className="font-mono">messages</code>.
        </li>
        <li>
          ⚠️ WhatsApp Cloud API is <strong>1-to-1 only</strong> — Meta does not support bots in
          WhatsApp Groups. Use Telegram for groups.
        </li>
      </ol>

      <form ref={formRef} action={formAction} className="space-y-4">
        <input type="hidden" name="botId" value={botId} />
        <div className="space-y-1.5">
          <Label htmlFor="phoneNumberId">Phone Number ID</Label>
          <Input
            id="phoneNumberId"
            name="phoneNumberId"
            placeholder="123456789012345"
            required
            autoComplete="off"
            aria-invalid={state.status === 'error' && state.field === 'phoneNumberId'}
          />
          <p className="text-xs text-muted-foreground">
            Found in Meta dashboard → WhatsApp → API Setup. Numeric, not the phone number itself.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="accessToken">System User Access Token</Label>
          <Input
            id="accessToken"
            name="accessToken"
            type="password"
            placeholder="EAAGm0PX4ZCpsBA..."
            required
            autoComplete="off"
            aria-invalid={state.status === 'error' && state.field === 'accessToken'}
          />
          <p className="text-xs text-muted-foreground">
            Long-lived token. Treat like a password.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="appSecret">App Secret</Label>
          <Input
            id="appSecret"
            name="appSecret"
            type="password"
            placeholder="abcdef0123456789..."
            required
            autoComplete="off"
            aria-invalid={state.status === 'error' && state.field === 'appSecret'}
          />
          <p className="text-xs text-muted-foreground">
            From Meta App Dashboard → Settings → Basic → App Secret. Used to verify webhook signatures.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wa-label">Label (optional)</Label>
          <Input id="wa-label" name="label" placeholder="e.g. Sales WA bot" maxLength={120} />
        </div>

        <div className="rounded-md border bg-surface-2/50 p-3 text-xs text-muted-foreground">
          After saving, your webhook URL will be:{' '}
          <code className="break-all font-mono text-foreground">
            {baseUrl}/api/whatsapp/{'<channelId>'}
          </code>
          . Paste it (and the generated verify token) into Meta&apos;s webhook config.
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
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
      {pending ? 'Saving…' : 'Save WhatsApp config'}
    </Button>
  );
}
