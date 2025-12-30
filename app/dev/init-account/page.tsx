'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

/**
 * DEV ONLY: Account initialization page
 * Navigate to /dev/init-account to use this tool
 */
export default function DevInitAccountPage() {
  const { user, agent } = useAuth();
  const [asFounder, setAsFounder] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleInitialize = async () => {
    if (!user) {
      alert('Please sign in first');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/dev/init-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: user.uid,
          asFounder,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, data });
        // Reload the page after 2 seconds to refresh agent data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setResult({ success: false, error: data.error });
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">This page is only available in development</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🔧 Development Tool: Initialize Account
          </h1>
          <p className="text-gray-600 mb-6">
            This tool will initialize your account with proper subscription fields for testing.
          </p>

          {!user ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-amber-800">⚠️ Please sign in to use this tool</p>
              <a
                href="/login"
                className="text-blue-600 hover:text-blue-700 underline mt-2 inline-block"
              >
                Go to Login
              </a>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>Current User:</strong> {user.email}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>User ID:</strong> {user.uid}
                </p>
              </div>

              {agent && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Current Status:</p>
                  <p className="text-sm text-gray-700">
                    Subscription: {agent.subscriptionStatus || 'Not set'}
                  </p>
                  <p className="text-sm text-gray-700">
                    Trial Start: {agent.trialStartDate ? new Date(agent.trialStartDate).toLocaleString() : 'Not set'}
                  </p>
                  <p className="text-sm text-gray-700">
                    Trial Showings: {agent.trialShowingsCount ?? 'Not set'}
                  </p>
                  <p className="text-sm text-gray-700">
                    Founder: {agent.isFounderCustomer ? `Yes (#${agent.founderNumber})` : 'No'}
                  </p>
                </div>
              )}

              <div className="mb-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={asFounder}
                    onChange={(e) => setAsFounder(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">
                    Set as Founder Customer (Founder #999 for testing)
                  </span>
                </label>
              </div>

              <button
                onClick={handleInitialize}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Initializing...' : 'Initialize Account'}
              </button>

              {result && (
                <div
                  className={`mt-6 p-4 rounded-lg ${
                    result.success
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  {result.success ? (
                    <div>
                      <p className="text-green-800 font-semibold mb-2">✓ Success!</p>
                      <p className="text-sm text-green-700">
                        Your account has been initialized. The page will reload in 2 seconds...
                      </p>
                      <pre className="mt-3 text-xs bg-white p-3 rounded overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div>
                      <p className="text-red-800 font-semibold mb-2">✗ Error</p>
                      <p className="text-sm text-red-700">{result.error}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">What this does:</h3>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Sets subscriptionStatus to "trial"</li>
                  <li>Sets trialStartDate to now (giving you 14 days)</li>
                  <li>Sets trialShowingsCount to 0 (giving you 3 showings)</li>
                  <li>Optionally sets isFounderCustomer and founderNumber</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
