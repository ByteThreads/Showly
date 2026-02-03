'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { needsUpgrade } from '@/lib/utils/subscription';
import PaywallModal from '@/components/PaywallModal';

/**
 * Hook to handle paywall checks for actions
 * Returns a function to wrap actions that require an active subscription
 */
export function usePaywall() {
  const { agent } = useAuth();
  const [showPaywall, setShowPaywall] = useState(false);

  /**
   * Wraps an action to check if upgrade is needed first
   * If upgrade needed, shows paywall modal instead of executing action
   */
  const withPaywallCheck = (action: () => void, featureName?: string) => {
    return () => {
      if (agent && needsUpgrade(agent)) {
        setShowPaywall(true);
      } else {
        action();
      }
    };
  };

  const PaywallComponent = showPaywall ? (
    <PaywallModal
      isOpen={showPaywall}
      onClose={() => setShowPaywall(false)}
      variant="feature_locked"
    />
  ) : null;

  return {
    withPaywallCheck,
    PaywallComponent,
    isReadOnly: agent ? needsUpgrade(agent) : false,
  };
}
