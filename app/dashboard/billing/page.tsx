'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { STRINGS } from '@/lib/constants/strings';
import { STYLES, cn } from '@/lib/constants/styles';
import {
  hasActiveSubscription,
  isInTrial,
  getRemainingTrialDays,
  getRemainingTrialShowings,
  getSubscriptionDisplayName,
  getSubscriptionBadgeColor,
  isFounderCustomer,
} from '@/lib/utils/subscription';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Calendar,
  Zap,
  Shield,
  Sparkles,
  Crown
} from 'lucide-react';

export default function BillingPage() {
  const router = useRouter();
  const { user, agent, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">{STRINGS.common.loading}</div>
      </div>
    );
  }

  if (!user || !agent) {
    router.push('/login');
    return null;
  }

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/create-billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to open billing portal');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      alert('Failed to open billing portal. Please try again.');
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    router.push('/pricing');
  };

  const inTrial = isInTrial(agent);
  const hasActiveSub = hasActiveSubscription(agent);
  const isFounder = isFounderCustomer(agent);
  const displayName = getSubscriptionDisplayName(agent);
  const badgeColor = getSubscriptionBadgeColor(agent);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{STRINGS.billing.title}</h1>
        <p className="text-gray-600 mt-2">{STRINGS.billing.subtitle}</p>
      </div>

      {/* Current Plan Card - Enhanced */}
      <div className="bg-gradient-to-br from-blue-50 to-emerald-50 rounded-2xl shadow-lg border border-blue-200 p-8 mb-6 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-200/30 to-emerald-200/30 rounded-full blur-3xl -mr-32 -mt-32"></div>

        <div className="relative">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-600 mb-1">
                  {STRINGS.billing.currentPlan}
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                    {displayName}
                  </span>
                  <span className={cn('px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm', badgeColor)}>
                    {STRINGS.billing.status[agent.subscriptionStatus] || agent.subscriptionStatus}
                  </span>
                  {isFounder && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Founder #{agent.founderNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-white/80 shadow-sm">
            {inTrial && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-blue-700">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">{STRINGS.pricing.upgrade.remainingDays(getRemainingTrialDays(agent))}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-700">
                  <Zap className="w-4 h-4" />
                  <span className="font-medium">{STRINGS.pricing.upgrade.remainingShowings(getRemainingTrialShowings(agent))}</span>
                </div>
              </div>
            )}

            {agent.subscriptionStatus === 'active' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-lg">
                    {isFounder ? '$29' : '$39'}<span className="text-sm font-normal text-gray-600">/month</span>
                  </span>
                  {isFounder && <Sparkles className="w-4 h-4 text-purple-500" />}
                  <span className="text-sm text-gray-600">
                    {isFounder ? 'Founder pricing locked in forever' : 'Billed monthly'}
                  </span>
                </div>
                {agent.subscriptionEndDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>
                      {STRINGS.billing.nextBilling}:{' '}
                      {new Date(agent.subscriptionEndDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
            )}

            {agent.subscriptionStatus === 'past_due' && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900">Payment Past Due</p>
                  <p className="text-sm text-amber-700 mt-1">Please update your payment method to continue using Showly.</p>
                </div>
              </div>
            )}

            {agent.subscriptionStatus === 'cancelled' && (
              <div className="text-sm text-gray-700">
                <p className="font-medium">Subscription cancelled</p>
                {agent.subscriptionEndDate && (
                  <p className="mt-1 text-gray-600">
                    Access until:{' '}
                    {new Date(agent.subscriptionEndDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            {agent.subscriptionStatus === 'active' && agent.stripeCustomerId && (
              <button
                onClick={handleManageBilling}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40"
              >
                <CreditCard className="w-5 h-5" />
                {loading ? STRINGS.common.loading : STRINGS.billing.manageBilling}
              </button>
            )}

            {(agent.subscriptionStatus === 'trial' ||
              agent.subscriptionStatus === 'inactive' ||
              agent.subscriptionStatus === 'cancelled') && (
              <button
                onClick={handleUpgrade}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/40"
              >
                <Sparkles className="w-5 h-5" />
                {STRINGS.pricing.upgrade.upgradeButton}
              </button>
            )}

            {agent.subscriptionStatus === 'past_due' && agent.stripeCustomerId && (
              <button
                onClick={handleManageBilling}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl font-medium shadow-lg shadow-amber-500/30 transition-all hover:shadow-xl hover:shadow-amber-500/40"
              >
                <Shield className="w-5 h-5" />
                {loading ? STRINGS.common.loading : STRINGS.billing.updatePayment}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Trial Information */}
      {inTrial && (
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Free Trial Active</h3>
          </div>
          <p className="text-gray-600 mb-6">
            Your trial will end when you reach 14 days or 3 showings, whichever comes first.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-medium text-gray-600">Days Remaining</p>
              </div>
              <p className="text-4xl font-bold text-gray-900">{getRemainingTrialDays(agent)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-medium text-gray-600">Showings Remaining</p>
              </div>
              <p className="text-4xl font-bold text-gray-900">{getRemainingTrialShowings(agent)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Features Included */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Plan Features</h2>
        <div className="grid md:grid-cols-2 gap-5">
          {[
            { text: 'Unlimited property listings', icon: 'home' },
            { text: 'Unlimited showings', icon: 'zap' },
            { text: 'Email notifications', icon: 'mail' },
            { text: 'Custom branding', icon: 'sparkles' },
            { text: 'Automated reminders', icon: 'clock' },
            { text: 'Calendar integration', icon: 'calendar' },
            { text: isFounder ? 'Priority support' : 'Standard support', icon: 'shield' },
            { text: 'Mobile-friendly booking pages', icon: 'check' },
          ].map((feature, index) => (
            <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-emerald-50 transition-colors group">
              <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 group-hover:bg-emerald-200 rounded-lg flex items-center justify-center transition-colors">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-gray-700 font-medium">{feature.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-8 text-center">
        <p className="text-gray-600">
          Need help?{' '}
          <a
            href="mailto:support@showly.app"
            className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
