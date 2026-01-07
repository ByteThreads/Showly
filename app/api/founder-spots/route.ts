import { NextResponse } from 'next/server';

// For now, return static data until we resolve the org policy issue
// This prevents console errors while maintaining functionality
export async function GET() {
  try {
    // TODO: Once service account credentials are available, uncomment this:
    // const { adminDb } = await import('@/lib/firebase-admin');
    // const snapshot = await adminDb
    //   .collection('agents')
    //   .where('isFounderCustomer', '==', true)
    //   .get();
    // const founderCount = snapshot.size;

    // Temporary: Return static data
    const founderCount = 0; // Update this manually as founders sign up
    const remaining = Math.max(0, 200 - founderCount);

    return NextResponse.json({
      total: 200,
      claimed: founderCount,
      remaining: remaining,
      available: remaining > 0,
    });
  } catch (error) {
    console.error('Error checking founder spots:', error);

    // Return a safe fallback response
    return NextResponse.json({
      total: 200,
      claimed: 0,
      remaining: 200,
      available: true,
    });
  }
}
