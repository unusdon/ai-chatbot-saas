/**
 * Stripe webhook handler.
 *
 * Verifies the signature (constructEvent) then forwards subscription events
 * to applySubscriptionState. Other event types are acknowledged but ignored.
 * Returning 200 quickly is important — Stripe retries on non-2xx for 3 days.
 *
 * The raw body MUST be read as a string, not parsed JSON — Stripe's signature
 * covers the exact byte stream we received.
 */
import type Stripe from 'stripe';

import { env } from '@/lib/env';
import { applySubscriptionState, getStripe, isBillingConfigured } from '@/lib/server/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!isBillingConfigured()) {
    return new Response('Billing not configured', { status: 503 });
  }
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET!);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'signature verification failed';
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price.id ?? null;
      await applySubscriptionState({
        stripeCustomerId: sub.customer as string,
        subscriptionId: sub.id,
        status: sub.status,
        priceId,
      });
      break;
    }
    default:
      // 200 ack for events we don't care about — Stripe stops retrying.
      break;
  }

  return new Response('ok', { status: 200 });
}
