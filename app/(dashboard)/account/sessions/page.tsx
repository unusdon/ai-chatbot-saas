import { LogOut, Monitor, Shield, ShieldOff, Smartphone, Tablet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { parseUserAgent } from '@/lib/server/parse-ua';
import { requireAuth } from '@/lib/server/require-auth';
import { listSessionsForUser } from '@/lib/server/sessions';

import { revokeAllOtherSessionsAction, revokeSessionAction } from './actions';

export const metadata = { title: 'Sessions' };
export const dynamic = 'force-dynamic';

export default async function SessionsPage() {
  const user = await requireAuth();
  const session = await auth();
  const currentSid = session?.sid ?? null;
  const sessions = await listSessionsForUser(user.id);
  const others = sessions.filter((s) => s.id !== currentSid);

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Sessions</h1>
        <p className="text-sm text-muted-foreground">
          One row per device you&apos;re signed in on. Revoke any session you don&apos;t recognise.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-500" /> Active sessions
            </CardTitle>
            <CardDescription>
              {sessions.length === 0
                ? 'No active sessions.'
                : `${sessions.length} active${others.length > 0 ? ` · ${others.length} other device${others.length === 1 ? '' : 's'}` : ''}.`}
            </CardDescription>
          </div>
          {others.length > 0 ? (
            <form action={revokeAllOtherSessionsAction}>
              <Button type="submit" variant="outline" size="sm">
                <ShieldOff className="h-4 w-4" /> Sign out everywhere else
              </Button>
            </form>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          {sessions.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No active sessions.</p>
          ) : (
            <ul className="divide-y">
              {sessions.map((s) => {
                const ua = parseUserAgent(s.userAgent);
                const isCurrent = s.id === currentSid;
                return (
                  <li key={s.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <DeviceIcon type={ua.type} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">
                            {ua.browser} on {ua.os}
                          </p>
                          {isCurrent ? (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                              This device
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {s.ipAddress ?? 'IP unknown'} · last active {fmt(s.lastSeenAt)} · signed in{' '}
                          {fmt(s.createdAt)}
                        </p>
                      </div>
                    </div>
                    <form action={revokeSessionAction} className="shrink-0">
                      <input type="hidden" name="sessionId" value={s.id} />
                      <Button
                        type="submit"
                        variant={isCurrent ? 'outline' : 'ghost'}
                        size="sm"
                        className={isCurrent ? '' : 'text-muted-foreground hover:text-destructive'}
                      >
                        <LogOut className="h-4 w-4" /> {isCurrent ? 'Sign out' : 'Revoke'}
                      </Button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DeviceIcon({ type }: { type: ReturnType<typeof parseUserAgent>['type'] }) {
  switch (type) {
    case 'mobile':
      return <Smartphone className="h-5 w-5" />;
    case 'tablet':
      return <Tablet className="h-5 w-5" />;
    default:
      return <Monitor className="h-5 w-5" />;
  }
}

function fmt(date: Date): string {
  const ms = Date.now() - date.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return date.toLocaleDateString();
}
