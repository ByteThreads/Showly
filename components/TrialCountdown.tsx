'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/constants/styles';
import { Clock, Sparkles, X, Zap, Crown, TrendingUp } from 'lucide-react';
import { getRemainingTrialDays, isInTrial } from '@/lib/utils/subscription';

export default function TrialCountdown() {
  const router = useRouter();
  const { agent } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!agent || !isInTrial(agent) || dismissed) return null;

  const daysRemaining = getRemainingTrialDays(agent);

  // Don't show if more than 7 days remaining (show when urgency is high)
  if (daysRemaining > 7) return null;

  const handleDismiss = () => {
    setDismissed(true);
  };

  const handleUpgrade = () => {
    router.push('/pricing');
  };

  // Different urgency levels
  const urgencyLevel =
    daysRemaining === 0
      ? 'critical'
      : daysRemaining <= 2
      ? 'high'
      : daysRemaining <= 5
      ? 'medium'
      : 'low';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl shadow-lg mb-6 transition-all duration-500',
        urgencyLevel === 'critical' &&
          'bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse',
        urgencyLevel === 'high' &&
          'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500',
        urgencyLevel === 'medium' &&
          'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500',
        urgencyLevel === 'low' &&
          'bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500'
      )}
    >
      {/* Animated background effect */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-2xl animate-blob" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full blur-2xl animate-blob animation-delay-2000" />
      </div>

      <div className="relative px-6 py-4">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Icon & Message */}
          <div className="flex items-center gap-4 flex-1">
            <div className="flex-shrink-0">
              {urgencyLevel === 'critical' || urgencyLevel === 'high' ? (
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-bounce">
                  <Zap className="w-8 h-8 text-white" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Clock className="w-8 h-8 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1">
              {daysRemaining === 0 ? (
                <>
                  <h3 className="text-2xl font-bold text-white mb-1">
                    ⏰ Trial Ends Today!
                  </h3>
                  <p className="text-white/90 text-sm md:text-base">
                    Don't lose access to your showings and properties. Upgrade now to continue!
                  </p>
                </>
              ) : daysRemaining === 1 ? (
                <>
                  <h3 className="text-2xl font-bold text-white mb-1">
                    ⚡ Last Day of Your Trial
                  </h3>
                  <p className="text-white/90 text-sm md:text-base">
                    Your trial ends tomorrow. Upgrade now to keep managing your showings seamlessly!
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-white mb-1">
                    <Clock className="w-5 h-5 inline mr-2" />
                    {daysRemaining} Days Left in Your Trial
                  </h3>
                  <p className="text-white/90 text-sm md:text-base">
                    Upgrade now and save $10/month with Founder pricing (limited spots!)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Stats & CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Quick stats */}
            {daysRemaining > 2 && (
              <div className="hidden lg:flex items-center gap-4">
                <div className="text-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                  <div className="text-sm text-white/80">Save</div>
                  <div className="text-xl font-bold text-white">$10/mo</div>
                </div>
                <div className="text-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                  <div className="text-sm text-white/80">ROI</div>
                  <div className="text-xl font-bold text-white">3-5x</div>
                </div>
              </div>
            )}

            {/* CTA Button */}
            <button
              onClick={handleUpgrade}
              className={cn(
                'group relative px-8 py-4 bg-white font-bold rounded-xl shadow-2xl transition-all hover:scale-105 whitespace-nowrap',
                urgencyLevel === 'critical' || urgencyLevel === 'high'
                  ? 'text-red-600 hover:shadow-white/50'
                  : urgencyLevel === 'medium'
                  ? 'text-amber-600 hover:shadow-white/50'
                  : 'text-blue-600 hover:shadow-white/50'
              )}
            >
              <div className="flex items-center gap-2">
                {urgencyLevel === 'critical' || urgencyLevel === 'high' ? (
                  <>
                    <Zap className="w-5 h-5" />
                    Upgrade Now
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5" />
                    Get Founder Pricing
                  </>
                )}
              </div>
              <div className="text-xs font-normal opacity-75 mt-1">
                {urgencyLevel === 'critical' || urgencyLevel === 'high'
                  ? 'Before you lose access'
                  : 'Lock in $29/mo forever'}
              </div>
            </button>
          </div>
        </div>

        {/* Progress bar at bottom */}
        <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${((14 - daysRemaining) / 14) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
