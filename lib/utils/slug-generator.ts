import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Generates a random 6-character alphanumeric slug
 * Example: "a7b3k9"
 */
function generateRandomSlug(): string {
  return Math.random().toString(36).substring(2, 8);
}

/**
 * Checks if a slug already exists in the properties collection
 */
async function slugExists(slug: string): Promise<boolean> {
  const q = query(
    collection(db, 'properties'),
    where('bookingSlug', '==', slug)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Generates a unique booking slug for a property
 * Retries if there's a collision (rare but possible)
 */
export async function generateUniqueSlug(): Promise<string> {
  let slug = generateRandomSlug();
  let attempts = 0;
  const maxAttempts = 10;

  // Keep trying until we find a unique slug
  while (await slugExists(slug)) {
    attempts++;
    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique slug after multiple attempts');
    }
    slug = generateRandomSlug();
  }

  return slug;
}
