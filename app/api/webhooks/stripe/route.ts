import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe, mapStripeStatus } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';
import type { Agent } from '@/types/database';

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
  await adminDb.collection('agents').doc(agentId).update({
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    isFounderCustomer: isFounder,
    ...(founderNumber ? { founderNumber } : {}),
    updatedAt: new Date(),
  });

  console.log(`[Webhook] Checkout completed for agent ${agentId}, founder: ${isFounder}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  await updateAgentSubscription(customerId, subscription);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const currentPeriodEnd = (subscription as any).current_period_end as number | undefined;

  // Find agent by customer ID
  const agentQuery = await adminDb.collection('agents')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (agentQuery.empty) {
    console.error('[Webhook] No agent found for deleted subscription');
    return;
  }

  const updateData: any = {
    subscriptionStatus: 'cancelled',
    updatedAt: new Date(),
  };

  if (currentPeriodEnd) {
    updateData.subscriptionEndDate = new Date(currentPeriodEnd * 1000);
  }

  await agentQuery.docs[0].ref.update(updateData);
  console.log(`[Webhook] Subscription cancelled for agent ${agentQuery.docs[0].id}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find agent by customer ID
  const agentQuery = await adminDb.collection('agents')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (agentQuery.empty) {
    console.error('[Webhook] No agent found for payment succeeded');
    return;
  }

  // Payment succeeded, ensure status is active
  await agentQuery.docs[0].ref.update({
    subscriptionStatus: 'active',
    updatedAt: new Date(),
  });

  console.log(`[Webhook] Payment succeeded for agent ${agentQuery.docs[0].id}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find agent by customer ID
  const agentQuery = await adminDb.collection('agents')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (agentQuery.empty) {
    console.error('[Webhook] No agent found for payment failed');
    return;
  }

  // Payment failed, set status to past_due
  await agentQuery.docs[0].ref.update({
    subscriptionStatus: 'past_due',
    updatedAt: new Date(),
  });

  console.log(`[Webhook] Payment failed for agent ${agentQuery.docs[0].id}`);
}

async function updateAgentSubscription(customerId: string, subscription: Stripe.Subscription) {
  const status = mapStripeStatus(subscription.status);
  const priceId = subscription.items.data[0]?.price.id;
  const currentPeriodEnd = (subscription as any).current_period_end as number | undefined;

  console.log(`[Webhook] Updating subscription:`, {
    customerId,
    stripeStatus: subscription.status,
    mappedStatus: status,
    priceId,
    subscriptionId: subscription.id,
    currentPeriodEnd,
  });

  // Find agent by customer ID
  const agentQuery = await adminDb.collection('agents')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (agentQuery.empty) {
    console.error('[Webhook] No agent found for customer:', customerId);
    return;
  }

  // Build update object, only include subscriptionEndDate if it exists
  const updateData: any = {
    subscriptionStatus: status,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    updatedAt: new Date(),
  };

  // Only add subscriptionEndDate if current_period_end exists
  if (currentPeriodEnd) {
    updateData.subscriptionEndDate = new Date(currentPeriodEnd * 1000);
  }

  await agentQuery.docs[0].ref.update(updateData);

  console.log(`[Webhook] Successfully updated subscription for agent ${agentQuery.docs[0].id}: ${status}`);
}

