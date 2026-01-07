import { NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    // Query agents collection to count founder customers
    const agentsRef = collection(db, 'agents');
    const founderQuery = query(
      agentsRef,
      where('isFounderCustomer', '==', true)
    );

    const snapshot = await getDocs(founderQuery);
    const founderCount = snapshot.size;
    const remaining = Math.max(0, 200 - founderCount);

    return NextResponse.json({
      total: 200,
      claimed: founderCount,
      remaining: remaining,
      available: remaining > 0,
    });
  } catch (error) {
    console.error('Error checking founder spots:', error);

    // Return a safe fallback response instead of exposing the error
    return NextResponse.json({
      total: 200,
      claimed: 0,
      remaining: 200,
      available: true,
      error: 'Failed to fetch founder spots data',
    }, { status: 500 });
  }
}
