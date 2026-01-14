/**
 * Sync Showing to Google Calendar
 * Creates or updates a calendar event for a showing
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar';
import type { Agent, Showing, Property } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const { showingId, action } = await request.json();

    if (!showingId) {
      return NextResponse.json(
        { error: 'Showing ID is required' },
        { status: 400 }
      );
    }

    // Fetch showing document using Admin SDK
    const showingDoc = await adminDb.collection('showings').doc(showingId).get();
    if (!showingDoc.exists) {
      return NextResponse.json(
        { error: 'Showing not found' },
        { status: 404 }
      );
    }

    const showing = { id: showingDoc.id, ...showingDoc.data() } as Showing;

    // Fetch agent document using Admin SDK
    const agentDoc = await adminDb.collection('agents').doc(showing.agentId).get();
    if (!agentDoc.exists) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const agent = { id: agentDoc.id, ...agentDoc.data() } as Agent;

    // Check if calendar sync is enabled
    if (!agent.settings.googleCalendarSync || !agent.settings.googleRefreshToken) {
      return NextResponse.json(
        { error: 'Google Calendar sync is not enabled for this agent' },
        { status: 400 }
      );
    }

    // Fetch property document using Admin SDK
    const propertyDoc = await adminDb.collection('properties').doc(showing.propertyId).get();
    if (!propertyDoc.exists) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    const property = { id: propertyDoc.id, ...propertyDoc.data() } as Property;

    // Handle different actions
    if (action === 'delete' && showing.googleCalendarEventId) {
      // Delete calendar event
      await deleteCalendarEvent(agent, showing.googleCalendarEventId);

      // Remove event ID from showing using Admin SDK
      await adminDb.collection('showings').doc(showingId).update({
        googleCalendarEventId: null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        message: 'Calendar event deleted',
      });
    }

    if (showing.googleCalendarEventId) {
      // Update existing event
      await updateCalendarEvent(agent, showing, property, showing.googleCalendarEventId);

      return NextResponse.json({
        success: true,
        message: 'Calendar event updated',
        eventId: showing.googleCalendarEventId,
      });
    } else {
      // Double-check the showing doesn't have an event ID (race condition prevention)
      // Re-fetch to ensure we have the latest data using Admin SDK
      const refetchedShowingDoc = await adminDb.collection('showings').doc(showingId).get();
      const refetchedShowing = { id: refetchedShowingDoc.id, ...refetchedShowingDoc.data() } as Showing;

      if (refetchedShowing.googleCalendarEventId) {
        // Another request already created the event, update it instead
        await updateCalendarEvent(agent, refetchedShowing, property, refetchedShowing.googleCalendarEventId);

        return NextResponse.json({
          success: true,
          message: 'Calendar event updated (race condition avoided)',
          eventId: refetchedShowing.googleCalendarEventId,
        });
      }

      // Create new event
      const eventId = await createCalendarEvent(agent, showing, property);

      // Store event ID in showing document using Admin SDK
      await adminDb.collection('showings').doc(showingId).update({
        googleCalendarEventId: eventId,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        message: 'Calendar event created',
        eventId,
      });
    }
  } catch (error: any) {
    console.error('[Calendar Sync] Error syncing showing:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to sync calendar event',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
