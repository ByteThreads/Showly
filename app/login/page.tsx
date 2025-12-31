'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { STRINGS } from '@/lib/constants/strings';
import { Zap, TrendingUp, Clock, Calendar } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  const [showLinkAccount, setShowLinkAccount] = useState(false);
  const [linkData, setLinkData] = useState<{ email: string; credential: any; provider: string } | null>(null);
  const [linkPassword, setLinkPassword] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);

  const { user, signIn, signInWithGoogle, signInWithApple, linkAccountWithCredential, resetPassword } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if user is already authenticated
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  async function handleGoogleSignIn() {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      // Redirect will be handled by useEffect after auth state changes
    } catch (err: any) {
      const errorCode = err.code || '';
      const errorMessage = err.message || '';

      // Check if account linking is required
      if (errorMessage === 'ACCOUNT_LINKING_REQUIRED') {
        setLinkData({
          email: err.email,
          credential: err.credential,
          provider: err.provider
        });
        setShowLinkAccount(true);
        setLoading(false);
        return;
      }

      // Check other error types
      if (errorCode === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again.');
      } else if (errorCode === 'auth/popup-blocked') {
        setError('Pop-up blocked. Please allow pop-ups for this site.');
      } else {
        setError(getFriendlyErrorMessage(errorCode));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleSignIn() {
    setError('');
    setLoading(true);
    try {
      await signInWithApple();
      // Redirect will be handled by useEffect after auth state changes
    } catch (err: any) {
      const errorCode = err.code || '';
      const errorMessage = err.message || '';

      // Check if account linking is required
      if (errorMessage === 'ACCOUNT_LINKING_REQUIRED') {
        setLinkData({
          email: err.email,
          credential: err.credential,
          provider: err.provider
        });
        setShowLinkAccount(true);
        setLoading(false);
        return;
      }

      // Check other error types
      if (errorCode === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again.');
      } else if (errorCode === 'auth/popup-blocked') {
        setError('Pop-up blocked. Please allow pop-ups for this site.');
      } else {
        setError(getFriendlyErrorMessage(errorCode));
      }
    } finally {
      setLoading(false);
    }
  }

  function getFriendlyErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Incorrect email or password. Please try again.';
      case 'auth/too-many-requests':
        return 'Too many failed login attempts. Please try again later or reset your password.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      default:
        return 'Unable to sign in. Please try again or contact support.';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      const errorCode = err.code || '';
      const friendlyMessage = getFriendlyErrorMessage(errorCode);
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError('');
    setResetSuccess(false);

    try {
      await resetPassword(resetEmail);
      setResetSuccess(true);
      setResetEmail('');
    } catch (err: any) {
      setResetError(err.message || 'Failed to send password reset email');
    }
  }

  async function handleLinkAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!linkData) return;

    setLinkError('');
    setLinkLoading(true);

    try {
      await linkAccountWithCredential(linkData.email, linkPassword, linkData.credential);
      // Successfully linked and signed in
      router.push('/dashboard');
    } catch (err: any) {
      const errorCode = err.code || '';
      if (errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
        setLinkError('Incorrect password. Please try again.');
      } else {
        setLinkError(err.message || 'Failed to link accounts');
      }
    } finally {
      setLinkLoading(false);
    }
  }

  const stats = [
    { icon: Zap, label: 'Save 10+ hours/week', color: 'from-blue-200 to-emerald-200' },
    { icon: TrendingUp, label: 'Book more showings', color: 'from-emerald-200 to-blue-200' },
    { icon: Clock, label: 'Instant scheduling', color: 'from-blue-200 to-emerald-200' },
    { icon: Calendar, label: 'Never double-book', color: 'from-emerald-200 to-blue-200' },
  ];

  return (
    <div className="min-h-screen flex pt-16">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-24 py-12 relative bg-white">
        {/* Subtle background decoration */}
        <div className="absolute top-20 right-10 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-20 left-10 w-32 h-32 bg-emerald-100 rounded-full blur-3xl opacity-20"></div>

        <div className="max-w-md w-full mx-auto relative z-10">
          {/* Logo/Brand */}
          <Link href="/" className="inline-block mb-8">
            <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
              {STRINGS.brand.name}
            </span>
          </Link>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Welcome back
            </h1>
            <p className="text-gray-600 text-lg">
              Sign in to continue scheduling showings
            </p>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all mb-3 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Apple Sign In */}
          <button
            onClick={handleAppleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all mb-6 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continue with Apple
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">OR</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowResetPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] group overflow-hidden disabled:opacity-50"
            >
              <span className="relative z-10">
                {loading ? 'Signing in...' : 'Sign in'}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-500 text-center">
            Don't have an account?{' '}
            <Link href="/signup" className="text-blue-600 font-semibold hover:text-blue-700">
              Sign up →
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Stats & Welcome */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-50 via-white to-emerald-50 relative overflow-hidden">
        {/* Animated background elements */}
        <svg className="absolute top-32 left-20 w-48 h-48 mix-blend-multiply filter blur-md opacity-20 animate-blob" viewBox="0 0 100 100">
          <rect x="25" y="50" width="50" height="40" fill="#93c5fd" />
          <path d="M 15 50 L 50 25 L 85 50 Z" fill="#60a5fa" />
          <rect x="58" y="58" width="10" height="10" fill="#f0f9ff" />
          <rect x="43" y="72" width="14" height="18" fill="#f0f9ff" />
        </svg>
        <svg className="absolute bottom-20 right-20 w-40 h-40 mix-blend-multiply filter blur-md opacity-20 animate-blob animation-delay-2000" viewBox="0 0 100 100">
          <rect x="25" y="50" width="50" height="40" fill="#6ee7b7" />
          <path d="M 15 50 L 50 25 L 85 50 Z" fill="#34d399" />
          <rect x="32" y="58" width="10" height="10" fill="#f0f9ff" />
          <rect x="43" y="72" width="14" height="18" fill="#f0f9ff" />
        </svg>

        <div className="flex flex-col justify-center px-12 xl:px-20 relative z-10 w-full">
          <div className="max-w-lg">
            {/* Welcome Message */}
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Ready to streamline your showings?
            </h2>
            <p className="text-xl text-gray-600 mb-12">
              Your properties and scheduled showings are waiting for you.
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="flex items-stretch bg-white/60 backdrop-blur-sm rounded-xl overflow-hidden shadow-md hover:bg-white/80 transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  <div className={`w-14 bg-gradient-to-r ${stat.color} flex items-center justify-center flex-shrink-0`}>
                    <stat.icon className="w-5 h-5 text-blue-700" strokeWidth={2} />
                  </div>
                  <p className="text-gray-900 font-medium py-3 px-3 text-sm flex items-center">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-12 p-6 bg-gradient-to-r from-blue-100 to-emerald-100 rounded-2xl border-2 border-blue-200 shadow-md hover:shadow-lg transition-all">
              <p className="text-sm font-medium mb-2 text-gray-700">🎉 New to Showly?</p>
              <p className="text-lg font-semibold mb-3 text-gray-900">Start your free trial today</p>
              <Link
                href="/signup"
                className="inline-block bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            {/* Close button */}
            <button
              onClick={() => {
                setShowResetPassword(false);
                setResetSuccess(false);
                setResetError('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
            <p className="text-gray-600 mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            {resetSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg mb-6">
                <p className="text-emerald-800 font-medium">
                  Password reset email sent! Check your inbox.
                </p>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {resetError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {resetError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Send Reset Link
                </button>
              </form>
            )}

            {resetSuccess && (
              <button
                onClick={() => {
                  setShowResetPassword(false);
                  setResetSuccess(false);
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors mt-4"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}

      {/* Account Linking Modal */}
      {showLinkAccount && linkData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            {/* Close button */}
            <button
              onClick={() => {
                setShowLinkAccount(false);
                setLinkData(null);
                setLinkPassword('');
                setLinkError('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Your Account</h2>
            <p className="text-gray-600 mb-6">
              An account with <span className="font-semibold">{linkData.email}</span> already exists.
              Enter your password to link your {linkData.provider === 'google' ? 'Google' : 'Apple'} account.
            </p>

            <form onSubmit={handleLinkAccount} className="space-y-4">
              {linkError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {linkError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoFocus
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={linkLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {linkLoading ? 'Linking accounts...' : 'Link Accounts'}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                After linking, you'll be able to sign in with either your email/password or {linkData.provider === 'google' ? 'Google' : 'Apple'}.
              </p>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          14% {
            transform: translate(45px, -70px) scale(1.05) rotate(3deg);
          }
          28% {
            transform: translate(80px, -30px) scale(0.95) rotate(-2deg);
          }
          42% {
            transform: translate(60px, 50px) scale(1.08) rotate(4deg);
          }
          57% {
            transform: translate(-20px, 80px) scale(0.92) rotate(-3deg);
          }
          71% {
            transform: translate(-70px, 40px) scale(1.03) rotate(2deg);
          }
          85% {
            transform: translate(-50px, -40px) scale(0.98) rotate(-1deg);
          }
        }

        .animate-blob {
          animation: blob 12s ease-in-out infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}
