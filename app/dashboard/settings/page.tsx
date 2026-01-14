'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { posthog } from '@/lib/posthog';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { STRINGS } from '@/lib/constants/strings';
import { STYLES, cn } from '@/lib/constants/styles';
import type { AgentSettings, WorkingHours, EmailBranding } from '@/types/database';
import { uploadImage, validateImageFile } from '@/lib/utils/upload-image';
import { Calendar, Check, X } from 'lucide-react';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
type DayOfWeek = typeof DAYS[number];

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings state
  const [defaultShowingDuration, setDefaultShowingDuration] = useState(30);
  const [bufferTime, setBufferTime] = useState(15);
  const [bookingWindow, setBookingWindow] = useState(14);
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [showCustomBuffer, setShowCustomBuffer] = useState(false);
  const [customDurationInput, setCustomDurationInput] = useState('');
  const [customBufferInput, setCustomBufferInput] = useState('');
  const [workingHours, setWorkingHours] = useState<Record<DayOfWeek, WorkingHours>>({
    monday: { start: '09:00', end: '17:00', enabled: true },
    tuesday: { start: '09:00', end: '17:00', enabled: true },
    wednesday: { start: '09:00', end: '17:00', enabled: true },
    thursday: { start: '09:00', end: '17:00', enabled: true },
    friday: { start: '09:00', end: '17:00', enabled: true },
    saturday: { start: '10:00', end: '16:00', enabled: true },
    sunday: { start: '10:00', end: '16:00', enabled: false },
  });

  // Email branding state
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#2563EB'); // Blue-600
  const [accentColor, setAccentColor] = useState('#10B981'); // Emerald-500
  const [footerText, setFooterText] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Google Calendar sync state
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false);
  const [connectingCalendar, setConnectingCalendar] = useState(false);
  const [disconnectingCalendar, setDisconnectingCalendar] = useState(false);

  // Load settings from Firestore
  useEffect(() => {
    async function loadSettings() {
      if (!user) return;

      try {
        const agentDoc = await getDoc(doc(db, 'agents', user.uid));
        if (agentDoc.exists()) {
          const data = agentDoc.data();
          const settings = data.settings as AgentSettings;

          if (settings) {
            const duration = settings.defaultShowingDuration || 30;
            const buffer = settings.bufferTime || 15;

            // Check if duration is custom (not a preset option)
            if (![15, 30, 45, 60].includes(duration)) {
              setShowCustomDuration(true);
              setCustomDurationInput(duration.toString());
            }
            setDefaultShowingDuration(duration);

            // Check if buffer is custom (not a preset option)
            if (![0, 15, 30].includes(buffer)) {
              setShowCustomBuffer(true);
              setCustomBufferInput(buffer.toString());
            }
            setBufferTime(buffer);

            setBookingWindow(settings.bookingWindow || 14);
            if (settings.workingHours) {
              setWorkingHours(settings.workingHours);
            }

            // Load email branding
            if (settings.emailBranding) {
              const branding = settings.emailBranding;
              if (branding.brandLogo) setBrandLogo(branding.brandLogo);
              if (branding.primaryColor) setPrimaryColor(branding.primaryColor);
              if (branding.accentColor) setAccentColor(branding.accentColor);
              if (branding.footerText) setFooterText(branding.footerText);
            }

            // Load calendar sync status
            setCalendarSyncEnabled(settings.googleCalendarSync || false);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setMessage({ type: 'error', text: STRINGS.settings.error });
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [user]);

  // Check for OAuth callback messages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('calendar_success') === 'true') {
      setMessage({ type: 'success', text: 'Google Calendar connected successfully!' });
      setCalendarSyncEnabled(true);
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/settings');
    }

    if (params.get('calendar_error')) {
      const error = params.get('calendar_error');
      const errorDetails = params.get('error_details');
      let errorMessage = 'Failed to connect Google Calendar';
      if (error === 'denied') errorMessage = 'Calendar authorization was denied';
      if (error === 'no_code') errorMessage = 'No authorization code received';
      if (error === 'invalid_state') errorMessage = 'Invalid state parameter';
      if (errorDetails) errorMessage += `: ${errorDetails}`;
      setMessage({ type: 'error', text: errorMessage });
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/settings');
    }
  }, []);

  // Update working hours for a specific day
  function updateWorkingHoursForDay(day: DayOfWeek, field: keyof WorkingHours, value: string | boolean) {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  }

  // Handle logo upload
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validationError = validateImageFile(file);
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
      return;
    }

    setUploadingLogo(true);
    setMessage(null);

    try {
      const logoURL = await uploadImage(file, 'branding');
      setBrandLogo(logoURL);
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      const errorMessage = err?.message || 'Failed to upload logo. Please try again.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setUploadingLogo(false);
    }

    // Reset file input
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  }

  // Remove logo
  function handleRemoveLogo() {
    setBrandLogo(null);
  }

  // Reset email branding to defaults
  function handleResetBranding() {
    setBrandLogo(null);
    setPrimaryColor('#2563EB');
    setAccentColor('#10B981');
    setFooterText('');
  }

  // Connect Google Calendar
  async function handleConnectCalendar() {
    if (!user) return;

    setConnectingCalendar(true);
    setMessage(null);

    try {
      const response = await fetch('/api/calendar/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: user.uid }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate calendar connection');
      }

      // Redirect to Google OAuth consent screen
      window.location.href = data.authUrl;
    } catch (error: any) {
      console.error('Error connecting calendar:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to connect calendar' });
      setConnectingCalendar(false);
    }
  }

  // Disconnect Google Calendar
  async function handleDisconnectCalendar() {
    if (!user) return;

    if (!confirm('Are you sure you want to disconnect Google Calendar? Existing calendar events will not be deleted, but new showings will not sync automatically.')) {
      return;
    }

    setDisconnectingCalendar(true);
    setMessage(null);

    try {
      const response = await fetch('/api/calendar/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: user.uid }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect calendar');
      }

      setCalendarSyncEnabled(false);
      setMessage({ type: 'success', text: 'Google Calendar disconnected successfully' });
    } catch (error: any) {
      console.error('Error disconnecting calendar:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to disconnect calendar' });
    } finally {
      setDisconnectingCalendar(false);
    }
  }

  // Save settings to Firestore
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      const agentRef = doc(db, 'agents', user.uid);

      // Build email branding object (only include fields with values)
      const emailBranding: EmailBranding = {};
      if (brandLogo) emailBranding.brandLogo = brandLogo;
      if (primaryColor) emailBranding.primaryColor = primaryColor;
      if (accentColor) emailBranding.accentColor = accentColor;
      if (footerText) emailBranding.footerText = footerText;

      await updateDoc(agentRef, {
        'settings.defaultShowingDuration': defaultShowingDuration,
        'settings.bufferTime': bufferTime,
        'settings.bookingWindow': bookingWindow,
        'settings.workingHours': workingHours,
        'settings.emailBranding': emailBranding,
        updatedAt: Timestamp.now(),
      });

      // Track settings update
      const enabledDays = DAYS.filter(day => workingHours[day].enabled).length;
      const hasCustomBranding = !!(brandLogo || footerText);
      posthog.capture('settings_updated', {
        showing_duration: defaultShowingDuration,
        buffer_time: bufferTime,
        booking_window: bookingWindow,
        enabled_days_count: enabledDays,
        has_custom_branding: hasCustomBranding,
      });

      // Track feature discovery - email branding
      if (hasCustomBranding) {
        posthog.capture('feature_discovered_email_branding', {
          has_logo: !!brandLogo,
          has_custom_footer: !!footerText,
          has_custom_colors: primaryColor !== '#2563EB' || accentColor !== '#10B981',
        });
      }

      setMessage({ type: 'success', text: STRINGS.settings.saved });

      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: STRINGS.settings.error });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={STYLES.loading.overlay}>
        <div>
          <div className={STYLES.loading.spinner} />
          <p className={STYLES.loading.text}>{STRINGS.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={STYLES.dashboard.content}>
      <div className={STYLES.dashboard.header}>
        <h1 className={STYLES.text.h2}>{STRINGS.settings.title}</h1>
        <p className={STYLES.text.muted}>{STRINGS.settings.subtitle}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
        {/* Working Hours Section */}
        <div className={STYLES.container.card}>
          <h2 className={STYLES.text.h3}>{STRINGS.settings.workingHoursTitle}</h2>
          <p className={cn(STYLES.text.small, 'mb-6')}>{STRINGS.settings.workingHoursDescription}</p>

          <div className="space-y-4">
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-4 pb-4 border-b border-gray-200 last:border-0">
                {/* Day Name + Toggle */}
                <div className="w-32">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={workingHours[day].enabled}
                      onChange={(e) => updateWorkingHoursForDay(day, 'enabled', e.target.checked)}
                      className="mr-2 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className={cn(STYLES.text.base, 'font-medium capitalize')}>
                      {STRINGS.settings.days[day]}
                    </span>
                  </label>
                </div>

                {/* Time Inputs */}
                {workingHours[day].enabled ? (
                  <>
                    <div className="flex-1">
                      <label className={cn(STYLES.label.default, 'text-xs')}>{STRINGS.settings.startTime}</label>
                      <input
                        type="time"
                        value={workingHours[day].start}
                        onChange={(e) => updateWorkingHoursForDay(day, 'start', e.target.value)}
                        className={cn(STYLES.input.base, STYLES.input.default)}
                      />
                    </div>
                    <div className="flex-1">
                      <label className={cn(STYLES.label.default, 'text-xs')}>{STRINGS.settings.endTime}</label>
                      <input
                        type="time"
                        value={workingHours[day].end}
                        onChange={(e) => updateWorkingHoursForDay(day, 'end', e.target.value)}
                        className={cn(STYLES.input.base, STYLES.input.default)}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex-1">
                    <span className={STYLES.text.muted}>{STRINGS.settings.dayDisabled}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Showing Duration Section */}
        <div className={STYLES.container.card}>
          <h2 className={STYLES.text.h3}>{STRINGS.settings.showingDurationTitle}</h2>
          <p className={cn(STYLES.text.small, 'mb-6')}>{STRINGS.settings.showingDurationDescription}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[15, 30, 45, 60].map((duration) => (
              <button
                key={duration}
                type="button"
                onClick={() => {
                  setDefaultShowingDuration(duration);
                  setShowCustomDuration(false);
                }}
                className={cn(
                  'p-4 rounded-lg border-2 font-semibold transition-all',
                  defaultShowingDuration === duration && !showCustomDuration
                    ? 'bg-blue-600 border-blue-700 text-white shadow-md'
                    : 'bg-white border-gray-300 text-gray-900 hover:border-blue-600 hover:bg-blue-50'
                )}
              >
                {STRINGS.settings.durationOptions[duration as keyof typeof STRINGS.settings.durationOptions]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowCustomDuration(true)}
              className={cn(
                'p-4 rounded-lg border-2 font-semibold transition-all',
                showCustomDuration
                  ? 'bg-blue-600 border-blue-700 text-white shadow-md'
                  : 'bg-white border-gray-300 text-gray-900 hover:border-blue-600 hover:bg-blue-50'
              )}
            >
              {STRINGS.settings.customDuration}
            </button>
          </div>

          {/* Custom Duration Input */}
          {showCustomDuration && (
            <div className="mt-4">
              <label className={STYLES.label.default}>{STRINGS.settings.customDuration}</label>
              <input
                type="number"
                min="5"
                max="180"
                value={customDurationInput}
                onChange={(e) => {
                  setCustomDurationInput(e.target.value);
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    setDefaultShowingDuration(value);
                  }
                }}
                placeholder={STRINGS.settings.customDurationPlaceholder}
                className={cn(STYLES.input.base, STYLES.input.default)}
              />
            </div>
          )}
        </div>

        {/* Buffer Time Section */}
        <div className={STYLES.container.card}>
          <h2 className={STYLES.text.h3}>{STRINGS.settings.bufferTimeTitle}</h2>
          <p className={cn(STYLES.text.small, 'mb-6')}>{STRINGS.settings.bufferTimeDescription}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[0, 15, 30].map((buffer) => (
              <button
                key={buffer}
                type="button"
                onClick={() => {
                  setBufferTime(buffer);
                  setShowCustomBuffer(false);
                }}
                className={cn(
                  'p-4 rounded-lg border-2 font-semibold transition-all',
                  bufferTime === buffer && !showCustomBuffer
                    ? 'bg-blue-600 border-blue-700 text-white shadow-md'
                    : 'bg-white border-gray-300 text-gray-900 hover:border-blue-600 hover:bg-blue-50'
                )}
              >
                {STRINGS.settings.bufferOptions[buffer as keyof typeof STRINGS.settings.bufferOptions]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowCustomBuffer(true)}
              className={cn(
                'p-4 rounded-lg border-2 font-semibold transition-all',
                showCustomBuffer
                  ? 'bg-blue-600 border-blue-700 text-white shadow-md'
                  : 'bg-white border-gray-300 text-gray-900 hover:border-blue-600 hover:bg-blue-50'
              )}
            >
              {STRINGS.settings.customBuffer}
            </button>
          </div>

          {/* Custom Buffer Input */}
          {showCustomBuffer && (
            <div className="mt-4">
              <label className={STYLES.label.default}>{STRINGS.settings.customBuffer}</label>
              <input
                type="number"
                min="0"
                max="120"
                value={customBufferInput}
                onChange={(e) => {
                  setCustomBufferInput(e.target.value);
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 0) {
                    setBufferTime(value);
                  }
                }}
                placeholder={STRINGS.settings.customBufferPlaceholder}
                className={cn(STYLES.input.base, STYLES.input.default)}
              />
            </div>
          )}
        </div>

        {/* Booking Window Section */}
        <div className={STYLES.container.card}>
          <h2 className={STYLES.text.h3}>{STRINGS.settings.bookingWindowTitle}</h2>
          <p className={cn(STYLES.text.small, 'mb-6')}>{STRINGS.settings.bookingWindowDescription}</p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[7, 14, 30, 60, 90].map((window) => (
              <button
                key={window}
                type="button"
                onClick={() => setBookingWindow(window)}
                className={cn(
                  'p-4 rounded-lg border-2 font-semibold transition-all',
                  bookingWindow === window
                    ? 'bg-blue-600 border-blue-700 text-white shadow-md'
                    : 'bg-white border-gray-300 text-gray-900 hover:border-blue-600 hover:bg-blue-50'
                )}
              >
                {STRINGS.settings.windowOptions[window as keyof typeof STRINGS.settings.windowOptions]}
              </button>
            ))}
          </div>
        </div>

        {/* Email Branding Section */}
        <div className={STYLES.container.card}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className={STYLES.text.h3}>{STRINGS.settings.emailBrandingTitle}</h2>
              <p className={cn(STYLES.text.small, 'mt-1')}>{STRINGS.settings.emailBrandingDescription}</p>
            </div>
            <button
              type="button"
              onClick={handleResetBranding}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              {STRINGS.settings.resetToDefaults}
            </button>
          </div>

          <div className="space-y-6">
            {/* Brand Logo */}
            <div>
              <label className={STYLES.label.default}>{STRINGS.settings.brandLogoLabel}</label>
              <p className={cn(STYLES.text.small, 'text-gray-600 mb-3')}>{STRINGS.settings.brandLogoHint}</p>

              <div className="flex items-center gap-4">
                {/* Logo Preview */}
                {brandLogo ? (
                  <img
                    src={brandLogo}
                    alt="Brand logo"
                    className="w-24 h-24 object-contain border-2 border-gray-200 rounded-lg p-2 bg-white"
                  />
                ) : (
                  <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                    <span className="text-gray-400 text-xs text-center px-2">No logo</span>
                  </div>
                )}

                {/* Upload Buttons */}
                <div className="flex flex-col gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className={cn(STYLES.button.secondary, '!w-auto')}
                  >
                    {uploadingLogo
                      ? 'Uploading...'
                      : brandLogo
                        ? STRINGS.settings.changeLogo
                        : STRINGS.settings.uploadLogo}
                  </button>
                  {brandLogo && !uploadingLogo && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className={cn(STYLES.button.secondary, '!w-auto text-red-600 hover:bg-red-50')}
                    >
                      {STRINGS.settings.removeLogo}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Primary Color */}
            <div>
              <label htmlFor="primaryColor" className={STYLES.label.default}>
                {STRINGS.settings.primaryColorLabel}
              </label>
              <p className={cn(STYLES.text.small, 'text-gray-600 mb-2')}>{STRINGS.settings.primaryColorHint}</p>
              <div className="flex items-center gap-3">
                <input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-12 w-20 rounded border-2 border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className={cn(STYLES.input.base, STYLES.input.default, 'flex-1 max-w-xs font-mono')}
                  placeholder="#2563EB"
                />
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <label htmlFor="accentColor" className={STYLES.label.default}>
                {STRINGS.settings.accentColorLabel}
              </label>
              <p className={cn(STYLES.text.small, 'text-gray-600 mb-2')}>{STRINGS.settings.accentColorHint}</p>
              <div className="flex items-center gap-3">
                <input
                  id="accentColor"
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-12 w-20 rounded border-2 border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className={cn(STYLES.input.base, STYLES.input.default, 'flex-1 max-w-xs font-mono')}
                  placeholder="#10B981"
                />
              </div>
            </div>

            {/* Custom Footer Text */}
            <div>
              <label htmlFor="footerText" className={STYLES.label.default}>
                {STRINGS.settings.footerTextLabel}
              </label>
              <p className={cn(STYLES.text.small, 'text-gray-600 mb-2')}>{STRINGS.settings.footerTextHint}</p>
              <textarea
                id="footerText"
                rows={3}
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className={cn(STYLES.input.base, STYLES.input.default)}
                placeholder={STRINGS.settings.footerTextPlaceholder}
              />
            </div>
          </div>
        </div>

        {/* Google Calendar Sync Section */}
        <div className={STYLES.container.card}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className={cn(STYLES.text.h3, 'flex items-center gap-2')}>
                <Calendar className="w-5 h-5 text-blue-600" />
                Google Calendar Sync
              </h2>
              <p className={cn(STYLES.text.small, 'mt-1')}>
                Automatically sync your showings with Google Calendar. When a showing is booked, confirmed, rescheduled, or cancelled, it will automatically update in your calendar.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                {calendarSyncEnabled ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Connected</p>
                      <p className="text-sm text-gray-600">Your showings are syncing to Google Calendar</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <X className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Not Connected</p>
                      <p className="text-sm text-gray-600">Connect to enable automatic calendar sync</p>
                    </div>
                  </>
                )}
              </div>

              {calendarSyncEnabled ? (
                <button
                  type="button"
                  onClick={handleDisconnectCalendar}
                  disabled={disconnectingCalendar}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {disconnectingCalendar ? 'Disconnecting...' : 'Disconnect'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectCalendar}
                  disabled={connectingCalendar}
                  className={cn(
                    STYLES.button.primary,
                    '!w-auto px-6',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {connectingCalendar ? 'Connecting...' : 'Connect Google Calendar'}
                </button>
              )}
            </div>

            {/* How It Works */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">How Calendar Sync Works</h3>
              <ul className="space-y-1.5 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>New showings are automatically added to your Google Calendar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Rescheduled showings update the calendar event time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Cancelled showings are removed from your calendar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Each event includes client details and property information</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div className={message.type === 'success' ? STYLES.alert.success : STYLES.alert.error}>
            {message.text}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className={cn(STYLES.button.primary, 'max-w-xs')}>
            {saving ? STRINGS.settings.saving : STRINGS.settings.save}
          </button>
        </div>
      </form>
    </div>
  );
}
