/**
 * Increment Trial Showing Counter API
 *
 * Server-side endpoint to increment the trial showing counter for an agent.
 * This must be done server-side because the client (unauthenticated booking user)
 * doesn't have permission to update the agent document.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { agentId } = await request.json();

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Get agent document
    const agentRef = doc(db, 'agents', agentId);
    const agentDoc = await getDoc(agentRef);

    if (!agentDoc.exists()) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const agent = agentDoc.data();

    // Only increment if agent is on trial
    if (agent.subscriptionStatus === 'trial') {
      await updateDoc(agentRef, {
        trialShowingsCount: increment(1),
        updatedAt: new Date(),
      });

      const newCount = (agent.trialShowingsCount || 0) + 1;

      return NextResponse.json({
        success: true,
        newCount,
        trialExpired: newCount >= 3,
      });
    }

    // Not on trial, no action needed
    return NextResponse.json({
      success: true,
      message: 'Agent not on trial, no counter update needed',
    });

  } catch (error: any) {
    console.error('Error incrementing trial counter:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to increment trial counter' },
      { status: 500 }
    );
  }
}
