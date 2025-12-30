import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_PRICES } from '@/lib/stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import type { Agent } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const { agentId, priceType } = await request.json();

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Get agent document
    const agentDoc = await getDoc(doc(db, 'agents', agentId));
    if (!agentDoc.exists()) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const agent = { id: agentDoc.id, ...agentDoc.data() } as Agent;

    // Determine which price to use
    let priceId: string;
    let isFounder = false;

    if (priceType === 'founder') {
      // Check if there are still founder spots available
      const agentsRef = collection(db, 'agents');
      const founderQuery = query(
        agentsRef,
        where('isFounderCustomer', '==', true)
      );
      const founderSnapshot = await getDocs(founderQuery);
      const founderCount = founderSnapshot.size;

      if (founderCount < 200) {
        priceId = STRIPE_PRICES.FOUNDER;
        isFounder = true;
      } else {
        // No more founder spots, use standard
        priceId = STRIPE_PRICES.STANDARD;
      }
    } else {
      priceId = STRIPE_PRICES.STANDARD;
    }

    // Create or get Stripe customer
    let customerId = agent.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: agent.email,
        name: agent.name,
        metadata: {
          agentId: agent.id,
        },
      });
      customerId = customer.id;
    }

    // Create Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?cancelled=true`,

      // Customization options
      allow_promotion_codes: true,  // Enable promo codes
      billing_address_collection: 'auto',  // Only ask if required by payment method

      // Custom text/messaging
      custom_text: {
        submit: {
          message: 'Start your 14-day free trial - no charges until trial ends',
        },
      },

      subscription_data: {
        trial_period_days: 14,  // 14-day trial
        description: isFounder
          ? 'Showly Founder Plan - Lock in $29/mo forever'
          : 'Showly Pro Plan - $39/mo',
        metadata: {
          agentId: agent.id,
          isFounder: isFounder.toString(),
        },
      },
      metadata: {
        agentId: agent.id,
        isFounder: isFounder.toString(),
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
