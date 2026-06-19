import { Bot, FileText, HardDrive, MessageSquare } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getPlan, getUsage, limitsFor, PLAN_LIMITS, type Plan } from '@/lib/server/plans';
import { requireAuth } from '@/lib/server/require-auth';
import { isBillingConfigured } from '@/lib/server/stripe';

import { openCustomerPortalAction, startCheckoutAction } from './actions';

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

      <BillingCard currentPlan={plan} />
    </div>
  );
}

function BillingCard({ currentPlan }: { currentPlan: Plan }) {
  const configured = isBillingConfigured();
  if (!configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upgrade plan</CardTitle>
          <CardDescription>
            Billing is not configured on this deployment. Set{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">STRIPE_SECRET_KEY</code>,{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">STRIPE_WEBHOOK_SECRET</code>,{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">STRIPE_PRICE_STARTER</code>{' '}
            and <code className="rounded bg-muted px-1.5 py-0.5 text-xs">STRIPE_PRICE_PRO</code> to
            enable checkout.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan &amp; billing</CardTitle>
        <CardDescription>
          {currentPlan === 'free'
            ? "You're on the free plan. Upgrade for higher caps and faster support."
            : 'Manage your subscription in the Stripe customer portal.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {currentPlan !== 'free' ? (
          <form action={openCustomerPortalAction}>
            <Button type="submit" variant="outline">
              Manage billing
            </Button>
          </form>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <PlanOption
            plan="starter"
            currentPlan={currentPlan}
            tagline="20 bots · 500 docs · 5k messages/mo"
          />
          <PlanOption
            plan="pro"
            currentPlan={currentPlan}
            tagline="200 bots · 5k docs · 50k messages/mo"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function PlanOption({
  plan,
  currentPlan,
  tagline,
}: {
  plan: 'starter' | 'pro';
  currentPlan: Plan;
  tagline: string;
}) {
  const limits = PLAN_LIMITS[plan];
  const isCurrent = currentPlan === plan;
  return (
    <div className="flex flex-col rounded-md border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold capitalize">{plan}</h3>
        {isCurrent ? <Badge variant="success">Current</Badge> : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{tagline}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {limits.bots.toLocaleString()} bots ·{' '}
        {(limits.documentBytes / (1024 * 1024 * 1024)).toFixed(0)} GB storage
      </p>
      <form action={startCheckoutAction} className="mt-3">
        <input type="hidden" name="plan" value={plan} />
        <Button type="submit" disabled={isCurrent} className="w-full">
          {isCurrent ? 'Current plan' : `Upgrade to ${plan}`}
        </Button>
      </form>
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
