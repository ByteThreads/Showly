/**
 * Structured Data Components (Schema.org JSON-LD)
 * Helps search engines understand your content better
 */

interface OrganizationSchemaProps {
  name?: string;
  description?: string;
  url?: string;
  logo?: string;
}

export function OrganizationSchema({
  name = 'Showly',
  description = 'Real estate showing scheduler that helps agents automate property viewing bookings',
  url = 'https://www.showly.io',
  logo = 'https://www.showly.io/logo.svg',
}: OrganizationSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    description,
    url,
    logo,
    sameAs: [
      // Add your social media profiles here when available
      // 'https://twitter.com/showly',
      // 'https://www.linkedin.com/company/showly',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'contact@bytethreadsllc.com',
      contactType: 'Customer Service',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface SoftwareAppSchemaProps {
  name?: string;
  description?: string;
  url?: string;
  price?: string;
}

export function SoftwareAppSchema({
  name = 'Showly',
  description = 'Real estate showing scheduler - The Calendly for property showings',
  url = 'https://www.showly.io',
  price = '39',
}: SoftwareAppSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    url,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price,
        priceCurrency: 'USD',
        referenceQuantity: {
          '@type': 'QuantitativeValue',
          value: '1',
          unitText: 'MONTH',
        },
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '50', // Update with real data when available
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface PropertySchemaProps {
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft?: number;
  photoURL?: string;
  photos?: string[];
  description?: string;
  bookingUrl: string;
}

export function PropertySchema({
  address,
  price,
  bedrooms,
  bathrooms,
  sqft,
  photoURL,
  photos,
  description,
  bookingUrl,
}: PropertySchemaProps) {
  const images = photos && photos.length > 0 ? photos : photoURL ? [photoURL] : [];

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SingleFamilyResidence',
    name: `${address.street}, ${address.city}, ${address.state}`,
    description: description || `${bedrooms} bedroom, ${bathrooms} bathroom property in ${address.city}, ${address.state}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: address.street,
      addressLocality: address.city,
      addressRegion: address.state,
      postalCode: address.zip,
      addressCountry: 'US',
    },
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: bookingUrl,
    },
    numberOfRooms: bedrooms,
    numberOfBedrooms: bedrooms,
    numberOfBathroomsTotal: bathrooms,
    ...(sqft && { floorSize: { '@type': 'QuantitativeValue', value: sqft, unitText: 'sqft' } }),
    ...(images.length > 0 && { image: images }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface RealEstateAgentSchemaProps {
  name: string;
  email: string;
  phone?: string;
  photoURL?: string;
  brokerage?: string;
}

export function RealEstateAgentSchema({
  name,
  email,
  phone,
  photoURL,
  brokerage,
}: RealEstateAgentSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name,
    email,
    ...(phone && { telephone: phone }),
    ...(photoURL && { image: photoURL }),
    ...(brokerage && { affiliation: brokerage }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface BreadcrumbSchemaProps {
  items: Array<{
    name: string;
    url: string;
  }>;
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
