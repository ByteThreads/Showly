/**
 * Sync Showing to Google Calendar
 * Creates or updates a calendar event for a showing
 */

import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

    // Fetch showing document
    const showingDoc = await getDoc(doc(db, 'showings', showingId));
    if (!showingDoc.exists()) {
      return NextResponse.json(
        { error: 'Showing not found' },
        { status: 404 }
      );
    }

    const showing = { id: showingDoc.id, ...showingDoc.data() } as Showing;

    // Fetch agent document
    const agentDoc = await getDoc(doc(db, 'agents', showing.agentId));
    if (!agentDoc.exists()) {
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

    // Fetch property document
    const propertyDoc = await getDoc(doc(db, 'properties', showing.propertyId));
    if (!propertyDoc.exists()) {
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

      // Remove event ID from showing
      await updateDoc(doc(db, 'showings', showingId), {
        googleCalendarEventId: null,
        updatedAt: new Date(),
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
      // Create new event
      const eventId = await createCalendarEvent(agent, showing, property);

      // Store event ID in showing document
      await updateDoc(doc(db, 'showings', showingId), {
        googleCalendarEventId: eventId,
        updatedAt: new Date(),
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
