'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Sparkles,
  Clock,
  X,
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

  const daysRemaining = getRemainingTrialDays(agent);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        // Close on backdrop click if onClose is provided
        if (onClose && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Content */}
      <div className="relative min-h-screen px-4 py-12 flex items-center justify-center">
        <div className="relative w-full max-w-2xl bg-gray-50 rounded-3xl shadow-2xl overflow-hidden">
          {/* Close button (only if closeable) */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-200 transition-colors z-10"
              aria-label="Close and enter read-only mode"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          )}

          {/* Content Section */}
          <div className="px-8 py-16 text-center">
            {variant === 'trial_expired' && (
              <>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full text-blue-600 text-sm font-semibold mb-6">
                  <Clock className="w-4 h-4" />
                  Your 14-day trial has ended
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  Ready to Close More Deals?
                </h1>
                <p className="text-xl text-gray-600 max-w-xl mx-auto mb-10">
                  Continue streamlining your showings with Showly
                </p>
              </>
            )}

            {variant === 'upgrade_prompt' && daysRemaining > 0 && (
              <>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full text-blue-600 text-sm font-semibold mb-6">
                  <Sparkles className="w-4 h-4" />
                  Only {daysRemaining} days left in your trial
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  Don't Lose Access to Your Showings
                </h1>
                <p className="text-xl text-gray-600 max-w-xl mx-auto mb-10">
                  Upgrade now to keep managing your properties & bookings
                </p>
              </>
            )}

            {variant === 'feature_locked' && (
              <>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full text-blue-600 text-sm font-semibold mb-6">
                  <Shield className="w-4 h-4" />
                  Premium Feature
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  Unlock {featureName || 'This Feature'}
                </h1>
                <p className="text-xl text-gray-600 max-w-xl mx-auto mb-10">
                  Get unlimited access to all premium features
                </p>
              </>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 max-w-md mx-auto">
              <button
                onClick={() => router.push('/dashboard/billing')}
                className="relative block w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white text-center px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-emerald-700 transition-all hover:scale-105 transform shadow-xl hover:shadow-2xl group overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  View Pricing & Upgrade
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </button>

              {/* Read-only mode hint */}
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                >
                  Or browse in read-only mode
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
