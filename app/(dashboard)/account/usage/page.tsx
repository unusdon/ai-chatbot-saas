import { Bot, FileText, HardDrive, MessageSquare, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getPlan, getUsage, limitsFor, PLAN_LIMITS, type Plan } from '@/lib/server/plans';
import { requireAuth } from '@/lib/server/require-auth';
import { isBillingConfigured } from '@/lib/server/stripe';

import { openCustomerPortalAction, startCheckoutAction } from './actions';

export const metadata = { title: 'Usage & billing' };
export const dynamic = 'force-dynamic';

export default async function UsagePage() {
  const user = await requireAuth();
  const [plan, usage] = await Promise.all([getPlan(user.id), getUsage(user.id)]);
  const limits = limitsFor(plan);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Usage &amp; billing</h1>
          <p className="text-sm text-muted-foreground">
            Caps reset on the 1st of each month (UTC). Server-side enforced.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-full border bg-card px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground shadow-soft">
          <Sparkles className="h-3 w-3" /> {plan} plan
        </span>
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
          <CardTitle>Billing</CardTitle>
          <CardDescription>
            Billing is not configured on this deployment. Set the four{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">STRIPE_*</code>{' '}
            env vars to enable checkout. See DEPLOY.md §7.
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
            ? "You're on the free plan. Upgrade for higher caps."
            : 'Manage your subscription in the Stripe customer portal.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {currentPlan !== 'free' ? (
          <form action={openCustomerPortalAction}>
            <Button type="submit" variant="outline">
              Manage billing
            </Button>
          </form>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <PlanOption
            plan="starter"
            currentPlan={currentPlan}
            tagline="20 bots · 500 docs · 5k msgs/mo"
          />
          <PlanOption
            plan="pro"
            currentPlan={currentPlan}
            tagline="200 bots · 5k docs · 50k msgs/mo"
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
    <div className={`flex flex-col rounded-lg border bg-card p-5 shadow-soft ${plan === 'pro' ? 'border-brand/40' : ''}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold capitalize">{plan}</h3>
        {plan === 'pro' ? (
          <span className="rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand">
            Recommended
          </span>
        ) : null}
        {isCurrent ? (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            Current
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{tagline}</p>
      <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
        <li>· {limits.bots.toLocaleString()} chatbots</li>
        <li>· {limits.documents.toLocaleString()} documents</li>
        <li>· {(limits.documentBytes / (1024 * 1024 * 1024)).toFixed(0)} GB storage</li>
        <li>· {limits.messagesPerMonth.toLocaleString()} messages/month</li>
      </ul>
      <form action={startCheckoutAction} className="mt-5">
        <input type="hidden" name="plan" value={plan} />
        <Button
          type="submit"
          disabled={isCurrent}
          variant={plan === 'pro' ? 'brand' : 'default'}
          className="w-full"
        >
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
    <div className="rounded-lg border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-2xl font-bold tabular-nums">{format(used)}</span>
        <span className="text-xs text-muted-foreground">of {format(cap)}</span>
      </div>
      <Progress value={pct} variant={variant} className="mt-3" />
      {pct >= 80 ? (
        <p className={`mt-2 text-xs ${pct >= 100 ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'}`}>
          {pct >= 100 ? 'Cap reached.' : 'Near the cap.'} Upgrade to keep adding.
        </p>
      ) : null}
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
