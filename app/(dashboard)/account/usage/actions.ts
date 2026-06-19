'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { env } from '@/lib/env';
import { requireAuth } from '@/lib/server/require-auth';
import {
  getOrCreateCustomer,
  getStripe,
  isBillingConfigured,
  priceForPlan,
  type PaidPlan,
} from '@/lib/server/stripe';

const Input = z.object({ plan: z.enum(['starter', 'pro']) });

export async function startCheckoutAction(formData: FormData) {
  const user = await requireAuth();
  if (!user.email) throw new Error('User email is required for checkout');
  const parsed = Input.parse({ plan: formData.get('plan') });
  if (!isBillingConfigured()) throw new Error('Billing is not configured');

  const price = priceForPlan(parsed.plan as PaidPlan);
  if (!price) throw new Error(`No Stripe price configured for the ${parsed.plan} plan`);

  const customerId = await getOrCreateCustomer({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  const stripe = getStripe();
  const baseUrl = env.NEXT_PUBLIC_APP_URL;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    success_url: `${baseUrl}/account/usage?checkout=success`,
    cancel_url: `${baseUrl}/account/usage?checkout=cancelled`,
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error('Stripe did not return a checkout URL');
  redirect(session.url);
}

export async function openCustomerPortalAction() {
  const user = await requireAuth();
  if (!isBillingConfigured()) throw new Error('Billing is not configured');

  const customerId = await getOrCreateCustomer({
    userId: user.id,
    email: user.email ?? '',
    name: user.name,
  });

  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.NEXT_PUBLIC_APP_URL}/account/usage`,
  });
  redirect(portal.url);
}
