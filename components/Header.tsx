'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { STRINGS } from '@/lib/constants/strings';

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Don't show header on dashboard pages
  const isDashboard = pathname?.startsWith('/dashboard');
  if (isDashboard) return null;

  // Simplified header for booking pages
  const isBookingPage = pathname?.startsWith('/s/');
  if (isBookingPage) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-white backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                {STRINGS.brand.name}
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600 font-medium">Book Your Showing</span>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white backdrop-blur-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
              {STRINGS.brand.name}
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            {/* Show Dashboard link if logged in */}
            {user ? (
              <Link
                href="/dashboard"
                className="relative bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-5 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg group overflow-hidden"
              >
                <span className="relative z-10">Dashboard</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </Link>
            ) : (
              <>
                {pathname !== '/login' && pathname !== '/signup' && (
                  <Link
                    href="/pricing"
                    className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
                  >
                    Pricing
                  </Link>
                )}

                {pathname !== '/login' && (
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
                  >
                    Sign in
                  </Link>
                )}

                {pathname !== '/signup' && (
                  <Link
                    href="/signup"
                    className="relative bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-5 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg group overflow-hidden"
                  >
                    <span className="relative z-10">Get started</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
