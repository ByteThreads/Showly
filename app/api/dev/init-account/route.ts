import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * DEV ONLY: Initialize/reset account subscription fields for testing
 *
 * Usage:
 * POST /api/dev/init-account
 * Body: {
 *   agentId: "your-firebase-uid",
 *   asFounder: true/false (optional, default: false)
 * }
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  try {
    const { agentId, asFounder = false } = await request.json();

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    // Get the agent document
    const agentRef = doc(db, 'agents', agentId);
    const agentDoc = await getDoc(agentRef);

    if (!agentDoc.exists()) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Initialize subscription fields
    const subscriptionData: any = {
      subscriptionStatus: 'trial',
      trialStartDate: new Date(),
      trialShowingsCount: 0,
      isFounderCustomer: asFounder,
      updatedAt: new Date(),
    };

    // If setting as founder, add founder number
    if (asFounder) {
      subscriptionData.founderNumber = 999; // Use 999 for dev accounts
    }

    // Update the agent document
    await updateDoc(agentRef, subscriptionData);

    return NextResponse.json({
      success: true,
      message: 'Account initialized successfully',
      data: {
        agentId,
        subscriptionStatus: 'trial',
        trialStartDate: new Date().toISOString(),
        trialShowingsCount: 0,
        isFounderCustomer: asFounder,
        ...(asFounder ? { founderNumber: 999 } : {}),
      },
    });
  } catch (error: any) {
    console.error('Error initializing account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize account' },
      { status: 500 }
    );
  }
}
