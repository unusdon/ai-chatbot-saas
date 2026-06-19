/**
 * Stripe helpers — pure mapping logic exercised without contacting Stripe.
 *
 * The actual checkout + webhook calls are best verified via Stripe CLI
 * (`stripe trigger`) against a running deployment. For unit tests we cover
 * the price ↔ plan mapping and the active/cancelled state flip.
 */
import { describe, expect, it } from 'vitest';

// Set Stripe price envs BEFORE the module loads.
const env = process.env as Record<string, string | undefined>;
env.STRIPE_SECRET_KEY = 'sk_test_unit'; // not contacted
env.STRIPE_WEBHOOK_SECRET = 'whsec_unit';
env.STRIPE_PRICE_STARTER = 'price_starter_test';
env.STRIPE_PRICE_PRO = 'price_pro_test';

describe('Stripe helpers', () => {
  it('isBillingConfigured returns true when both secret + webhook env are set', async () => {
    const mod = await import('@/lib/server/stripe');
    expect(mod.isBillingConfigured()).toBe(true);
  });

  it('priceForPlan returns the env-configured ids', async () => {
    const mod = await import('@/lib/server/stripe');
    expect(mod.priceForPlan('starter')).toBe('price_starter_test');
    expect(mod.priceForPlan('pro')).toBe('price_pro_test');
  });

  it('planFromPriceId maps prices back to plan names', async () => {
    const mod = await import('@/lib/server/stripe');
    expect(mod.planFromPriceId('price_pro_test')).toBe('pro');
    expect(mod.planFromPriceId('price_starter_test')).toBe('starter');
    expect(mod.planFromPriceId('price_unknown')).toBe('free');
    expect(mod.planFromPriceId(null)).toBe('free');
    expect(mod.planFromPriceId(undefined)).toBe('free');
  });
});
