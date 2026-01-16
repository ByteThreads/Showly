'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { STRINGS } from '@/lib/constants/strings';
import { cn } from '@/lib/constants/styles';
import {
  Sparkles,
  TrendingUp,
  Clock,
  Users,
  CheckCircle2,
  X,
  Zap,
  Crown,
  Target,
  Calendar,
  Shield,
} from 'lucide-react';
import { getRemainingTrialDays } from '@/lib/utils/subscription';

interface PaywallModalProps {
  isOpen: boolean;
  onClose?: () => void;
  variant?: 'trial_expired' | 'feature_locked' | 'upgrade_prompt';
  featureName?: string;
}

export default function PaywallModal({
  isOpen,
  onClose,
  variant = 'trial_expired',
  featureName,
}: PaywallModalProps) {
  const router = useRouter();
  const { agent } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<'founder' | 'standard' | null>(null);
  const [founderSpotsRemaining, setFounderSpotsRemaining] = useState<number | null>(200);

  const daysRemaining = getRemainingTrialDays(agent);

  // Check founder spots remaining
  useEffect(() => {
    if (!isOpen) return;

    const checkFounderSpots = async () => {
      try {
        const response = await fetch('/api/founder-spots');
        const data = await response.json();
        if (data.remaining !== undefined) {
          setFounderSpotsRemaining(data.remaining);
        }
      } catch (error) {
        console.error('Error fetching founder spots:', error);
      }
    };

    checkFounderSpots();
  }, [isOpen]);

  const handleUpgrade = async (priceType: 'founder' | 'standard') => {
    if (!agent) return;

    setLoadingPlan(priceType);

    try {
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
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error starting upgrade:', error);
      alert('Failed to start upgrade. Please try again.');
      setLoadingPlan(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Animated backdrop */}
      <div
        className="fixed inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 transition-opacity"
        style={{ opacity: 0.97 }}
      >
        {/* Animated blobs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Content */}
      <div className="relative min-h-screen px-4 py-12 flex items-center justify-center">
        <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Close button (only if closeable) */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          )}

          {/* Hero Section */}
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 px-8 py-12 text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-10 right-10 w-64 h-64 bg-white rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
              {variant === 'trial_expired' && (
                <>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-4">
                    <Clock className="w-4 h-4" />
                    Your 14-day trial has ended
                  </div>
                  <h1 className="text-5xl font-bold text-white mb-4">
                    Ready to Close More Deals?
                  </h1>
                  <p className="text-2xl text-blue-100 max-w-3xl mx-auto mb-6">
                    Continue streamlining your showings with Showly
                  </p>
                </>
              )}

              {variant === 'upgrade_prompt' && daysRemaining > 0 && (
                <>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/30 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-4">
                    <Sparkles className="w-4 h-4" />
                    Only {daysRemaining} days left in your trial
                  </div>
                  <h1 className="text-5xl font-bold text-white mb-4">
                    Don't Lose Access to Your Showings
                  </h1>
                  <p className="text-2xl text-blue-100 max-w-3xl mx-auto mb-6">
                    Upgrade now to keep managing your {' '}
                    <span className="text-white font-bold">properties & bookings</span>
                  </p>
                </>
              )}

              {variant === 'feature_locked' && (
                <>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-4">
                    <Shield className="w-4 h-4" />
                    Premium Feature
                  </div>
                  <h1 className="text-5xl font-bold text-white mb-4">
                    Unlock {featureName || 'This Feature'}
                  </h1>
                  <p className="text-2xl text-blue-100 max-w-3xl mx-auto mb-6">
                    Get unlimited access to all premium features
                  </p>
                </>
              )}

            </div>
          </div>

          {/* Benefits Section */}
          <div className="px-8 py-8 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full text-blue-800 text-sm font-semibold mb-3">
                <Sparkles className="w-4 h-4" />
                What You Get
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Streamlined Showing Management
              </h2>
              <p className="text-gray-600">
                Automated booking, instant notifications, and calendar sync
              </p>
            </div>

            <div className="grid grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 mb-1">24/7</div>
                <div className="text-xs text-gray-600">Automated Booking</div>
              </div>
              <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 mb-1">Sync</div>
                <div className="text-xs text-gray-600">Google Calendar</div>
              </div>
              <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <Zap className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 mb-1">Instant</div>
                <div className="text-xs text-gray-600">Notifications</div>
              </div>
              <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <Users className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 mb-1">Easy</div>
                <div className="text-xs text-gray-600">Client Booking</div>
              </div>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="px-8 py-12">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
              Choose Your Plan
            </h2>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Founder Plan */}
              {founderSpotsRemaining && founderSpotsRemaining > 0 && (
                <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-xl overflow-hidden border-4 border-purple-500 transform hover:scale-105 transition-all duration-300">
                  {/* Popular badge */}
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center py-2 text-sm font-bold">
                    ⚡ BEST VALUE - {founderSpotsRemaining} SPOTS LEFT ⚡
                  </div>

                  <div className="p-8 mt-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Crown className="w-8 h-8 text-purple-600" />
                      <h3 className="text-3xl font-bold text-gray-900">Founder Plan</h3>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                          $29
                        </span>
                        <span className="text-xl text-gray-600">/month</span>
                      </div>
                      <div className="mt-2 inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                        Save $10/mo — $120/year
                      </div>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {[
                        'Locked-in founder pricing forever',
                        'Unlimited properties & showings',
                        'Priority 24/7 support',
                        'Early access to new features',
                        'Dedicated account manager',
                        'Custom branding & white-label',
                      ].map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleUpgrade('founder')}
                      disabled={loadingPlan !== null}
                      className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold text-lg shadow-2xl shadow-purple-500/50 transition-all hover:shadow-purple-500/70 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingPlan === 'founder' ? 'Loading...' : '🔥 Claim Founder Spot'}
                    </button>

                    <p className="text-center text-xs text-gray-500 mt-3">
                      Pricing locked in forever • Only {founderSpotsRemaining} spots remaining
                    </p>
                  </div>
                </div>
              )}

              {/* Standard Plan */}
              <div className={cn(
                "relative bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-blue-300 hover:border-blue-500 transition-all duration-300",
                (founderSpotsRemaining ?? 0) > 0 && "hover:scale-105"
              )}>
                <div className="p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-8 h-8 text-blue-600" />
                    <h3 className="text-3xl font-bold text-gray-900">Pro Plan</h3>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-bold text-gray-900">$39</span>
                      <span className="text-xl text-gray-600">/month</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      Standard pricing
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {[
                      'Unlimited properties & showings',
                      'Email & SMS notifications',
                      'Google Calendar sync',
                      'Custom branding',
                      'Analytics & insights',
                      'Standard support',
                    ].map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgrade('standard')}
                    disabled={loadingPlan !== null}
                    className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingPlan === 'standard' ? 'Loading...' : 'Get Pro Plan'}
                  </button>
                </div>
              </div>
            </div>

            {/* Cancel anytime */}
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 border border-blue-200 rounded-full">
                <Shield className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800 font-semibold">
                  Cancel anytime • No long-term commitment
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
