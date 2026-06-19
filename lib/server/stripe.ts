/**
 * Stripe integration — billing skeleton.
 *
 * Lazy by design: the rest of the app boots fine when Stripe envs are unset;
 * any /billing endpoint just answers "billing not configured" until the host
 * provides STRIPE_SECRET_KEY + STRIPE_PRICE_* values.
 *
 * Webhook integrity is enforced via STRIPE_WEBHOOK_SECRET — never trust the
 * subscription state in a request body without verifying the signature.
 */
import Stripe from 'stripe';

import { env } from '@/lib/env';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { Plan } from '@/lib/server/plans';

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in .env.local.');
  }
  cached = new Stripe(env.STRIPE_SECRET_KEY, {
    typescript: true,
    // Pin so a Stripe-side default-version bump doesn't silently change our
    // webhook payloads. Update intentionally + re-test.
    apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
  });
  return cached;
}

export function isBillingConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
}

export type PaidPlan = Exclude<Plan, 'free'>;

export function priceForPlan(plan: PaidPlan): string | null {
  if (plan === 'starter') return env.STRIPE_PRICE_STARTER ?? null;
  if (plan === 'pro') return env.STRIPE_PRICE_PRO ?? null;
  return null;
}

/**
 * Look up or create a Stripe customer for this user. We persist the
 * customer id on `users.stripeCustomerId` so the second checkout doesn't
 * spawn a new customer record.
 */
export async function getOrCreateCustomer(input: {
  userId: string;
  email: string;
  name: string | null;
}): Promise<string> {
  const existing = await db.query.users.findFirst({ where: eq(users.id, input.userId) });
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: input.email,
    name: input.name ?? undefined,
    metadata: { userId: input.userId },
  });
  await db
    .update(users)
    .set({ stripeCustomerId: customer.id })
    .where(eq(users.id, input.userId));
  return customer.id;
}

/**
 * Map a Stripe price id back to a Plan enum value. Used by the webhook to
 * sync our `users.plan` column when a subscription event arrives.
 */
export function planFromPriceId(priceId: string | null | undefined): Plan {
  if (!priceId) return 'free';
  if (priceId === env.STRIPE_PRICE_PRO) return 'pro';
  if (priceId === env.STRIPE_PRICE_STARTER) return 'starter';
  return 'free';
}

/**
 * Persist subscription state on the user row. Idempotent — same input
 * yields the same row state, so webhook retries are safe.
 */
export async function applySubscriptionState(args: {
  stripeCustomerId: string;
  subscriptionId: string | null;
  status: string;
  priceId: string | null | undefined;
}): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, args.stripeCustomerId),
  });
  if (!user) return; // unknown customer — ignore (could be a Stripe test event)

  const plan: Plan = ['active', 'trialing', 'past_due'].includes(args.status)
    ? planFromPriceId(args.priceId)
    : 'free';

  await db
    .update(users)
    .set({
      plan,
      planChangedAt: new Date(),
      stripeSubscriptionId: args.subscriptionId,
      stripeSubscriptionStatus: args.status,
    })
    .where(eq(users.id, user.id));
}
