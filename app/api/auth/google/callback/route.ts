/**
 * Google Calendar OAuth Callback
 * Handles the OAuth redirect after user authorizes calendar access
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/google-calendar';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Contains agent ID
    const error = searchParams.get('error');

    // Check for authorization errors
    if (error) {
      console.error('[Google OAuth] Authorization error:', error);
      return NextResponse.redirect(
        new URL('/dashboard/settings?calendar_error=denied', request.url)
      );
    }

    if (!code) {
      console.error('[Google OAuth] No authorization code received');
      return NextResponse.redirect(
        new URL('/dashboard/settings?calendar_error=no_code', request.url)
      );
    }

    if (!state) {
      console.error('[Google OAuth] No agent ID in state parameter');
      return NextResponse.redirect(
        new URL('/dashboard/settings?calendar_error=invalid_state', request.url)
      );
    }

    // Exchange code for tokens
    console.log('[Google OAuth] Exchanging code for tokens...');
    const { accessToken, refreshToken, expiryDate } = await exchangeCodeForTokens(code);

    // Update agent document with tokens
    console.log('[Google OAuth] Updating agent document...');
    const agentRef = doc(db, 'agents', state);
    await updateDoc(agentRef, {
      'settings.googleCalendarSync': true,
      'settings.googleAccessToken': accessToken,
      'settings.googleRefreshToken': refreshToken,
      'settings.googleTokenExpiry': expiryDate,
      'settings.googleCalendarId': 'primary', // Default to primary calendar
      updatedAt: new Date(),
    });

    console.log('[Google OAuth] Calendar sync enabled successfully');

    // Redirect to settings page with success message
    return NextResponse.redirect(
      new URL('/dashboard/settings?calendar_success=true', request.url)
    );
  } catch (error) {
    console.error('[Google OAuth] Error in callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'unknown';
    const encodedError = encodeURIComponent(errorMessage);
    return NextResponse.redirect(
      new URL(`/dashboard/settings?calendar_error=unknown&error_details=${encodedError}`, request.url)
    );
  }
}
