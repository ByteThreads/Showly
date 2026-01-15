/**
 * Calendar Subscription Feed API
 *
 * Generates an iCal feed for agents to subscribe to in Apple Calendar, Outlook, etc.
 * URL: webcal://showly.app/api/calendar/feed/[token]
 *
 * Read-only view of all upcoming showings
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import type { Agent, Showing, Property } from '@/types/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find agent with this calendar feed token
    const agentsRef = collection(db, 'agents');
    const q = query(agentsRef, where('settings.calendarFeedToken', '==', token));
    const agentSnapshot = await getDocs(q);

    if (agentSnapshot.empty) {
      return new NextResponse('Invalid calendar feed token', { status: 404 });
    }

    const agentDoc = agentSnapshot.docs[0];
    const agent = { id: agentDoc.id, ...agentDoc.data() } as Agent;

    // Fetch all upcoming showings (not cancelled, not completed)
    const showingsRef = collection(db, 'showings');
    const now = Timestamp.now();
    const showingsQuery = query(
      showingsRef,
      where('agentId', '==', agent.id),
      where('scheduledAt', '>=', now),
      orderBy('scheduledAt', 'asc')
    );
    const showingsSnapshot = await getDocs(showingsQuery);
    const showings = showingsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Showing[];

    // Fetch property details for each showing
    const propertyIds = [...new Set(showings.map(s => s.propertyId))];
    const properties = new Map<string, Property>();

    for (const propertyId of propertyIds) {
      const propertyDoc = await getDocs(query(collection(db, 'properties'), where('__name__', '==', propertyId)));
      if (!propertyDoc.empty) {
        const propertyData = propertyDoc.docs[0].data();
        properties.set(propertyId, {
          id: propertyDoc.docs[0].id,
          ...propertyData
        } as Property);
      }
    }

    // Generate iCal feed
    const icsEvents = showings
      .filter(showing => showing.status !== 'cancelled') // Exclude cancelled showings
      .map(showing => {
        const property = properties.get(showing.propertyId);
        if (!property) return null;

        const startTime = showing.scheduledAt.toDate();
        const endTime = new Date(startTime.getTime() + showing.duration * 60000);

        // Format status for event summary
        const statusPrefix = showing.status === 'confirmed' ? '[CONFIRMED] ' : '';

        return generateICalEvent({
          uid: `showing-${showing.id}@showly.app`,
          summary: `${statusPrefix}Property Showing - ${property.address.formatted}`,
          description: formatShowingDescription(showing, property, agent),
          location: property.address.formatted,
          startTime,
          endTime,
          status: showing.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE',
          lastModified: showing.updatedAt.toDate(),
        });
      })
      .filter(Boolean)
      .join('\r\n');

    // Build complete iCal file
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Showly//Calendar Feed//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:Showly - ${agent.name}`,
      'X-WR-CALDESC:Property showings managed by Showly',
      'X-WR-TIMEZONE:America/New_York',
      icsEvents,
      'END:VCALENDAR',
    ].join('\r\n');

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="showly-calendar.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Calendar feed error:', error);
    return new NextResponse('Failed to generate calendar feed', { status: 500 });
  }
}

/**
 * Generate a single iCal event
 */
function generateICalEvent({
  uid,
  summary,
  description,
  location,
  startTime,
  endTime,
  status,
  lastModified,
}: {
  uid: string;
  summary: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date;
  status: string;
  lastModified: Date;
}): string {
  const formatICalDate = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  };

  const escapeText = (text: string): string => {
    return text.replace(/[\\,;]/g, '\\$&').replace(/\n/g, '\\n');
  };

  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICalDate(new Date())}`,
    `DTSTART:${formatICalDate(startTime)}`,
    `DTEND:${formatICalDate(endTime)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText(location)}`,
    `STATUS:${status}`,
    `LAST-MODIFIED:${formatICalDate(lastModified)}`,
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Property Showing Tomorrow',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Property Showing in 1 Hour',
    'END:VALARM',
    'END:VEVENT',
  ].join('\r\n');
}

/**
 * Format showing description for iCal event
 */
function formatShowingDescription(showing: Showing, property: Property, agent: Agent): string {
  const parts = [
    `Showing for ${showing.clientName}`,
    '',
    'Client Details:',
    `- Name: ${showing.clientName}`,
    `- Email: ${showing.clientEmail}`,
    `- Phone: ${showing.clientPhone}`,
  ];

  if (showing.notes) {
    parts.push(`- Notes: ${showing.notes}`);
  }

  if (showing.preApproved) {
    parts.push('- Pre-approved: Yes');
  }

  parts.push(
    '',
    'Property Details:',
    `- Address: ${property.address.formatted}`,
    `- Price: $${property.price.toLocaleString()}`,
    `- Beds: ${property.bedrooms} | Baths: ${property.bathrooms}${property.sqft ? ` | Sqft: ${property.sqft.toLocaleString()}` : ''}`,
    '',
    `Agent: ${agent.name}`,
    `Email: ${agent.email}`,
    `Phone: ${agent.phone}`,
    '',
    'Managed by Showly - https://showly.app'
  );

  return parts.join('\n');
}
