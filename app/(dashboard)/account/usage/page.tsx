import { Bot, FileText, HardDrive, MessageSquare } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getPlan, getUsage, limitsFor } from '@/lib/server/plans';
import { requireAuth } from '@/lib/server/require-auth';

export const metadata = { title: 'Usage & limits' };
export const dynamic = 'force-dynamic';

export default async function UsagePage() {
  const user = await requireAuth();
  const [plan, usage] = await Promise.all([getPlan(user.id), getUsage(user.id)]);
  const limits = limitsFor(plan);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Usage &amp; limits</h1>
          <p className="text-sm text-muted-foreground">
            Your current usage against your {plan} plan caps. Resets monthly (UTC).
          </p>
        </div>
        <Badge variant={plan === 'free' ? 'secondary' : 'success'} className="capitalize">
          {plan} plan
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <UsageCard
          icon={<Bot className="h-4 w-4" />}
          label="Chatbots"
          used={usage.bots}
          cap={limits.bots}
          format={(n) => n.toLocaleString()}
        />
        <UsageCard
          icon={<FileText className="h-4 w-4" />}
          label="Documents"
          used={usage.documents}
          cap={limits.documents}
          format={(n) => n.toLocaleString()}
        />
        <UsageCard
          icon={<HardDrive className="h-4 w-4" />}
          label="Storage"
          used={usage.documentBytes}
          cap={limits.documentBytes}
          format={formatBytes}
        />
        <UsageCard
          icon={<MessageSquare className="h-4 w-4" />}
          label="Messages (this month)"
          used={usage.messagesThisMonth}
          cap={limits.messagesPerMonth}
          format={(n) => n.toLocaleString()}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upgrade plan</CardTitle>
          <CardDescription>
            Stripe checkout ships in P7. For now: contact{' '}
            <a href="mailto:billing@cyberunite.com" className="underline-offset-4 hover:underline">
              billing@cyberunite.com
            </a>{' '}
            and we&apos;ll move you up manually.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function UsageCard({
  icon,
  label,
  used,
  cap,
  format,
}: {
  icon: React.ReactNode;
  label: string;
  used: number;
  cap: number;
  format: (n: number) => string;
}) {
  const pct = Math.min(100, Math.round((used / Math.max(cap, 1)) * 100));
  const variant: 'default' | 'warning' | 'destructive' = pct >= 100 ? 'destructive' : pct >= 80 ? 'warning' : 'default';
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold">{format(used)}</span>
          <span className="text-sm text-muted-foreground">of {format(cap)}</span>
        </div>
        <Progress value={pct} variant={variant} />
      </CardContent>
    </Card>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
