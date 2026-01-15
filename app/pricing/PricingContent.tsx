'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { posthog } from '@/lib/posthog';
import { STRINGS } from '@/lib/constants/strings';
import { STYLES, cn } from '@/lib/constants/styles';

export default function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, agent } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<'founder' | 'standard' | null>(null);
  const [founderSpotsRemaining, setFounderSpotsRemaining] = useState<number | null>(200); // Start optimistically at 200
  const cancelled = searchParams?.get('cancelled') === 'true';
  const reason = searchParams?.get('reason') as 'showings_limit' | 'time_limit' | null;

  // Check founder spots remaining via API
  useEffect(() => {
    const checkFounderSpots = async () => {
      try {
        const response = await fetch('/api/founder-spots');
        const data = await response.json();

        if (data.remaining !== undefined) {
          setFounderSpotsRemaining(data.remaining);
        }
      } catch (error) {
        console.error('Error fetching founder spots:', error);
        // Keep optimistic default of 200 on error
      }
    };

    checkFounderSpots();
  }, []);

  const handleStartTrial = async (priceType: 'founder' | 'standard') => {
    if (!user || !agent) {
      router.push('/login?redirect=/pricing');
      return;
    }

    // Track trial start attempt
    posthog.capture('trial_start_clicked', {
      plan_type: priceType,
      founder_spots_remaining: founderSpotsRemaining,
    });

    setLoadingPlan(priceType);

    try {
      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          agentEmail: agent.email,
          agentName: agent.name,
          stripeCustomerId: agent.stripeCustomerId,
          priceType,
        }),
      });

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error starting trial:', error);
      alert('Failed to start trial. Please try again.');
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {STRINGS.pricing.title}
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            {STRINGS.pricing.subtitle}
          </p>
          <p className="text-sm text-gray-500">
            {STRINGS.pricing.trial.description}
          </p>
        </div>

        {cancelled && (
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <p className="text-amber-800">
                Checkout was cancelled. You can start your trial whenever you're ready!
              </p>
            </div>
          </div>
        )}

        {/* Trial Expiration Banner */}
        {reason && (
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 text-center">
              <div className="mb-3">
                <svg className="w-16 h-16 mx-auto text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {reason === 'showings_limit'
                  ? STRINGS.pricing.trial.expiredShowingsLimit.title
                  : STRINGS.pricing.trial.expiredTimeLimit.title}
              </h3>
              <p className="text-gray-700">
                {reason === 'showings_limit'
                  ? STRINGS.pricing.trial.expiredShowingsLimit.description
                  : STRINGS.pricing.trial.expiredTimeLimit.description}
              </p>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Founder Plan */}
          <div
            className={cn(
              "relative bg-white rounded-2xl shadow-lg overflow-hidden border-2",
              (founderSpotsRemaining ?? 0) > 0
                ? "border-purple-500"
                : "border-gray-200 opacity-75"
            )}
          >
            {(founderSpotsRemaining ?? 0) > 0 && (
              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {STRINGS.pricing.founder.badge}
                </span>
              </div>
            )}

            <div className="p-8">
              {/* Header */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {STRINGS.pricing.founder.name}
                </h3>
                <p className="text-gray-600 text-sm">
                  {STRINGS.pricing.founder.description}
                </p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-5xl font-bold text-gray-900">
                    {STRINGS.pricing.founder.price}
                  </span>
                  <span className="text-xl text-gray-600 ml-2">
                    {STRINGS.pricing.founder.period}
                  </span>
                </div>
                {founderSpotsRemaining !== null && (
                  <p className="text-sm text-purple-600 mt-2 font-medium">
                    {founderSpotsRemaining > 0
                      ? `Only ${founderSpotsRemaining} founder spots remaining`
                      : 'Founder pricing sold out'}
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {STRINGS.pricing.founder.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg
                      className="w-5 h-5 text-purple-500 mr-3 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleStartTrial('founder')}
                disabled={loadingPlan !== null || founderSpotsRemaining === 0}
                className={cn(
                  "w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors",
                  (founderSpotsRemaining ?? 0) > 0
                    ? "bg-purple-600 hover:bg-purple-700"
                    : "bg-gray-400 cursor-not-allowed"
                )}
              >
                {loadingPlan === 'founder' ? 'Loading...' : founderSpotsRemaining === 0 ? 'Sold Out' : STRINGS.pricing.founder.cta}
              </button>
            </div>
          </div>

          {/* Standard Plan */}
          <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-blue-500">
            <div className="p-8">
              {/* Header */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {STRINGS.pricing.standard.name}
                </h3>
                <p className="text-gray-600 text-sm">
                  {STRINGS.pricing.standard.description}
                </p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-5xl font-bold text-gray-900">
                    {STRINGS.pricing.standard.price}
                  </span>
                  <span className="text-xl text-gray-600 ml-2">
                    {STRINGS.pricing.standard.period}
                  </span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {STRINGS.pricing.standard.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg
                      className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleStartTrial('standard')}
                disabled={loadingPlan !== null}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
              >
                {loadingPlan === 'standard' ? 'Loading...' : STRINGS.pricing.standard.cta}
              </button>
            </div>
          </div>
        </div>

        {/* Trial Info */}
        <div className="mt-12 max-w-3xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              {STRINGS.pricing.trial.title}
            </h3>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {STRINGS.pricing.trial.duration} OR {STRINGS.pricing.trial.showingLimit} - whichever comes first
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {STRINGS.pricing.trial.noCreditCard}
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Cancel anytime during trial - no charges
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
