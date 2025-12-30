import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import type { Property, Agent } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    console.log('Starting reminder check...');

    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twentyThreeHoursFromNow = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const fiftyMinutesFromNow = new Date(now.getTime() + 50 * 60 * 1000);

    const showingsRef = collection(db, 'showings');

    // Find showings that need 24h reminders
    // (between 23-24 hours from now, not yet sent)
    // Note: We filter by scheduledAt range, then filter by status in code to avoid composite index
    const upcoming24hQuery = query(
      showingsRef,
      where('scheduledAt', '>=', Timestamp.fromDate(twentyThreeHoursFromNow)),
      where('scheduledAt', '<=', Timestamp.fromDate(twentyFourHoursFromNow))
    );

    // Find showings that need 1h reminders
    // (between 50min-1hour from now, not yet sent)
    const upcoming1hQuery = query(
      showingsRef,
      where('scheduledAt', '>=', Timestamp.fromDate(fiftyMinutesFromNow)),
      where('scheduledAt', '<=', Timestamp.fromDate(oneHourFromNow))
    );

    const [snapshot24h, snapshot1h] = await Promise.all([
      getDocs(upcoming24hQuery),
      getDocs(upcoming1hQuery),
    ]);

    const results = {
      checked: now.toISOString(),
      reminders24hSent: 0,
      reminders1hSent: 0,
      errors: [] as string[],
    };

    // Process 24-hour reminders
    for (const showingDoc of snapshot24h.docs) {
      const data = showingDoc.data();
      const showing = {
        id: showingDoc.id,
        ...data,
        scheduledAt: data.scheduledAt, // Keep as Timestamp for now
      } as any;

      // Skip if not scheduled, client doesn't want reminders, or if already sent
      if (showing.status !== 'scheduled' || !showing.clientWantsReminders || showing.reminders.email24h) {
        continue;
      }

      try {
        // Fetch property and agent details
        const [propertyDoc, agentDoc] = await Promise.all([
          getDoc(doc(db, 'properties', showing.propertyId)),
          getDoc(doc(db, 'agents', showing.agentId)),
        ]);

        if (!propertyDoc.exists() || !agentDoc.exists()) {
          results.errors.push(`Missing data for showing ${showing.id}`);
          continue;
        }

        const property = { id: propertyDoc.id, ...propertyDoc.data() } as Property;
        const agent = { id: agentDoc.id, ...agentDoc.data() } as Agent;

        // Send reminder email
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-reminder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reminderType: '24h',
            clientEmail: showing.clientEmail,
            clientName: showing.clientName,
            agentName: agent.name,
            agentEmail: agent.email,
            agentPhone: agent.phone,
            propertyAddress: property.address.formatted,
            showingDate: showing.scheduledAt.toDate().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            }),
            showingTime: showing.scheduledAt.toDate().toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }),
            emailBranding: agent.settings.emailBranding,
          }),
        });

        // Mark as sent
        await updateDoc(doc(db, 'showings', showing.id), {
          'reminders.email24h': true,
        });

        results.reminders24hSent++;
      } catch (error) {
        console.error(`Error sending 24h reminder for showing ${showing.id}:`, error);
        results.errors.push(`24h reminder failed for ${showing.id}: ${error}`);
      }
    }

    // Process 1-hour reminders
    for (const showingDoc of snapshot1h.docs) {
      const data = showingDoc.data();
      const showing = {
        id: showingDoc.id,
        ...data,
        scheduledAt: data.scheduledAt, // Keep as Timestamp for now
      } as any;

      // Skip if not scheduled, client doesn't want reminders, or if already sent
      if (showing.status !== 'scheduled' || !showing.clientWantsReminders || showing.reminders.email1h) {
        continue;
      }

      try {
        // Fetch property and agent details
        const [propertyDoc, agentDoc] = await Promise.all([
          getDoc(doc(db, 'properties', showing.propertyId)),
          getDoc(doc(db, 'agents', showing.agentId)),
        ]);

        if (!propertyDoc.exists() || !agentDoc.exists()) {
          results.errors.push(`Missing data for showing ${showing.id}`);
          continue;
        }

        const property = { id: propertyDoc.id, ...propertyDoc.data() } as Property;
        const agent = { id: agentDoc.id, ...agentDoc.data() } as Agent;

        // Send reminder email
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-reminder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reminderType: '1h',
            clientEmail: showing.clientEmail,
            clientName: showing.clientName,
            agentName: agent.name,
            agentEmail: agent.email,
            agentPhone: agent.phone,
            propertyAddress: property.address.formatted,
            showingDate: showing.scheduledAt.toDate().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            }),
            showingTime: showing.scheduledAt.toDate().toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }),
            emailBranding: agent.settings.emailBranding,
          }),
        });

        // Send SMS reminder if client opted in
        if (showing.clientWantsSMS && showing.clientPhone && !showing.reminders.sms1h) {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-sms`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: showing.clientPhone,
                type: 'reminder1h',
                address: property.address.street,
                time: showing.scheduledAt.toDate().toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                }),
                agentName: agent.name,
              }),
            });

            // Mark SMS as sent
            await updateDoc(doc(db, 'showings', showing.id), {
              'reminders.sms1h': true,
            });
          } catch (smsError) {
            console.error(`Error sending 1h SMS reminder for showing ${showing.id}:`, smsError);
            // Don't fail the email reminder if SMS fails
          }
        }

        // Mark email as sent
        await updateDoc(doc(db, 'showings', showing.id), {
          'reminders.email1h': true,
        });

        results.reminders1hSent++;
      } catch (error) {
        console.error(`Error sending 1h reminder for showing ${showing.id}:`, error);
        results.errors.push(`1h reminder failed for ${showing.id}: ${error}`);
      }
    }

    console.log('Reminder check complete:', results);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('Error in reminder check:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
