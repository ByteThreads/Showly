import { Metadata } from 'next';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Property, Agent } from '@/types/database';

interface Props {
  params: { slug: string };
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = params;

  try {
    // Fetch property by slug
    const propertiesRef = collection(db, 'properties');
    const q = query(propertiesRef, where('bookingSlug', '==', slug));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return {
        title: 'Property Not Found | Showly',
        description: 'The property you are looking for could not be found.',
      };
    }

    const propertyDoc = snapshot.docs[0];
    const property = { id: propertyDoc.id, ...propertyDoc.data() } as Property;

    // Fetch agent data
    let agentName = 'Real Estate Agent';
    try {
      const agentDoc = await getDoc(doc(db, 'agents', property.agentId));
      if (agentDoc.exists()) {
        const agent = agentDoc.data() as Agent;
        agentName = agent.name;
      }
    } catch (error) {
      console.error('Error fetching agent:', error);
    }

    // Build SEO-friendly title and description
    const address = `${property.address.street}, ${property.address.city}, ${property.address.state}`;
    const title = `${address} - Schedule a Showing | ${agentName}`;
    const description = `Book a showing for this ${property.bedrooms} bed, ${property.bathrooms} bath property in ${property.address.city}, ${property.address.state}. Listed at $${property.price.toLocaleString()}. Schedule instantly with ${agentName}.`;

    // Use first photo or fallback
    const image = property.photos && property.photos.length > 0
      ? property.photos[0]
      : property.photoURL || 'https://www.showly.io/api/og';

    const baseUrl = 'https://www.showly.io';
    const url = `${baseUrl}/s/${slug}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        type: 'website',
        images: [
          {
            url: image,
            width: 1200,
            height: 630,
            alt: address,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image],
      },
      alternates: {
        canonical: url,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Book a Showing | Showly',
      description: 'Schedule a property showing instantly.',
    };
  }
}

export default function BookingLayout({ children }: Props) {
  return <>{children}</>;
}
