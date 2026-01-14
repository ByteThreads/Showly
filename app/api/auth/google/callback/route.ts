/**
 * Google Calendar OAuth Callback
 * Handles the OAuth redirect after user authorizes calendar access
 *
 * Since we can't use Admin SDK (service account key creation restricted),
 * we redirect back to settings page with tokens in URL hash (not query params)
 * so the authenticated client can save them to Firestore
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/google-calendar';

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

    console.log('[Google OAuth] Tokens received, redirecting to settings...');

    // Encode tokens as base64 to pass through URL hash (more secure than query params)
    const tokenData = JSON.stringify({
      agentId: state,
      accessToken,
      refreshToken,
      expiryDate,
    });
    const encodedTokens = Buffer.from(tokenData).toString('base64');

    // Redirect to settings page with tokens in URL hash
    // Hash is not sent to server and JavaScript can access it
    return NextResponse.redirect(
      new URL(`/dashboard/settings#calendar_tokens=${encodedTokens}`, request.url)
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
