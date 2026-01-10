'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs, addDoc, Timestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { posthog } from '@/lib/posthog';
import { STRINGS } from '@/lib/constants/strings';
import { STYLES, cn } from '@/lib/constants/styles';
import { generateTimeSlots, countShowingsThisWeek, type TimeSlot } from '@/lib/utils/time-slots';
import { getShortTimezoneName } from '@/lib/utils/timezone';
import { generateCalendarEvent, downloadCalendarEvent } from '@/lib/utils/generate-calendar-event';
import type { Property, Agent, Showing } from '@/types/database';

export default function BookingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [property, setProperty] = useState<Property | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [showings, setShowings] = useState<Showing[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [imageTransition, setImageTransition] = useState(false);
  const [showLeftColumn, setShowLeftColumn] = useState(false);
  const [showRightColumn, setShowRightColumn] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingStep, setBookingStep] = useState<1 | 2>(1); // Step 1: Select Time, Step 2: Your Info

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
    preApproved: false,
    wantsReminders: true, // Default to true - most clients want reminders
    wantsSMS: false, // Default to false - explicit SMS consent required for TCPA compliance
  });

  // Track booking funnel drop-off on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only track if they selected a time but didn't complete booking
      if (selectedSlot && !success) {
        posthog.capture('booking_form_abandoned', {
          had_time_selected: true,
          had_form_filled: !!(formData.name || formData.email || formData.phone),
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [selectedSlot, success, formData]);

  // Fetch property and agent data
  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        if (!slug) {
          console.log('No slug provided');
          setLoading(false);
          return;
        }

        console.log('Fetching property with slug:', slug);

        // Find property by booking slug
        const propertiesRef = collection(db, 'properties');
        const q = query(propertiesRef, where('bookingSlug', '==', slug));
        const snapshot = await getDocs(q);

        if (!isMounted) return;

        console.log('Property query result:', snapshot.empty, snapshot.docs.length);

        if (snapshot.empty) {
          console.log('No property found with slug:', slug);
          setProperty(null);
          setLoading(false);
          return;
        }

        const propertyDoc = snapshot.docs[0];
        const propertyData = { id: propertyDoc.id, ...propertyDoc.data() } as Property;
        console.log('Property found:', propertyData);

        if (!isMounted) return;
        setProperty(propertyData);

        // Track booking page view
        posthog.capture('booking_page_viewed', {
          property_price: propertyData.price,
          property_bedrooms: propertyData.bedrooms,
          property_state: propertyData.address.state,
        });

        // Fetch agent data
        console.log('Fetching agent:', propertyData.agentId);
        const agentDoc = await getDoc(doc(db, 'agents', propertyData.agentId));

        if (!isMounted) return;

        if (agentDoc.exists()) {
          const agentData = { id: agentDoc.id, ...agentDoc.data() } as Agent;
          console.log('Agent found:', agentData);
          setAgent(agentData);
        } else {
          console.log('Agent not found');
          setError('Agent information not found');
          setLoading(false);
          return;
        }

        // Fetch existing showings for this property
        const showingsRef = collection(db, 'showings');
        const showingsQuery = query(showingsRef, where('propertyId', '==', propertyDoc.id));
        const showingsSnapshot = await getDocs(showingsQuery);

        if (!isMounted) return;

        const showingsData = showingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Showing[];
        console.log('Showings found:', showingsData.length);
        setShowings(showingsData);

        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching property:', err);
        console.error('Error details:', err.message, err.stack);
        if (isMounted) {
          setError(err.message || STRINGS.common.error);
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Generate available time slots
  const allTimeSlots = agent && property
    ? generateTimeSlots(
        agent,
        showings,
        property.showingDuration,
        property.bufferTime
      )
    : [];

  // Filter time slots by selected date if one is chosen
  const timeSlots = selectedDate
    ? allTimeSlots.filter(group => group.dateKey === selectedDate)
    : allTimeSlots;

  const showingsThisWeek = countShowingsThisWeek(showings);

  // Get all property photos (backward compatible)
  const propertyPhotos = property
    ? (property.photos && property.photos.length > 0
        ? property.photos
        : property.photoURL
          ? [property.photoURL]
          : [])
    : [];

  const calendarDays = currentMonth ? getDaysInMonth(currentMonth) : [];

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const target = e.target;
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;
    const name = target.name;

    setFormData({
      ...formData,
      [name]: value,
    });
  }

  function handlePreviousPhoto() {
    setImageTransition(true);
    setTimeout(() => {
      setCurrentPhotoIndex((prev) =>
        prev === 0 ? propertyPhotos.length - 1 : prev - 1
      );
      setImageTransition(false);
    }, 150);
  }

  function handleNextPhoto() {
    setImageTransition(true);
    setTimeout(() => {
      setCurrentPhotoIndex((prev) =>
        prev === propertyPhotos.length - 1 ? 0 : prev + 1
      );
      setImageTransition(false);
    }, 150);
  }

  // Preload adjacent images for smooth transitions
  useEffect(() => {
    if (propertyPhotos.length <= 1) return;

    const preloadImage = (src: string) => {
      const img = new Image();
      img.src = src;
    };

    // Preload next and previous images
    const nextIndex = currentPhotoIndex === propertyPhotos.length - 1 ? 0 : currentPhotoIndex + 1;
    const prevIndex = currentPhotoIndex === 0 ? propertyPhotos.length - 1 : currentPhotoIndex - 1;

    preloadImage(propertyPhotos[nextIndex]);
    preloadImage(propertyPhotos[prevIndex]);
  }, [currentPhotoIndex, propertyPhotos]);

  // Keyboard navigation for carousel
  useEffect(() => {
    if (propertyPhotos.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setImageTransition(true);
        setTimeout(() => {
          setCurrentPhotoIndex((prev) =>
            prev === 0 ? propertyPhotos.length - 1 : prev - 1
          );
          setImageTransition(false);
        }, 150);
      } else if (e.key === 'ArrowRight') {
        setImageTransition(true);
        setTimeout(() => {
          setCurrentPhotoIndex((prev) =>
            prev === propertyPhotos.length - 1 ? 0 : prev + 1
          );
          setImageTransition(false);
        }, 150);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [propertyPhotos.length]);

  // Staggered fade-in animation on page load
  useEffect(() => {
    if (!loading && property && agent) {
      // Left column fades in first
      const leftTimer = setTimeout(() => {
        setShowLeftColumn(true);
      }, 100);

      // Right column fades in after left
      const rightTimer = setTimeout(() => {
        setShowRightColumn(true);
      }, 400);

      return () => {
        clearTimeout(leftTimer);
        clearTimeout(rightTimer);
      };
    }
  }, [loading, property, agent]);

  // Handle step progression
  function handleContinueToStep2() {
    if (!selectedSlot) return;
    setBookingStep(2);
    // Scroll to top of right column
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleBackToStep1() {
    setBookingStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Calendar helpers
  function getDaysInMonth(date: Date): Date[] {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Date[] = [];

    // Add empty slots for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(new Date(0)); // Placeholder for empty cells
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }

  function handlePreviousMonth() {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  }

  function handleNextMonth() {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  }

  function handleDateSelect(date: Date) {
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(dateKey);
  }

  function isDateAvailable(date: Date): boolean {
    if (date.getTime() === 0) return false; // Empty cell
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return allTimeSlots.some(group => group.dateKey === dateKey && group.slots.length > 0);
  }

  function isDateSelected(date: Date): boolean {
    if (date.getTime() === 0) return false;
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return selectedDate === dateKey;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot || !property || !agent) return;

    setError('');
    setSubmitting(true);

    try {
      // Create showing document
      await addDoc(collection(db, 'showings'), {
        propertyId: property.id,
        agentId: agent.id,
        clientName: formData.name,
        clientEmail: formData.email,
        clientPhone: formData.phone,
        scheduledAt: Timestamp.fromDate(selectedSlot.date),
        status: 'scheduled' as const,
        notes: formData.notes || null,
        preApproved: formData.preApproved,
        clientWantsReminders: formData.wantsReminders,
        clientWantsSMS: formData.wantsSMS, // TCPA compliance: explicit SMS consent
        smsConsentTimestamp: formData.wantsSMS ? Timestamp.now() : null, // TCPA compliance: timestamp of consent
        reminders: {
          email24h: false,
          email1h: false,
          sms24h: false,
          sms1h: false,
        },
        createdAt: Timestamp.now(),
      });

      // If agent is on trial, increment showing counter
      if (agent.subscriptionStatus === 'trial') {
        const newCount = (agent.trialShowingsCount || 0) + 1;
        await updateDoc(doc(db, 'agents', agent.id), {
          trialShowingsCount: newCount,
          updatedAt: new Date(),
        });

        // If this was the 3rd showing, the trial has expired
        // The next page load will redirect them to pricing via the paywall
      }

      // Send confirmation emails
      try {
        await fetch('/api/send-booking-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: formData.email,
            clientName: formData.name,
            agentName: agent.name,
            propertyAddress: property.address.formatted,
            showingDate: selectedSlot.date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            showingTime: selectedSlot.time,
            agentEmail: agent.email,
            agentPhone: agent.phone,
            emailBranding: agent.settings.emailBranding,
          }),
        });
      } catch (emailError) {
        console.error('Error sending emails:', emailError);
        // Don't fail the booking if email fails
      }

      // Send SMS confirmation if client opted in
      if (formData.wantsSMS && formData.phone) {
        try {
          await fetch('/api/send-sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: formData.phone,
              type: 'booking',
              address: property.address.street,
              date: selectedSlot.date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              }),
              time: selectedSlot.time,
              agentName: agent.name,
            }),
          });
        } catch (smsError) {
          console.error('Error sending SMS:', smsError);
          // Don't fail the booking if SMS fails
        }
      }

      // Track successful booking
      posthog.capture('showing_booked', {
        property_price: property.price,
        property_bedrooms: property.bedrooms,
        property_state: property.address.state,
        has_notes: !!formData.notes,
        pre_approved: formData.preApproved,
        wants_reminders: formData.wantsReminders,
        wants_sms: formData.wantsSMS,
        agent_on_trial: agent.subscriptionStatus === 'trial',
        trial_showings_count: agent.trialShowingsCount || 0,
      });

      setSuccess(true);
    } catch (err) {
      console.error('Error creating showing:', err);
      setError('Failed to book showing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Add to calendar handler
  function handleAddToCalendar() {
    if (!selectedSlot || !property || !agent) return;

    // Track add to calendar event
    posthog.capture('add_to_calendar_clicked', {
      property_state: property.address.state,
    });

    // Calculate end time (start time + showing duration)
    const endTime = new Date(selectedSlot.date.getTime() + (property.showingDuration * 60 * 1000));

    const icsContent = generateCalendarEvent({
      title: `Property Showing - ${property.address.formatted}`,
      description: `Property showing scheduled with ${agent.name}\n\nProperty Details:\n${property.bedrooms} beds, ${property.bathrooms} baths${property.sqft ? `, ${property.sqft} sqft` : ''}\nPrice: $${property.price.toLocaleString()}\n\nAgent: ${agent.name}\nEmail: ${agent.email}\nPhone: ${agent.phone}`,
      location: property.address.formatted,
      startTime: selectedSlot.date,
      endTime: endTime,
      organizerName: agent.name,
      organizerEmail: agent.email,
    });

    downloadCalendarEvent(icsContent, `showing-${property.address.street.replace(/\s+/g, '-').toLowerCase()}.ics`);
  }

  // Get directions to property
  function handleGetDirections() {
    if (!property) return;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address.formatted)}`;
    window.open(mapsUrl, '_blank');
  }


  // Loading state
  if (loading) {
    return (
      <div className={STYLES.loading.overlay}>
        <div>
          <div className={STYLES.loading.spinner} />
          <p className={STYLES.loading.text}>{STRINGS.bookings.loadingProperty}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className={cn(STYLES.text.h2, 'mb-4')}>Error</h1>
          <p className={STYLES.text.large}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={cn(STYLES.button.primary, '!w-auto mt-6')}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Property not found
  if (!property || !agent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className={cn(STYLES.text.h2, 'mb-4')}>{STRINGS.bookings.notFound}</h1>
          <p className={STYLES.text.large}>{STRINGS.bookings.notFoundDescription}</p>
          <p className="mt-4 text-sm text-gray-500">Booking slug: {slug}</p>
          <a
            href="/dashboard/properties"
            className={cn(STYLES.button.primary, '!w-auto mt-6')}
          >
            View Your Properties
          </a>
        </div>
      </div>
    );
  }

  // Property inactive - booking disabled
  if (property.status !== 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⏸️</div>
          <h1 className={cn(STYLES.text.h2, 'mb-4')}>Booking Temporarily Unavailable</h1>
          <p className={STYLES.text.large}>
            This property is not currently accepting bookings. Please check back later or contact the agent directly.
          </p>
          {agent && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className={cn(STYLES.text.small, 'font-medium mb-2')}>Contact Agent:</p>
              <p className={STYLES.text.base}>{agent.name}</p>
              <a href={`mailto:${agent.email}`} className={cn(STYLES.link.default, 'block mt-1')}>
                {agent.email}
              </a>
              <a href={`tel:${agent.phone}`} className={cn(STYLES.link.default, 'block mt-1')}>
                {agent.phone}
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Title and Message */}
            <h1 className="text-3xl font-bold text-gray-900 mb-3">{STRINGS.bookings.confirmationTitle}</h1>
            <p className="text-lg text-gray-600 mb-6">{STRINGS.bookings.confirmationMessage}</p>

            {/* Showing Details Card */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h2 className="text-sm font-semibold text-blue-900 uppercase tracking-wide">Your Showing</h2>
              </div>
              <p className="text-2xl font-bold text-blue-900 mb-1">{selectedSlot?.time}</p>
              <p className="text-base text-blue-700">
                {selectedSlot?.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Agent Contact Card */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Your Agent</h3>
              <div className="flex items-center justify-center gap-3 mb-4">
                {agent.photoURL ? (
                  <img
                    src={agent.photoURL}
                    alt={agent.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-lg font-bold text-white">
                    {agent.name.charAt(0)}
                  </div>
                )}
                <div className="text-left">
                  <p className="font-semibold text-gray-900">{agent.name}</p>
                  {agent.brokerage && (
                    <p className="text-sm text-gray-600">{agent.brokerage}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <a href={`mailto:${agent.email}`} className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {agent.email}
                </a>
                <a href={`tel:${agent.phone}`} className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {agent.phone}
                </a>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 space-y-3">
              {/* Add to Calendar - Primary Action */}
              <button
                onClick={handleAddToCalendar}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-lg transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Add to Calendar
              </button>

              {/* Get Directions Button */}
              <button
                onClick={handleGetDirections}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-lg border border-gray-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Get Directions
              </button>
            </div>

            {/* Footer Note */}
            <p className="text-sm text-gray-500 mt-6">
              Check your email for confirmation details
            </p>
          </div>

          {/* Property Details Section */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Section Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Property Details</h2>
            </div>

            <div className="p-6">
              {/* Property Photos */}
              {propertyPhotos.length > 0 && (
                <div className="relative w-full h-64 bg-gray-900 rounded-lg overflow-hidden mb-6">
                  {/* Current Photo */}
                  <img
                    src={propertyPhotos[currentPhotoIndex]}
                    alt={`${property.address.formatted} - Photo ${currentPhotoIndex + 1}`}
                    className={cn(
                      "w-full h-full object-cover transition-all duration-300 ease-in-out",
                      imageTransition ? "opacity-0 scale-105" : "opacity-100 scale-100"
                    )}
                  />

                  {/* Navigation Arrows (only show if more than 1 photo) */}
                  {propertyPhotos.length > 1 && (
                    <>
                      <button
                        onClick={handlePreviousPhoto}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 hover:bg-opacity-80 hover:scale-110 text-white rounded-full flex items-center justify-center transition-all duration-200 ease-in-out backdrop-blur-sm"
                        aria-label="Previous photo"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={handleNextPhoto}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 hover:bg-opacity-80 hover:scale-110 text-white rounded-full flex items-center justify-center transition-all duration-200 ease-in-out backdrop-blur-sm"
                        aria-label="Next photo"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Photo Counter */}
                      <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-black bg-opacity-70 backdrop-blur-sm text-white text-sm font-medium rounded-lg">
                        {currentPhotoIndex + 1} / {propertyPhotos.length}
                      </div>

                      {/* Photo Dots */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                        {propertyPhotos.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setImageTransition(true);
                              setTimeout(() => {
                                setCurrentPhotoIndex(index);
                                setImageTransition(false);
                              }, 150);
                            }}
                            className={cn(
                              'h-2 rounded-full transition-all duration-300 ease-in-out',
                              index === currentPhotoIndex
                                ? 'bg-white w-8'
                                : 'bg-white bg-opacity-50 hover:bg-opacity-75 w-2'
                            )}
                            aria-label={`Go to photo ${index + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Property Info */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  ${property.price.toLocaleString()}
                </h3>
                <p className="text-lg text-gray-700 mb-4">
                  {property.address.formatted}
                </p>
                <div className="flex flex-wrap gap-4 text-gray-600">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span>{property.bedrooms} beds</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                    </svg>
                    <span>{property.bathrooms} baths</span>
                  </div>
                  {property.sqft && (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                      </svg>
                      <span>{property.sqft.toLocaleString()} sqft</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main booking page
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* LEFT COLUMN: Carousel + Property Info + Agent */}
          <div className={cn(
            "space-y-6 transition-all duration-700 ease-out",
            showLeftColumn
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          )}>
            {/* Photo Gallery/Carousel */}
            {propertyPhotos.length > 0 && (
              <div className="relative w-full h-[400px] bg-gray-900 rounded-xl overflow-hidden">
                {/* Current Photo */}
                <img
                  src={propertyPhotos[currentPhotoIndex]}
                  alt={`${property.address.formatted} - Photo ${currentPhotoIndex + 1}`}
                  className={cn(
                    "w-full h-full object-cover transition-all duration-300 ease-in-out",
                    imageTransition ? "opacity-0 scale-105" : "opacity-100 scale-100"
                  )}
                />

                {/* Navigation Arrows (only show if more than 1 photo) */}
                {propertyPhotos.length > 1 && (
                  <>
                    <button
                      onClick={handlePreviousPhoto}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black bg-opacity-50 hover:bg-opacity-80 hover:scale-110 text-white rounded-full flex items-center justify-center transition-all duration-200 ease-in-out backdrop-blur-sm"
                      aria-label="Previous photo"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={handleNextPhoto}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black bg-opacity-50 hover:bg-opacity-80 hover:scale-110 text-white rounded-full flex items-center justify-center transition-all duration-200 ease-in-out backdrop-blur-sm"
                      aria-label="Next photo"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* Photo Counter */}
                    <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black bg-opacity-70 backdrop-blur-sm text-white text-sm font-medium rounded-lg transition-all">
                      {currentPhotoIndex + 1} / {propertyPhotos.length}
                    </div>

                    {/* Photo Dots Indicator */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {propertyPhotos.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setImageTransition(true);
                            setTimeout(() => {
                              setCurrentPhotoIndex(index);
                              setImageTransition(false);
                            }, 150);
                          }}
                          className={cn(
                            'h-2 rounded-full transition-all duration-300 ease-in-out',
                            index === currentPhotoIndex
                              ? 'bg-white w-8'
                              : 'bg-white bg-opacity-50 hover:bg-opacity-75 w-2'
                          )}
                          aria-label={`Go to photo ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Property Details */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h1 className={STYLES.booking.propertyPrice}>
                ${property.price.toLocaleString()}
              </h1>
              <p className={STYLES.booking.propertyAddress}>
                {property.address.formatted}
              </p>
              <div className={STYLES.booking.propertyDetails}>
                <div className={STYLES.booking.propertyDetail}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>{property.bedrooms} beds</span>
                </div>
                <div className={STYLES.booking.propertyDetail}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                  </svg>
                  <span>{property.bathrooms} baths</span>
                </div>
                {property.sqft && (
                  <div className={STYLES.booking.propertyDetail}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                    <span>{property.sqft.toLocaleString()} sqft</span>
                  </div>
                )}
              </div>

              {/* Property Description */}
              {property.description && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">About This Property</h3>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {property.description}
                  </p>
                </div>
              )}

              {/* Social Proof */}
              {showingsThisWeek > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className={STYLES.booking.socialProof}>
                    {STRINGS.bookings.showingsScheduled(showingsThisWeek)}
                  </p>
                </div>
              )}
            </div>

            {/* Agent Card */}
            <div className={cn(STYLES.booking.agentCard)}>
              <div className="flex items-center gap-4 mb-4">
                {agent.photoURL ? (
                  <img
                    src={agent.photoURL}
                    alt={agent.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl font-bold text-gray-600">
                    {agent.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className={STYLES.booking.agentName}>{agent.name}</p>
                  <p className={STYLES.booking.agentContact}>{STRINGS.bookings.scheduledBy}</p>
                  {agent.brokerage && (
                    <p className={cn(STYLES.text.small, 'text-gray-600 mt-1')}>{agent.brokerage}</p>
                  )}
                </div>
              </div>
              {agent.bio && (
                <p className={cn(STYLES.text.small, 'text-gray-700 mb-4')}>{agent.bio}</p>
              )}
              <div className="flex gap-3">
                <a
                  href={`tel:${agent.phone}`}
                  className={cn(STYLES.button.secondary, '!w-auto flex-1')}
                >
                  {STRINGS.bookings.callAgent}
                </a>
                <a
                  href={`mailto:${agent.email}`}
                  className={cn(STYLES.button.secondary, '!w-auto flex-1')}
                >
                  {STRINGS.bookings.emailAgent}
                </a>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Multi-Step Booking Wizard */}
          <div className={cn(
            "lg:sticky lg:top-8 lg:self-start transition-all duration-700 ease-out",
            showRightColumn
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          )}>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex flex-col min-h-[800px]">
              {/* Progress Indicator */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-xs font-semibold uppercase tracking-wide",
                    bookingStep === 1 ? "text-blue-600" : "text-gray-400"
                  )}>
                    Select Time
                  </span>
                  <span className={cn(
                    "text-xs font-semibold uppercase tracking-wide",
                    bookingStep === 2 ? "text-blue-600" : "text-gray-400"
                  )}>
                    Your Info
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className={cn(
                    "h-1.5 rounded-full flex-1 transition-all duration-300",
                    bookingStep === 1 ? "bg-blue-600" : "bg-emerald-500"
                  )} />
                  <div className={cn(
                    "h-1.5 rounded-full flex-1 transition-all duration-300",
                    bookingStep === 2 ? "bg-blue-600" : "bg-gray-200"
                  )} />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Step {bookingStep} of 2
                </p>
              </div>

              {/* Step 1: Select Date & Time */}
              {bookingStep === 1 && (
                <>
                  {property && (
                    <p className={cn(STYLES.text.small, 'mb-4 text-gray-600')}>
                      {STRINGS.common.allTimesIn(getShortTimezoneName(property.timezone))}
                    </p>
                  )}

                  {/* Stacked: Calendar and Time Slots */}
                  <div className="flex flex-col gap-6 flex-1 min-h-0">
                    {/* Calendar */}
                    <div className="flex flex-col">
                      {/* Month/Year Header with Navigation */}
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={handlePreviousMonth}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          aria-label="Previous month"
                        >
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <h3 className="text-base font-semibold text-gray-900">
                          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h3>
                        <button
                          onClick={handleNextMonth}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          aria-label="Next month"
                        >
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>

                      {/* Day Headers */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(day => (
                          <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((date, index) => {
                          const isEmpty = date.getTime() === 0;
                          const available = !isEmpty && isDateAvailable(date);
                          const selected = !isEmpty && isDateSelected(date);
                          const today = new Date();
                          const isToday = !isEmpty &&
                            date.getDate() === today.getDate() &&
                            date.getMonth() === today.getMonth() &&
                            date.getFullYear() === today.getFullYear();

                          return (
                            <button
                              key={index}
                              onClick={() => !isEmpty && available && handleDateSelect(date)}
                              disabled={isEmpty || !available}
                              className={cn(
                                'aspect-square flex items-center justify-center text-sm rounded-lg transition-all',
                                isEmpty && 'invisible',
                                !isEmpty && !available && 'text-gray-300 cursor-not-allowed',
                                !isEmpty && available && !selected && 'text-gray-900 hover:bg-gray-100 cursor-pointer',
                                selected && 'bg-blue-600 text-white font-bold shadow-md',
                                isToday && !selected && 'border-2 border-blue-600'
                              )}
                            >
                              {!isEmpty && date.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time Slots */}
                    <div className="flex flex-col min-h-0 border-t border-gray-200 pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-base font-semibold text-gray-900">
                          {selectedDate ? 'Select Time' : 'Select a date'}
                        </h3>
                      </div>

                      {/* Time Slots Grid */}
                      <div className="flex-1 overflow-y-auto mb-6">
                        {!selectedDate ? (
                          <p className="text-sm text-gray-500 mt-8 text-center">
                            Choose a date to see available times
                          </p>
                        ) : timeSlots.length === 0 ? (
                          <p className="text-sm text-gray-500 mt-8 text-center">
                            {STRINGS.bookings.noTimesAvailable}
                          </p>
                        ) : (
                          <div className="grid grid-cols-4 gap-2">
                            {timeSlots[0]?.slots.map((slot, index) => (
                              <button
                                key={index}
                                type="button"
                                disabled={!slot.available}
                                onClick={() => {
                                  setSelectedSlot(slot);
                                  // Track time slot selection
                                  posthog.capture('time_slot_selected', {
                                    day_of_week: slot.date.toLocaleDateString('en-US', { weekday: 'long' }),
                                    time: slot.time,
                                  });
                                }}
                                className={cn(
                                  'px-4 py-3 rounded-lg text-sm font-medium transition-all',
                                  !slot.available && 'bg-gray-100 text-gray-400 cursor-not-allowed',
                                  slot.available && selectedSlot?.date.getTime() !== slot.date.getTime() && 'bg-gray-100 text-gray-900 hover:bg-blue-50 hover:text-blue-600 cursor-pointer',
                                  slot.available && selectedSlot?.date.getTime() === slot.date.getTime() && 'bg-blue-600 text-white shadow-md'
                                )}
                              >
                                {slot.time}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Continue Button */}
                      <button
                        onClick={handleContinueToStep2}
                        disabled={!selectedSlot}
                        className={cn(
                          "w-full py-4 rounded-lg font-semibold text-white transition-all shadow-md",
                          selectedSlot
                            ? "bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 hover:shadow-lg"
                            : "bg-gray-300 cursor-not-allowed"
                        )}
                      >
                        {selectedSlot ? "Continue to Your Information →" : "Select a time to continue"}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Your Information */}
              {bookingStep === 2 && selectedSlot && (
                <div className="flex flex-col flex-1">
                  {/* Selected Time Badge */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-emerald-50 border-2 border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Selected Time</p>
                        <p className="text-lg font-bold text-gray-900">{selectedSlot.time}</p>
                        <p className="text-sm text-gray-700">
                          {selectedSlot.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                      <button
                        onClick={handleBackToStep1}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  {/* Booking Form */}
                  <form onSubmit={handleSubmit} className="flex flex-col flex-1 space-y-4">
                    {error && (
                      <div className={STYLES.alert.error}>
                        {error}
                      </div>
                    )}

                    <div>
                      <label htmlFor="name" className={STYLES.label.default}>
                        {STRINGS.bookings.nameLabel}
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className={cn(STYLES.input.base, STYLES.input.default)}
                        placeholder={STRINGS.bookings.namePlaceholder}
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className={STYLES.label.default}>
                        {STRINGS.bookings.emailLabel}
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className={cn(STYLES.input.base, STYLES.input.default)}
                        placeholder={STRINGS.bookings.emailPlaceholder}
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className={STYLES.label.default}>
                        {STRINGS.bookings.phoneLabel}
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className={cn(STYLES.input.base, STYLES.input.default)}
                        placeholder={STRINGS.bookings.phonePlaceholder}
                      />
                    </div>

                    <div>
                      <label htmlFor="notes" className={STYLES.label.default}>
                        {STRINGS.bookings.notesLabel}
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        rows={3}
                        value={formData.notes}
                        onChange={handleChange}
                        className={cn(STYLES.input.base, STYLES.input.default)}
                        placeholder={STRINGS.bookings.notesPlaceholder}
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        id="preApproved"
                        name="preApproved"
                        type="checkbox"
                        checked={formData.preApproved}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="preApproved" className="ml-2 block text-sm text-gray-900">
                        {STRINGS.bookings.preApprovedLabel}
                      </label>
                    </div>

                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="wantsReminders"
                          name="wantsReminders"
                          type="checkbox"
                          checked={formData.wantsReminders}
                          onChange={handleChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-2">
                        <label htmlFor="wantsReminders" className="block text-sm text-gray-900">
                          {STRINGS.bookings.remindersLabel}
                        </label>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {STRINGS.bookings.remindersHint}
                        </p>
                      </div>
                    </div>

                    {/* SMS Opt-In */}
                    {formData.wantsReminders && (
                      <div className="flex items-start ml-6">
                        <div className="flex items-center h-5">
                          <input
                            id="wantsSMS"
                            name="wantsSMS"
                            type="checkbox"
                            checked={formData.wantsSMS}
                            onChange={handleChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </div>
                        <div className="ml-2">
                          <label htmlFor="wantsSMS" className="block text-sm text-gray-900">
                            {STRINGS.bookings.smsLabel}
                          </label>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {STRINGS.bookings.smsHint}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 italic">
                            {STRINGS.bookings.smsDisclaimer}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 mt-auto">
                      <button
                        type="button"
                        onClick={handleBackToStep1}
                        className="flex-1 py-3 px-4 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        ← Back
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? STRINGS.bookings.submittingButton : STRINGS.bookings.submitButton}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
