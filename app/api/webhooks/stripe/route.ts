import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe, mapStripeStatus } from '@/lib/stripe';
import type { Agent } from '@/types/database';

// Helper function to update agent via internal API
async function updateAgentViaAPI(agentId: string | null, customerId: string | null, updateData: any) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/update-subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.INTERNAL_API_SECRET}`,
    },
    body: JSON.stringify({
      agentId,
      customerId,
      updateData,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update agent: ${error.error}`);
  }

  return response.json();
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Handle GET requests (Stripe sends these for endpoint verification)
export async function GET(request: NextRequest) {
  console.log('[Stripe Webhook] Received GET request (verification)');
  return NextResponse.json({ status: 'Webhook endpoint is active' }, { status: 200 });
}

export async function POST(request: NextRequest) {
  console.log('[Stripe Webhook] Received POST request');
  console.log('[Stripe Webhook] URL:', request.url);
  console.log('[Stripe Webhook] Host:', request.headers.get('host'));

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  console.log('[Stripe Webhook] Signature present:', !!signature);

  if (!signature) {
    console.error('[Stripe Webhook] No signature provided');
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  // Check if webhook secret is configured
  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not configured!');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  console.log('[Stripe Webhook] Webhook secret configured:', webhookSecret.substring(0, 10) + '...');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('[Stripe Webhook] Event verified successfully:', event.type);
  } catch (err: any) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    console.error('[Stripe Webhook] Body length:', body.length);
    console.error('[Stripe Webhook] Signature:', signature.substring(0, 20) + '...');
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  console.log('[Stripe Webhook] Processing event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    console.log('[Stripe Webhook] Successfully processed event:', event.type);
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Stripe Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const agentId = session.metadata?.agentId;
  const isFounder = session.metadata?.isFounder === 'true';

  if (!agentId) {
    console.error('No agentId in checkout session metadata');
    return;
  }

  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  // Get founder number if this is a founder customer
  let founderNumber: number | undefined;
  if (isFounder) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/founder-spots`);
      const data = await response.json();
      founderNumber = (data.claimed || 0) + 1; // Next founder number
    } catch (error) {
      console.error('Error getting founder number:', error);
      founderNumber = 1; // Default to 1 if check fails
    }
  }

  // Update agent document with Stripe customer ID and founder status
  await updateAgentViaAPI(agentId, null, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    isFounderCustomer: isFounder,
    ...(founderNumber ? { founderNumber } : {}),
  });

  console.log(`Checkout completed for agent ${agentId}, founder: ${isFounder}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const agentId = subscription.metadata?.agentId;
  const customerId = subscription.customer as string;

  await updateAgentSubscription(agentId || null, customerId, subscription);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const agentId = subscription.metadata?.agentId;
  const customerId = subscription.customer as string;
  const currentPeriodEnd = (subscription as any).current_period_end as number | undefined;

  const updateData: any = {
    subscriptionStatus: 'cancelled',
  };

  if (currentPeriodEnd) {
    updateData.subscriptionEndDate = new Date(currentPeriodEnd * 1000);
  }

  await updateAgentViaAPI(agentId || null, customerId, updateData);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Payment succeeded, ensure status is active
  await updateAgentViaAPI(null, customerId, {
    subscriptionStatus: 'active',
  });

  console.log(`Payment succeeded for customer ${customerId}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Payment failed, set status to past_due
  await updateAgentViaAPI(null, customerId, {
    subscriptionStatus: 'past_due',
  });

  console.log(`Payment failed for customer ${customerId}`);
}

async function updateAgentSubscription(agentId: string | null, customerId: string, subscription: Stripe.Subscription) {
  const status = mapStripeStatus(subscription.status);
  const priceId = subscription.items.data[0]?.price.id;
  const currentPeriodEnd = (subscription as any).current_period_end as number | undefined;

  console.log(`[Webhook] Updating subscription:`, {
    agentId,
    customerId,
    stripeStatus: subscription.status,
    mappedStatus: status,
    priceId,
    subscriptionId: subscription.id,
    currentPeriodEnd,
  });

  // Build update object, only include subscriptionEndDate if it exists
  const updateData: any = {
    subscriptionStatus: status,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
  };

  // Only add subscriptionEndDate if current_period_end exists
  if (currentPeriodEnd) {
    updateData.subscriptionEndDate = new Date(currentPeriodEnd * 1000);
  }

  await updateAgentViaAPI(agentId, customerId, updateData);

  console.log(`[Webhook] Successfully updated subscription: ${status}`);
}

