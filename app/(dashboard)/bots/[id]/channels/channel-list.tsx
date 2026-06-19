'use client';

import { AlertCircle, CheckCircle2, MessageCircle, Pause, Play, Send, Trash2 } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { BotChannel } from '@/db/schema';

import { deleteChannelAction, toggleChannelActiveAction } from './actions';

export function ChannelList({
  botId,
  channels,
  baseUrl,
}: {
  botId: string;
  channels: BotChannel[];
  baseUrl: string;
}) {
  if (channels.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-soft">
            <Send className="h-5 w-5" />
          </span>
          <h3 className="text-base font-semibold">No channels connected</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Pick Telegram or WhatsApp below to wire this bot up to the messaging platform your
            customers already use.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {channels.map((c) => (
        <ChannelCard key={c.id} channel={c} botId={botId} baseUrl={baseUrl} />
      ))}
    </div>
  );
}

function ChannelCard({
  channel,
  botId,
  baseUrl,
}: {
  channel: BotChannel;
  botId: string;
  baseUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const isTelegram = channel.type === 'telegram';
  const webhookUrl = `${baseUrl}/api/${channel.type}/${channel.id}`;

  function toggle() {
    startTransition(async () => {
      await toggleChannelActiveAction({
        channelId: channel.id,
        botId,
        isActive: !channel.isActive,
      });
      toast.success(channel.isActive ? 'Paused' : 'Resumed');
    });
  }

  return (
    <Card className={!channel.isActive ? 'opacity-70' : ''}>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-md ${
                isTelegram ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {isTelegram ? <Send className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
            </span>
            <div>
              <h3 className="font-semibold capitalize">{channel.type}</h3>
              {channel.externalIdentity ? (
                <p className="text-xs text-muted-foreground">{channel.externalIdentity}</p>
              ) : null}
              {channel.label ? (
                <p className="text-xs text-muted-foreground">{channel.label}</p>
              ) : null}
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              channel.isActive
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {channel.isActive ? 'Live' : 'Paused'}
          </span>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          {channel.lastSeenAt ? (
            <p className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Last message {fmt(channel.lastSeenAt)}
            </p>
          ) : (
            <p className="text-amber-600 dark:text-amber-400">No messages yet</p>
          )}
          {channel.lastError ? (
            <p className="inline-flex items-start gap-1 text-destructive">
              <AlertCircle className="mt-0.5 h-3 w-3" /> {channel.lastError}
            </p>
          ) : null}
        </div>

        <details className="rounded-md border bg-surface-2/50 p-2.5 text-xs">
          <summary className="cursor-pointer font-medium text-foreground">Webhook URL</summary>
          <p className="mt-2 break-all font-mono">{webhookUrl}</p>
        </details>

        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            onClick={toggle}
            title={channel.isActive ? 'Pause' : 'Resume'}
          >
            {channel.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <form
            action={deleteChannelAction}
            onSubmit={(e) => {
              if (!confirm('Disconnect this channel? End-users on it will stop getting replies.')) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="botId" value={botId} />
            <input type="hidden" name="channelId" value={channel.id} />
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              title="Disconnect"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

function fmt(date: Date): string {
  const d = new Date(date);
  const ms = Date.now() - d.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return d.toLocaleDateString();
}
