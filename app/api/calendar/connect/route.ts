/**
 * Initiate Google Calendar OAuth Flow
 * Generates authorization URL and redirects user to Google consent screen
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/google-calendar';

export async function POST(request: NextRequest) {
  try {
    const { agentId } = await request.json();

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Generate authorization URL with agent ID in state parameter
    const authUrl = getAuthorizationUrl() + `&state=${agentId}`;

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('[Calendar Connect] Error generating auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}
