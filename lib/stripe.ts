import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

// Initialize Stripe with secret key (server-side only)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

// Stripe Price IDs
export const STRIPE_PRICES = {
  FOUNDER: process.env.STRIPE_PRICE_ID_FOUNDER || '',
  STANDARD: process.env.STRIPE_PRICE_ID_STANDARD || '',
} as const;

// Subscription status mapping from Stripe to our app
export function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): string {
  const statusMap: Record<Stripe.Subscription.Status, string> = {
    active: 'active',
    past_due: 'past_due',
    unpaid: 'past_due',
    canceled: 'cancelled',
    incomplete: 'inactive',
    incomplete_expired: 'inactive',
    trialing: 'trial',
    paused: 'inactive',
  };

  return statusMap[stripeStatus] || 'inactive';
}
