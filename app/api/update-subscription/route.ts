import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

// Secret token to authenticate internal requests
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Verify the secret token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token || token !== INTERNAL_API_SECRET) {
      console.error('[Update Subscription] Unauthorized request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { agentId, customerId, updateData } = body;

    console.log('[Update Subscription] Received request:', { agentId, customerId, fields: Object.keys(updateData) });

    let targetAgentId = agentId;

    // If no agentId, find by customerId
    if (!targetAgentId && customerId) {
      const agentsRef = collection(db, 'agents');
      const q = query(agentsRef, where('stripeCustomerId', '==', customerId));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.error('[Update Subscription] No agent found with customerId:', customerId);
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 }
        );
      }

      targetAgentId = snapshot.docs[0].id;
      console.log('[Update Subscription] Found agent by customerId:', targetAgentId);
    }

    if (!targetAgentId) {
      console.error('[Update Subscription] No agentId provided');
      return NextResponse.json(
        { error: 'agentId or customerId required' },
        { status: 400 }
      );
    }

    // Update the agent document
    const agentRef = doc(db, 'agents', targetAgentId);
    await updateDoc(agentRef, {
      ...updateData,
      updatedAt: new Date(),
    });

    console.log('[Update Subscription] Successfully updated agent:', targetAgentId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Update Subscription] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update subscription' },
      { status: 500 }
    );
  }
}
