/**
 * Google Calendar API Integration
 * Handles OAuth tokens, calendar event CRUD operations, and bidirectional sync
 */

import { google } from 'googleapis';
import type { Agent, Showing, Property } from '@/types/database';

const calendar = google.calendar('v3');

// OAuth2 Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  : 'http://localhost:3000/api/auth/google/callback';

/**
 * Create OAuth2 client with credentials
 */
export function getOAuth2Client() {
  console.log('[Google OAuth] Creating OAuth2 client with:');
  console.log('  Client ID:', GOOGLE_CLIENT_ID?.substring(0, 20) + '...');
  console.log('  Client Secret:', GOOGLE_CLIENT_SECRET ? 'GOCSPX-' + GOOGLE_CLIENT_SECRET.substring(7, 15) + '...' : 'undefined');
  console.log('  Redirect URI:', REDIRECT_URI);

  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
}

/**
 * Generate authorization URL with required scopes
 * Scopes needed:
 * - calendar.events: Create/update/delete events
 * - userinfo.email: Get user email
 */
export function getAuthorizationUrl(): string {
  const oauth2Client = getOAuth2Client();

  const scopes = [
    'https://www.googleapis.com/auth/calendar.events', // Manage calendar events
    'https://www.googleapis.com/auth/userinfo.email', // Get user email
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    prompt: 'consent', // Force consent screen to get refresh token
    scope: scopes,
  });

  return url;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  return {
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token!,
    expiryDate: tokens.expiry_date!, // Unix timestamp in milliseconds
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();

  return {
    accessToken: credentials.access_token!,
    expiryDate: credentials.expiry_date!, // Unix timestamp in milliseconds
  };
}

/**
 * Get authenticated OAuth2 client for agent
 * Automatically refreshes token if expired
 */
export async function getAuthenticatedClient(agent: Agent) {
  const oauth2Client = getOAuth2Client();

  // Check if token exists
  if (!agent.settings.googleRefreshToken) {
    throw new Error('No refresh token found. Agent needs to authorize Google Calendar access.');
  }

  // Check if access token is expired or about to expire (within 5 minutes)
  const now = Date.now();
  const tokenExpiry = agent.settings.googleTokenExpiry || 0;
  const fiveMinutesFromNow = now + (5 * 60 * 1000);

  if (!agent.settings.googleAccessToken || tokenExpiry < fiveMinutesFromNow) {
    // Refresh the token
    console.log('[Google Calendar] Access token expired or missing, refreshing...');
    const { accessToken, expiryDate } = await refreshAccessToken(agent.settings.googleRefreshToken);

    // Return client with new token
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: agent.settings.googleRefreshToken,
      expiry_date: expiryDate,
    });

    return { oauth2Client, accessToken, expiryDate };
  }

  // Use existing token
  oauth2Client.setCredentials({
    access_token: agent.settings.googleAccessToken,
    refresh_token: agent.settings.googleRefreshToken,
    expiry_date: tokenExpiry,
  });

  return { oauth2Client, accessToken: agent.settings.googleAccessToken, expiryDate: tokenExpiry };
}

/**
 * Create a calendar event for a showing
 */
export async function createCalendarEvent(
  agent: Agent,
  showing: Showing,
  property: Property
): Promise<string> {
  const { oauth2Client } = await getAuthenticatedClient(agent);

  const startTime = showing.scheduledAt.toDate();
  const endTime = new Date(startTime.getTime() + showing.duration * 60000);

  const event = {
    summary: `Property Showing - ${property.address.formatted}`,
    location: property.address.formatted,
    description: `Showing for ${showing.clientName}

Client Details:
- Name: ${showing.clientName}
- Email: ${showing.clientEmail}
- Phone: ${showing.clientPhone}
${showing.notes ? `- Notes: ${showing.notes}` : ''}
${showing.preApproved ? '- Pre-approved: Yes' : ''}

Property Details:
- Address: ${property.address.formatted}
- Price: $${property.price.toLocaleString()}
- Beds: ${property.bedrooms} | Baths: ${property.bathrooms}${property.sqft ? ` | Sqft: ${property.sqft.toLocaleString()}` : ''}

Agent: ${agent.name}
Email: ${agent.email}
Phone: ${agent.phone}

Managed by Showly - https://showly.app`,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: property.timezone,
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: property.timezone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 24 hours
        { method: 'popup', minutes: 60 }, // 1 hour
        { method: 'popup', minutes: 15 }, // 15 minutes
      ],
    },
    colorId: '9', // Blue color for showings
  };

  const calendarId = agent.settings.googleCalendarId || 'primary';

  const response = await calendar.events.insert({
    auth: oauth2Client,
    calendarId,
    requestBody: event,
  });

  return response.data.id!;
}

/**
 * Update a calendar event (for rescheduling or status changes)
 */
export async function updateCalendarEvent(
  agent: Agent,
  showing: Showing,
  property: Property,
  eventId: string
): Promise<void> {
  const { oauth2Client } = await getAuthenticatedClient(agent);

  const startTime = showing.scheduledAt.toDate();
  const endTime = new Date(startTime.getTime() + showing.duration * 60000);

  // Add status to summary based on showing status
  const statusText = showing.status === 'confirmed' ? '[CONFIRMED]' : showing.status === 'cancelled' ? '[CANCELLED]' : '';

  const event = {
    summary: `${statusText} Property Showing - ${property.address.formatted}`.trim(),
    location: property.address.formatted,
    description: `Showing for ${showing.clientName}

Status: ${showing.status.toUpperCase()}

Client Details:
- Name: ${showing.clientName}
- Email: ${showing.clientEmail}
- Phone: ${showing.clientPhone}
${showing.notes ? `- Notes: ${showing.notes}` : ''}
${showing.preApproved ? '- Pre-approved: Yes' : ''}

Property Details:
- Address: ${property.address.formatted}
- Price: $${property.price.toLocaleString()}
- Beds: ${property.bedrooms} | Baths: ${property.bathrooms}${property.sqft ? ` | Sqft: ${property.sqft.toLocaleString()}` : ''}

Agent: ${agent.name}
Email: ${agent.email}
Phone: ${agent.phone}

Managed by Showly - https://showly.app`,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: property.timezone,
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: property.timezone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 15 },
      ],
    },
    colorId: showing.status === 'cancelled' ? '11' : '9', // Red for cancelled, Blue for active
  };

  const calendarId = agent.settings.googleCalendarId || 'primary';

  await calendar.events.update({
    auth: oauth2Client,
    calendarId,
    eventId,
    requestBody: event,
  });
}

/**
 * Delete a calendar event (for cancelled showings)
 */
export async function deleteCalendarEvent(
  agent: Agent,
  eventId: string
): Promise<void> {
  const { oauth2Client } = await getAuthenticatedClient(agent);
  const calendarId = agent.settings.googleCalendarId || 'primary';

  await calendar.events.delete({
    auth: oauth2Client,
    calendarId,
    eventId,
  });
}

/**
 * Get calendar event by ID
 */
export async function getCalendarEvent(agent: Agent, eventId: string) {
  const { oauth2Client } = await getAuthenticatedClient(agent);
  const calendarId = agent.settings.googleCalendarId || 'primary';

  const response = await calendar.events.get({
    auth: oauth2Client,
    calendarId,
    eventId,
  });

  return response.data;
}

/**
 * List calendar events for a date range
 * Used for checking conflicts and bidirectional sync
 */
export async function listCalendarEvents(
  agent: Agent,
  timeMin: Date,
  timeMax: Date
) {
  const { oauth2Client } = await getAuthenticatedClient(agent);
  const calendarId = agent.settings.googleCalendarId || 'primary';

  const response = await calendar.events.list({
    auth: oauth2Client,
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  return response.data.items || [];
}

/**
 * List available calendars for the user
 */
export async function listCalendars(agent: Agent) {
  const { oauth2Client } = await getAuthenticatedClient(agent);

  const response = await calendar.calendarList.list({
    auth: oauth2Client,
  });

  return response.data.items || [];
}

/**
 * Set up push notifications for calendar changes (bidirectional sync)
 * Requires a webhook endpoint to receive notifications
 */
export async function setupCalendarWatch(
  agent: Agent,
  webhookUrl: string
): Promise<{ channelId: string; resourceId: string; expiration: number }> {
  const { oauth2Client } = await getAuthenticatedClient(agent);
  const calendarId = agent.settings.googleCalendarId || 'primary';

  const channelId = `showly-${agent.id}-${Date.now()}`;

  const response = await calendar.events.watch({
    auth: oauth2Client,
    calendarId,
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      token: agent.id, // Used to verify webhook authenticity
    },
  });

  return {
    channelId: response.data.id!,
    resourceId: response.data.resourceId!,
    expiration: parseInt(response.data.expiration!),
  };
}

/**
 * Stop watching calendar for changes
 */
export async function stopCalendarWatch(
  agent: Agent,
  channelId: string,
  resourceId: string
): Promise<void> {
  const { oauth2Client } = await getAuthenticatedClient(agent);

  await calendar.channels.stop({
    auth: oauth2Client,
    requestBody: {
      id: channelId,
      resourceId,
    },
  });
}
