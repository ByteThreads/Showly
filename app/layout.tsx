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
  title: "Showly - Real Estate Showing Scheduler",
  description: "The Calendly for Real Estate Showings. Schedule property showings without the back-and-forth.",
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
  },
  openGraph: {
    title: "Showly - Real Estate Showing Scheduler",
    description: "Schedule property showings without the back-and-forth",
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
    description: "Schedule property showings without the back-and-forth",
    images: ['https://www.showly.io/api/og'],
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
