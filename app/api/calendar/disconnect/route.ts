/**
 * Disconnect Google Calendar
 * Removes OAuth tokens and disables sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { agentId } = await request.json();

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Update agent document to remove tokens
    const agentRef = doc(db, 'agents', agentId);
    await updateDoc(agentRef, {
      'settings.googleCalendarSync': false,
      'settings.googleAccessToken': null,
      'settings.googleRefreshToken': null,
      'settings.googleTokenExpiry': null,
      'settings.googleCalendarId': null,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Google Calendar disconnected successfully',
    });
  } catch (error) {
    console.error('[Calendar Disconnect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Google Calendar' },
      { status: 500 }
    );
  }
}
