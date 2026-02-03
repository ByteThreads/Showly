'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { STRINGS } from '@/lib/constants/strings';
import { STYLES } from '@/lib/constants/styles';
import { needsUpgrade } from '@/lib/utils/subscription';
import PaywallModal from './PaywallModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSubscription?: boolean;  // If true, checks for active subscription
}

export default function ProtectedRoute({ children, requireSubscription = true }: ProtectedRouteProps) {
  const { user, agent, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showPaywall, setShowPaywall] = useState(false);
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Check subscription status if required
  useEffect(() => {
    if (!loading && user && agent && requireSubscription) {
      // Allow access to billing and pricing pages even without subscription
      const allowedPaths = ['/dashboard/billing', '/pricing'];
      const isAllowedPath = allowedPaths.some(path => pathname?.startsWith(path));

      if (!isAllowedPath && needsUpgrade(agent)) {
        // Show paywall on initial load, but allow dismissing to read-only mode
        if (!isReadOnlyMode) {
          setShowPaywall(true);
        }
      } else {
        setShowPaywall(false);
        setIsReadOnlyMode(false);
      }
    }
  }, [user, agent, loading, requireSubscription, pathname, isReadOnlyMode]);

  const handleClosePaywall = () => {
    setShowPaywall(false);
    setIsReadOnlyMode(true);
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className={STYLES.loading.overlay}>
        <div className="text-center">
          <div className={STYLES.loading.spinner}></div>
          <p className={STYLES.loading.text}>{STRINGS.common.loading}</p>
        </div>
      </div>
    );
  }

  // Don't render protected content if not authenticated
  if (!user) {
    return null;
  }

  // Show paywall modal if subscription required but user needs to upgrade
  if (requireSubscription && agent) {
    const allowedPaths = ['/dashboard/billing', '/pricing'];
    const isAllowedPath = allowedPaths.some(path => pathname?.startsWith(path));

    if (!isAllowedPath && needsUpgrade(agent)) {
      return (
        <>
          {/* Read-only mode banner */}
          {isReadOnlyMode && (
            <div className="sticky top-0 z-40 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 text-center shadow-lg">
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="font-semibold">
                  Read-Only Mode • Your trial has expired
                </span>
                <Link
                  href="/dashboard/billing"
                  className="ml-4 px-4 py-1 bg-white text-orange-600 rounded-full text-sm font-bold hover:bg-gray-100 transition-colors"
                >
                  Upgrade Now
                </Link>
              </div>
            </div>
          )}

          {/* Render children - blurred when modal open, clear when dismissed */}
          <div className={showPaywall ? "filter blur-sm pointer-events-none" : ""}>
            {children}
          </div>

          {/* Show paywall modal */}
          <PaywallModal
            isOpen={showPaywall}
            onClose={handleClosePaywall}
            variant="trial_expired"
          />
        </>
      );
    }
  }

  return <>{children}</>;
}
