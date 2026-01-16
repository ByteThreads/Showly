'use client';

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
        setShowPaywall(true);
      } else {
        setShowPaywall(false);
      }
    }
  }, [user, agent, loading, requireSubscription, pathname]);

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
          {/* Render children in background (blurred) */}
          <div className="filter blur-sm pointer-events-none">
            {children}
          </div>
          {/* Show paywall modal */}
          <PaywallModal
            isOpen={showPaywall}
            variant="trial_expired"
          />
        </>
      );
    }
  }

  return <>{children}</>;
}
