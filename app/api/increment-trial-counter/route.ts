/**
 * Increment Trial Showing Counter API
 *
 * Server-side endpoint to increment the trial showing counter for an agent.
 * This must be done server-side because the client (unauthenticated booking user)
 * doesn't have permission to update the agent document.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { agentId } = await request.json();
    console.log('[Trial Counter API] Request received for agent:', agentId);

    if (!agentId) {
      console.error('[Trial Counter API] Missing agent ID');
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Get agent document using Admin SDK
    const agentRef = adminDb.collection('agents').doc(agentId);
    const agentDoc = await agentRef.get();

    if (!agentDoc.exists) {
      console.error('[Trial Counter API] Agent not found:', agentId);
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const agent = agentDoc.data();
    if (!agent) {
      console.error('[Trial Counter API] Agent data is null:', agentId);
      return NextResponse.json(
        { error: 'Agent data not found' },
        { status: 404 }
      );
    }

    console.log('[Trial Counter API] Agent status:', agent.subscriptionStatus, 'Current count:', agent.trialShowingsCount || 0);

    // Only increment if agent is on trial
    if (agent.subscriptionStatus === 'trial') {
      await agentRef.update({
        trialShowingsCount: FieldValue.increment(1),
        updatedAt: new Date(),
      });

      const newCount = (agent.trialShowingsCount || 0) + 1;
      console.log('[Trial Counter API] Counter incremented to:', newCount);

      return NextResponse.json({
        success: true,
        newCount,
        trialExpired: newCount >= 3,
      });
    }

    // Not on trial, no action needed
    console.log('[Trial Counter API] Agent not on trial, skipping increment');
    return NextResponse.json({
      success: true,
      message: 'Agent not on trial, no counter update needed',
    });

  } catch (error: any) {
    console.error('[Trial Counter API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to increment trial counter' },
      { status: 500 }
    );
  }
}
