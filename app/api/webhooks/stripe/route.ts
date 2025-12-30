import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe, mapStripeStatus } from '@/lib/stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { Agent } from '@/types/database';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  console.log('Stripe webhook event:', event.type);

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

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
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
    const agentsRef = collection(db, 'agents');
    const founderQuery = query(
      agentsRef,
      where('isFounderCustomer', '==', true)
    );
    const founderSnapshot = await getDocs(founderQuery);
    founderNumber = founderSnapshot.size + 1; // Next founder number
  }

  // Update agent document with Stripe customer ID and founder status
  await updateDoc(doc(db, 'agents', agentId), {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    isFounderCustomer: isFounder,
    ...(founderNumber ? { founderNumber } : {}),
    updatedAt: new Date(),
  });

  console.log(`Checkout completed for agent ${agentId}, founder: ${isFounder}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const agentId = subscription.metadata?.agentId;

  if (!agentId) {
    // Try to find agent by customer ID
    const customerId = subscription.customer as string;
    const agentDoc = await findAgentByStripeCustomer(customerId);

    if (!agentDoc) {
      console.error('No agent found for subscription:', subscription.id);
      return;
    }

    await updateAgentSubscription(agentDoc.id, subscription);
  } else {
    await updateAgentSubscription(agentId, subscription);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const agentId = subscription.metadata?.agentId;

  if (!agentId) {
    const customerId = subscription.customer as string;
    const agentDoc = await findAgentByStripeCustomer(customerId);

    if (!agentDoc) {
      console.error('No agent found for deleted subscription:', subscription.id);
      return;
    }

    await updateDoc(doc(db, 'agents', agentDoc.id), {
      subscriptionStatus: 'cancelled',
      subscriptionEndDate: (subscription as any).current_period_end
        ? new Date((subscription as any).current_period_end * 1000)
        : undefined,
      updatedAt: new Date(),
    });
  } else {
    await updateDoc(doc(db, 'agents', agentId), {
      subscriptionStatus: 'cancelled',
      subscriptionEndDate: (subscription as any).current_period_end
        ? new Date((subscription as any).current_period_end * 1000)
        : undefined,
      updatedAt: new Date(),
    });
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const agentDoc = await findAgentByStripeCustomer(customerId);

  if (!agentDoc) {
    console.error('No agent found for payment succeeded:', invoice.id);
    return;
  }

  // Payment succeeded, ensure status is active
  await updateDoc(doc(db, 'agents', agentDoc.id), {
    subscriptionStatus: 'active',
    updatedAt: new Date(),
  });

  console.log(`Payment succeeded for agent ${agentDoc.id}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const agentDoc = await findAgentByStripeCustomer(customerId);

  if (!agentDoc) {
    console.error('No agent found for payment failed:', invoice.id);
    return;
  }

  // Payment failed, set status to past_due
  await updateDoc(doc(db, 'agents', agentDoc.id), {
    subscriptionStatus: 'past_due',
    updatedAt: new Date(),
  });

  console.log(`Payment failed for agent ${agentDoc.id}`);
}

async function updateAgentSubscription(agentId: string, subscription: Stripe.Subscription) {
  const status = mapStripeStatus(subscription.status);
  const priceId = subscription.items.data[0]?.price.id;

  await updateDoc(doc(db, 'agents', agentId), {
    subscriptionStatus: status,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    subscriptionEndDate: (subscription as any).current_period_end
      ? new Date((subscription as any).current_period_end * 1000)
      : undefined,
    updatedAt: new Date(),
  });

  console.log(`Updated subscription for agent ${agentId}: ${status}`);
}

async function findAgentByStripeCustomer(customerId: string): Promise<Agent | null> {
  const agentsRef = collection(db, 'agents');
  const q = query(agentsRef, where('stripeCustomerId', '==', customerId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Agent;
}
