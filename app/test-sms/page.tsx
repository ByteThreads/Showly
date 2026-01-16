'use client';

import { useState } from 'react';
import { STYLES, cn } from '@/lib/constants/styles';
import { Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function TestSMSPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestSMS = async (type: 'booking' | 'reminder1h' | 'confirmed' | 'cancelled' | 'rescheduled') => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setResult({ success: false, message: 'Please enter a valid phone number' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const body: any = {
        to: phoneNumber,
        type,
        agentName: 'John Doe (Test)',
        address: '123 Test Street',
      };

      // Add fields based on type
      if (type === 'booking' || type === 'confirmed' || type === 'cancelled') {
        body.date = 'Jan 20';
        body.time = '2:00 PM';
      }

      if (type === 'reminder1h') {
        body.time = '2:00 PM';
      }

      if (type === 'rescheduled') {
        body.newDate = 'Jan 21';
        body.newTime = '3:00 PM';
      }

      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: `SMS sent successfully! Message ID: ${data.messageId}`,
        });
      } else {
        setResult({
          success: false,
          message: `Failed to send SMS: ${data.error}`,
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: `Error: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Send className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SMS Testing</h1>
              <p className="text-gray-600 mt-1">Test Twilio SMS integration</p>
            </div>
          </div>

          {/* Phone Number Input */}
          <div className="mb-6">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Your Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className={cn(
                STYLES.input.base,
                STYLES.input.default,
                'text-lg'
              )}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter your phone number to receive test SMS messages
            </p>
          </div>

          {/* Test Buttons */}
          <div className="space-y-3 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Test Message Types:</h2>

            <button
              onClick={() => handleTestSMS('booking')}
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-left flex items-center justify-between"
            >
              <span>📅 Booking Confirmation</span>
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            </button>

            <button
              onClick={() => handleTestSMS('reminder1h')}
              disabled={loading}
              className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-left flex items-center justify-between"
            >
              <span>⏰ 1-Hour Reminder</span>
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            </button>

            <button
              onClick={() => handleTestSMS('confirmed')}
              disabled={loading}
              className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-left flex items-center justify-between"
            >
              <span>✅ Status: Confirmed</span>
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            </button>

            <button
              onClick={() => handleTestSMS('cancelled')}
              disabled={loading}
              className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-left flex items-center justify-between"
            >
              <span>❌ Status: Cancelled</span>
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            </button>

            <button
              onClick={() => handleTestSMS('rescheduled')}
              disabled={loading}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-left flex items-center justify-between"
            >
              <span>🔄 Status: Rescheduled</span>
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            </button>
          </div>

          {/* Result Display */}
          {result && (
            <div
              className={cn(
                'p-4 rounded-lg border-2 flex items-start gap-3',
                result.success
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-red-50 border-red-200'
              )}
            >
              {result.success ? (
                <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3
                  className={cn(
                    'font-semibold mb-1',
                    result.success ? 'text-emerald-900' : 'text-red-900'
                  )}
                >
                  {result.success ? 'Success!' : 'Error'}
                </h3>
                <p
                  className={cn(
                    'text-sm',
                    result.success ? 'text-emerald-700' : 'text-red-700'
                  )}
                >
                  {result.message}
                </p>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Testing Tips</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use your own phone number to receive test messages</li>
              <li>• Check that your Twilio credentials are in .env.local</li>
              <li>• SMS may take 5-10 seconds to arrive</li>
              <li>• Check Twilio console if messages aren't arriving</li>
              <li>• Messages are ~$0.0079 each (less than 1 cent)</li>
            </ul>
          </div>

          {/* Back Link */}
          <div className="mt-6 text-center">
            <a href="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
