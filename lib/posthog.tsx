'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only initialize on client side
    const isProduction = process.env.NODE_ENV === 'production';
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

    if (apiKey && !posthog.__loaded) {
      posthog.init(apiKey, {
        api_host: apiHost,

        // Distinguish between production and development
        // Development events will be tagged so you can filter them out
        loaded: (posthog) => {
          if (!isProduction) {
            // Tag all development events
            posthog.register({
              environment: 'development',
              is_test: true,
            });
            console.log('[PostHog] Initialized in DEVELOPMENT mode - events tagged as test data');
          } else {
            posthog.register({
              environment: 'production',
              is_test: false,
            });
            console.log('[PostHog] Initialized in PRODUCTION mode');
          }
        },

        // Disable in development by default (optional - you can enable for testing)
        opt_out_capturing_by_default: false, // Set to true to disable tracking in dev entirely

        // Enable session recording (disable in dev if you want)
        session_recording: {
          maskAllInputs: true, // Mask sensitive input fields
          maskTextSelector: '[data-private]', // Mask elements with data-private attribute
        },

        // Autocapture settings
        autocapture: {
          dom_event_allowlist: ['click'], // Only autocapture clicks
          url_allowlist: isProduction ? undefined : [], // Disable autocapture in dev (optional)
        },

        // Privacy settings
        respect_dnt: true, // Respect Do Not Track
        ip: false, // Don't capture IP addresses for privacy

        // Performance
        capture_pageview: true, // Automatically capture page views
        capture_pageleave: true, // Track when users leave pages
      });
    } else if (!apiKey) {
      console.warn('[PostHog] API key not found - analytics disabled');
    }
  }, []); // Empty dependency array - only run once on mount

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

// Export posthog instance for use in components
export { posthog };
