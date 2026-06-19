import { Activity, AlertCircle, KeyRound, LogIn, LogOut, MailCheck, Shield, Trash2, User } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { SecurityEvent } from '@/db/schema';
import { parseUserAgent } from '@/lib/server/parse-ua';

const TYPE_META: Record<
  SecurityEvent['type'],
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  sign_in: { label: 'Signed in', icon: LogIn, tone: 'text-emerald-600 dark:text-emerald-400' },
  sign_out: { label: 'Signed out', icon: LogOut, tone: 'text-muted-foreground' },
  session_revoked: { label: 'Session revoked', icon: Shield, tone: 'text-muted-foreground' },
  sessions_revoked_all: { label: 'All other sessions signed out', icon: Shield, tone: 'text-amber-600 dark:text-amber-400' },
  password_changed: { label: 'Password changed', icon: KeyRound, tone: 'text-amber-600 dark:text-amber-400' },
  email_changed: { label: 'Email changed', icon: MailCheck, tone: 'text-amber-600 dark:text-amber-400' },
  profile_changed: { label: 'Profile updated', icon: User, tone: 'text-muted-foreground' },
  account_deleted: { label: 'Account deleted', icon: Trash2, tone: 'text-destructive' },
};

export function SecurityEventsCard({ events }: { events: SecurityEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4" /> Recent security activity
        </CardTitle>
        <CardDescription>
          Audit log for sign-ins, password changes, and revocations. Last 25 events.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {events.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y">
            {events.map((e) => {
              const meta = TYPE_META[e.type] ?? { label: e.type, icon: AlertCircle, tone: 'text-muted-foreground' };
              const Icon = meta.icon;
              const ua = parseUserAgent(e.userAgent);
              return (
                <li key={e.id} className="flex items-start gap-3 px-6 py-3">
                  <span className={`mt-0.5 ${meta.tone}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.ipAddress ?? 'IP unknown'} · {ua.browser} on {ua.os} ·{' '}
                      {e.createdAt.toLocaleString()}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
