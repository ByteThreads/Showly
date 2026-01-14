# Google Calendar API Setup Guide

This guide walks you through setting up Google Calendar OAuth integration for Showly.

## Overview

The Google Calendar integration allows agents to automatically sync their showing appointments to their Google Calendar. When enabled:

- New showings are automatically added to Google Calendar
- Rescheduled showings update the calendar event
- Cancelled showings are removed from the calendar
- Each event includes client details and property information

## Prerequisites

- A Google Cloud Platform (GCP) project
- Access to Google Cloud Console

## Step 1: Create/Configure GCP Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Make sure billing is enabled (required for OAuth, but Calendar API is free)

## Step 2: Enable Google Calendar API

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Calendar API"
3. Click on "Google Calendar API"
4. Click **ENABLE**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type (unless you have a Google Workspace)
3. Click **CREATE**

### Fill out the OAuth consent screen:

**App information:**
- App name: `Showly`
- User support email: Your email address
- App logo: (Optional) Upload Showly logo

**App domain:**
- Application home page: `https://your-domain.com`
- Application privacy policy: `https://your-domain.com/privacy`
- Application terms of service: `https://your-domain.com/terms`

**Authorized domains:**
- Add your production domain (e.g., `showly.app`)
- Add your development domain if different (e.g., `localhost`)

**Developer contact information:**
- Email addresses: Your email

4. Click **SAVE AND CONTINUE**

### Add Scopes:

1. Click **ADD OR REMOVE SCOPES**
2. Add these scopes:
   - `https://www.googleapis.com/auth/calendar.events` - Create, read, update, and delete calendar events
   - `https://www.googleapis.com/auth/calendar.readonly` - Read calendar data
   - `https://www.googleapis.com/auth/userinfo.email` - View user email address

3. Click **UPDATE**
4. Click **SAVE AND CONTINUE**

### Test users (for development):

1. Add your test Gmail accounts
2. Click **SAVE AND CONTINUE**

**Note:** While in "Testing" mode, only added test users can authorize the app. To make it available to all users, you'll need to submit for verification (see Step 6).

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **CREATE CREDENTIALS** > **OAuth client ID**
3. Application type: **Web application**
4. Name: `Showly Web Client`

### Authorized JavaScript origins:

Add all URLs where your app will run:
```
http://localhost:3000
https://your-staging-domain.vercel.app
https://your-production-domain.com
```

### Authorized redirect URIs:

Add the OAuth callback URLs:
```
http://localhost:3000/api/auth/google/callback
https://your-staging-domain.vercel.app/api/auth/google/callback
https://your-production-domain.com/api/auth/google/callback
```

5. Click **CREATE**
6. Copy your **Client ID** and **Client secret**

## Step 5: Add Credentials to Environment Variables

Add the following to your `.env.local` file:

```bash
# Google Calendar API
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here

# Application URL (used for OAuth redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change to production URL in production
```

**Important:** Never commit these credentials to version control!

## Step 6: Publish the App (Production Only)

While your app is in "Testing" mode, only added test users can use the integration. To make it available to all users:

1. Go to **OAuth consent screen**
2. Click **PUBLISH APP**
3. Google will review your application

**Note:** If you're only requesting sensitive scopes (like Calendar), verification is **not** required for publication. You can publish immediately without going through the verification process.

**However,** if you see warnings about needing verification:
- This typically happens if you're requesting restricted/sensitive scopes beyond basic Calendar access
- Review process can take 4-6 weeks
- You'll need to provide:
  - YouTube demo video showing the OAuth flow
  - Detailed explanation of why you need each scope
  - Privacy policy and terms of service links

## Step 7: Test the Integration

### Development Testing:

1. Start your development server: `npm run dev`
2. Log in to Showly
3. Go to **Settings** > **Google Calendar Sync**
4. Click **Connect Google Calendar**
5. Authorize the application
6. You should be redirected back with a success message

### Verify It Works:

1. Create a test showing
2. Go to your Google Calendar
3. You should see the showing event appear
4. Try rescheduling the showing
5. Verify the calendar event updates
6. Try cancelling the showing
7. Verify the calendar event is removed

## Troubleshooting

### "Access blocked: This app's request is invalid"

**Cause:** Redirect URI mismatch

**Solution:**
1. Go to Google Cloud Console > Credentials
2. Edit your OAuth 2.0 Client ID
3. Make sure the redirect URI exactly matches the one in your app
4. Include the protocol (`http://` or `https://`)
5. No trailing slashes

### "Error 401: invalid_client"

**Cause:** Client ID or Secret is incorrect

**Solution:**
1. Double-check your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`
2. Make sure there are no extra spaces or quotes
3. Restart your development server after changing environment variables

### "Error 403: access_denied"

**Cause:** User denied permission or app is in testing mode

**Solution:**
1. Make sure the user clicked "Allow" on the consent screen
2. If in testing mode, add the user's email to test users
3. If published, wait for Google's review to complete

### "Error 400: redirect_uri_mismatch"

**Cause:** The redirect URI in the request doesn't match any authorized URIs

**Solution:**
1. Check `NEXT_PUBLIC_APP_URL` in `.env.local`
2. Verify it matches an authorized redirect URI in Google Cloud Console
3. Make sure the callback route is exactly `/api/auth/google/callback`

### Tokens Not Refreshing

**Cause:** Refresh token not being stored properly

**Solution:**
1. Make sure `access_type: 'offline'` is set in the authorization URL (already done)
2. Make sure `prompt: 'consent'` is set to force getting a refresh token (already done)
3. Check Firestore to see if `googleRefreshToken` is stored in agent document

## Security Best Practices

1. **Never commit credentials** - Keep `.env.local` in `.gitignore`
2. **Use environment variables** - Store all secrets in environment variables
3. **Rotate credentials** - If credentials are exposed, regenerate them immediately
4. **Limit scopes** - Only request the minimum scopes needed
5. **Monitor usage** - Check Google Cloud Console for unusual API usage

## API Quotas and Limits

Google Calendar API has the following limits (free tier):

- **Queries per day:** 1,000,000
- **Queries per 100 seconds per user:** 500
- **Queries per 100 seconds:** 10,000

For Showly's use case:
- Each showing creates 1 API call (event creation)
- Each reschedule creates 1 API call (event update)
- Each cancellation creates 1 API call (event deletion)

**Estimate:** With 1000 active agents creating 20 showings/month each:
- 20,000 events/month = ~667 events/day
- Well within the 1,000,000 queries/day limit

## Cost

- Google Calendar API is **FREE** for standard usage
- No billing required for Calendar API itself
- GCP project needs billing enabled for OAuth (no charges unless you use paid services)

## Support

If you encounter issues:

1. Check the [Google Calendar API documentation](https://developers.google.com/calendar/api/guides/overview)
2. Review the [OAuth 2.0 documentation](https://developers.google.com/identity/protocols/oauth2)
3. Check the Google Cloud Console for API errors
4. Review the Showly server logs for detailed error messages

## Next Steps

Once Google Calendar sync is working:

1. Test thoroughly with different scenarios (create, reschedule, cancel)
2. Monitor API usage in Google Cloud Console
3. Consider implementing webhooks for bidirectional sync (see `lib/google-calendar.ts`)
4. Add error handling for rate limits
5. Implement automatic token refresh (already implemented)

## Production Deployment Checklist

Before deploying to production:

- [ ] OAuth consent screen configured with production URLs
- [ ] OAuth credentials created with production redirect URIs
- [ ] Environment variables set in Vercel/production environment
- [ ] App published or test users added for beta testing
- [ ] Integration tested end-to-end in production
- [ ] Error monitoring set up (e.g., Sentry)
- [ ] API quota monitoring enabled
- [ ] Privacy policy updated to mention Google Calendar integration
- [ ] Terms of service updated if needed

---

**Last Updated:** January 14, 2026
