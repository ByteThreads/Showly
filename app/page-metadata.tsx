import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Showly - Real Estate Showing Scheduler | Automate Property Bookings',
  description: 'The Calendly for real estate. Let clients book property showings 24/7 with automated scheduling. Save 15+ hours per month with instant confirmations, calendar sync, and SMS reminders. Trusted by real estate agents nationwide.',
  keywords: [
    'real estate showing scheduler',
    'property showing booking',
    'real estate automation',
    'showing appointment software',
    'real estate calendar',
    'property viewing scheduler',
    'automated showing booking',
    'real estate agent tools',
    'showing management software',
    'calendly for real estate',
  ],
  authors: [{ name: 'Showly' }],
  creator: 'ByteThreads LLC',
  publisher: 'ByteThreads LLC',
  metadataBase: new URL('https://www.showly.io'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Showly - Automate Your Real Estate Showings',
    description: 'Let clients book property showings 24/7. Save time with automated scheduling, instant confirmations, and calendar sync.',
    url: 'https://www.showly.io',
    siteName: 'Showly',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'Showly - Real Estate Showing Scheduler',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Showly - Real Estate Showing Scheduler',
    description: 'Automate property showings. Let clients book 24/7 with instant confirmations.',
    images: ['/api/og'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add when you set up Google Search Console
    // google: 'your-google-verification-code',
  },
};
