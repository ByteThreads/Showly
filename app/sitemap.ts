import { MetadataRoute } from 'next';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Property } from '@/types/database';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.showly.io';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  try {
    // Fetch all active properties for dynamic booking pages
    const propertiesRef = collection(db, 'properties');
    const q = query(propertiesRef, where('status', '==', 'active'));
    const snapshot = await getDocs(q);

    const propertyPages: MetadataRoute.Sitemap = snapshot.docs.map((doc) => {
      const property = { id: doc.id, ...doc.data() } as Property;
      return {
        url: `${baseUrl}/s/${property.bookingSlug}`,
        lastModified: property.updatedAt?.toDate() || property.createdAt.toDate(),
        changeFrequency: 'daily' as const,
        priority: 0.9, // High priority for property pages (they convert!)
      };
    });

    return [...staticPages, ...propertyPages];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    // Return static pages if dynamic fetch fails
    return staticPages;
  }
}

// Revalidate sitemap every hour
export const revalidate = 3600;
