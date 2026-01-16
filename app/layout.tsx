import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import { SmoothScroll } from "./smooth-scroll";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.showly.io'),
  title: {
    default: "Showly - Real Estate Showing Scheduler | Automate Property Bookings",
    template: "%s | Showly",
  },
  description: "The Calendly for real estate. Let clients book property showings 24/7 with automated scheduling. Save 15+ hours per month with instant confirmations, calendar sync, and SMS reminders.",
  keywords: [
    'real estate showing scheduler',
    'property showing booking',
    'real estate automation',
    'showing appointment software',
    'real estate calendar',
    'property viewing scheduler',
    'automated showing booking',
    'real estate agent tools',
  ],
  authors: [{ name: 'Showly' }],
  creator: 'ByteThreads LLC',
  publisher: 'ByteThreads LLC',
  openGraph: {
    title: "Showly - Automate Your Real Estate Showings",
    description: "Let clients book property showings 24/7. Save time with automated scheduling, instant confirmations, and calendar sync.",
    url: "https://www.showly.io",
    siteName: "Showly",
    images: [
      {
        url: 'https://www.showly.io/api/og',
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
    title: "Showly - Real Estate Showing Scheduler",
    description: "Automate property showings. Let clients book 24/7 with instant confirmations.",
    images: ['https://www.showly.io/api/og'],
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
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <Providers>
          <SmoothScroll />
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
