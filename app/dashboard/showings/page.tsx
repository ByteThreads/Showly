'use client';

import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { posthog } from '@/lib/posthog';
import { collection, query, where, getDocs, orderBy, Timestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { STRINGS } from '@/lib/constants/strings';
import { STYLES, cn } from '@/lib/constants/styles';
import type { ShowingStatus, Agent, Property } from '@/types/database';
import { generateTimeSlots, type GroupedTimeSlots, type TimeSlot } from '@/lib/utils/time-slots';
import { getShortTimezoneName } from '@/lib/utils/timezone';
import { Calendar } from 'lucide-react';

interface ShowingData {
  id: string;
  propertyId: string;
  agentId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  scheduledAt: Timestamp;
  status: ShowingStatus;
  notes?: string;
  preApproved?: boolean;
  createdAt: Timestamp;
  // Property details (fetched separately)
  propertyAddress?: string;
  propertyPrice?: number;
  propertyBedrooms?: number;
  propertyTimezone?: string;
  propertyBathrooms?: number;
}

type SortOption = 'date-desc' | 'date-asc' | 'property' | 'client' | 'status';

export default function ShowingsPage() {
  const { agent } = useAuth();
  const [showings, setShowings] = useState<ShowingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Reschedule modal state
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [showingToReschedule, setShowingToReschedule] = useState<ShowingData | null>(null);
  const [availableSlots, setAvailableSlots] = useState<GroupedTimeSlots[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    if (!agent?.id) return;

    async function fetchShowings() {
      try {
        // Fetch showings for this agent
        const showingsRef = collection(db, 'showings');
        const q = query(
          showingsRef,
          where('agentId', '==', agent?.id),
          orderBy('scheduledAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const showingsData: ShowingData[] = [];

        // Fetch property details for each showing
        for (const doc of snapshot.docs) {
          const showing = { id: doc.id, ...doc.data() } as ShowingData;

          // Fetch property details
          const propertyRef = collection(db, 'properties');
          const propertyQuery = query(propertyRef, where('__name__', '==', showing.propertyId));
          const propertySnapshot = await getDocs(propertyQuery);

          if (!propertySnapshot.empty) {
            const property = propertySnapshot.docs[0].data();
            showing.propertyAddress = property.address?.formatted ||
              `${property.address?.street}, ${property.address?.city}, ${property.address?.state}`;
            showing.propertyPrice = property.price;
            showing.propertyBedrooms = property.bedrooms;
            showing.propertyBathrooms = property.bathrooms;
            showing.propertyTimezone = property.timezone;
          }

          showingsData.push(showing);
        }

        setShowings(showingsData);
      } catch (error) {
        console.error('Error fetching showings:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchShowings();
  }, [agent?.id]);

  // Filter and sort showings
  const filteredAndSortedShowings = showings
    .filter((showing) => {
      const now = new Date();
      const showingDate = showing.scheduledAt.toDate();

      if (filter === 'upcoming') {
        return showingDate >= now;
      } else if (filter === 'past') {
        return showingDate < now;
      }
      return true; // 'all'
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          // Newest First = most recent/soonest dates at top
          return a.scheduledAt.toDate().getTime() - b.scheduledAt.toDate().getTime();
        case 'date-asc':
          // Oldest First = furthest dates at top
          return b.scheduledAt.toDate().getTime() - a.scheduledAt.toDate().getTime();
        case 'property':
          return (a.propertyAddress || '').localeCompare(b.propertyAddress || '');
        case 'client':
          return a.clientName.localeCompare(b.clientName);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

  // Get status badge color
  function getStatusBadge(status: ShowingStatus) {
    const badges = {
      scheduled: STYLES.badge.info,
      confirmed: STYLES.badge.success,
      completed: STYLES.badge.neutral,
      cancelled: STYLES.badge.error,
      'no-show': STYLES.badge.warning,
    };
    return badges[status] || STYLES.badge.neutral;
  }

  // Open reschedule modal and fetch available slots
  async function openRescheduleModal(showing: ShowingData) {
    setShowingToReschedule(showing);
    setRescheduleModalOpen(true);
    setSelectedSlot(null);

    try {
      // Fetch property and all showings for that property
      const propertyDoc = await getDoc(doc(db, 'properties', showing.propertyId));
      if (!propertyDoc.exists() || !agent) return;

      const property = { id: propertyDoc.id, ...propertyDoc.data() } as Property;

      // Fetch all showings for this property (excluding the current one)
      const showingsQuery = query(
        collection(db, 'showings'),
        where('propertyId', '==', showing.propertyId)
      );
      const showingsSnapshot = await getDocs(showingsQuery);
      const propertyShowings = showingsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((s: any) => s.id !== showing.id) as any[];

      // Generate available time slots
      const slots = generateTimeSlots(
        agent,
        propertyShowings,
        property.showingDuration,
        property.bufferTime
      );

      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      alert(STRINGS.showings.reschedule.error);
    }
  }

  // Reschedule showing
  async function rescheduleShowing() {
    if (!selectedSlot || !showingToReschedule) return;

    setRescheduling(true);
    const oldDate = showingToReschedule.scheduledAt.toDate();

    try {
      const showingRef = doc(db, 'showings', showingToReschedule.id);
      await updateDoc(showingRef, {
        scheduledAt: Timestamp.fromDate(selectedSlot.date),
        rescheduledFrom: showingToReschedule.scheduledAt,
        updatedAt: Timestamp.now(),
      });

      // Create updated showing object for email
      const updatedShowing = {
        ...showingToReschedule,
        scheduledAt: Timestamp.fromDate(selectedSlot.date),
      };

      // Update local state
      setShowings(prev => prev.map(s =>
        s.id === showingToReschedule.id
          ? { ...s, scheduledAt: Timestamp.fromDate(selectedSlot.date) }
          : s
      ));

      // Send reschedule notification email (non-blocking)
      sendStatusNotification('rescheduled', updatedShowing, oldDate).catch(err =>
        console.error('Failed to send reschedule email:', err)
      );

      // Track feature discovery - reschedule
      posthog.capture('feature_discovered_reschedule', {
        days_between_old_and_new: Math.floor((selectedSlot.date.getTime() - oldDate.getTime()) / (1000 * 60 * 60 * 24)),
      });

      // Close modal and reset
      setRescheduleModalOpen(false);
      setShowingToReschedule(null);
      setSelectedSlot(null);
      setAvailableSlots([]);

      alert(STRINGS.showings.reschedule.success);
    } catch (error) {
      console.error('Error rescheduling showing:', error);
      alert(STRINGS.showings.reschedule.error);
    } finally {
      setRescheduling(false);
    }
  }

  // Update showing status
  async function updateShowingStatus(showingId: string, newStatus: ShowingStatus) {
    setUpdatingId(showingId);
    try {
      const showing = showings.find(s => s.id === showingId);
      if (!showing) return;

      const showingRef = doc(db, 'showings', showingId);
      await updateDoc(showingRef, {
        status: newStatus,
        updatedAt: Timestamp.now(),
        ...(newStatus === 'cancelled' && { cancelledAt: Timestamp.now() }),
      });

      // Update local state
      setShowings(prev => prev.map(s =>
        s.id === showingId
          ? { ...s, status: newStatus }
          : s
      ));

      // Send email notification (non-blocking)
      if (newStatus === 'confirmed' || newStatus === 'cancelled' || newStatus === 'completed') {
        sendStatusNotification(newStatus, showing).catch(err =>
          console.error('Failed to send email notification:', err)
        );
      }
    } catch (error) {
      console.error('Error updating showing status:', error);
      alert('Failed to update showing status. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  }

  // Send status change notification email
  async function sendStatusNotification(
    type: 'confirmed' | 'cancelled' | 'rescheduled' | 'completed',
    showing: ShowingData,
    oldDate?: Date
  ) {
    try {
      await fetch('/api/send-status-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          clientEmail: showing.clientEmail,
          clientName: showing.clientName,
          agentName: agent?.name,
          agentEmail: agent?.email,
          agentPhone: agent?.phone,
          propertyAddress: showing.propertyAddress || 'Property',
          showingDate: showing.scheduledAt.toDate().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
          showingTime: showing.scheduledAt.toDate().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
          ...(oldDate && {
            oldShowingDate: oldDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            }),
            oldShowingTime: oldDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }),
          }),
          emailBranding: agent?.settings.emailBranding,
        }),
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      // Don't throw - email failure shouldn't block the status update
    }
  }

  if (loading) {
    return (
      <div className={STYLES.loading.overlay}>
        <div className={STYLES.loading.spinner}></div>
        <p className={STYLES.loading.text}>{STRINGS.common.loading}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className={STYLES.text.h2}>{STRINGS.showings.title}</h1>
        <p className={cn(STYLES.text.small, 'mt-2')}>
          {STRINGS.showings.subtitle}
        </p>
      </div>

      {showings.length === 0 ? (
        /* Empty State */
        <div className={STYLES.card.default}>
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <Calendar className="w-16 h-16 text-gray-400" />
            </div>
            <h3 className={STYLES.text.h3}>{STRINGS.showings.noShowings}</h3>
            <p className={cn(STYLES.text.small, 'mt-2')}>
              {STRINGS.showings.noShowingsDescription}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Filter Tabs & Sort Dropdown */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex gap-4 border-b border-gray-200 pb-4">
              <button
                onClick={() => setFilter('all')}
                className={cn(
                  'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
                  filter === 'all'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                )}
              >
                {STRINGS.showings.filterAll} ({showings.length})
              </button>
              <button
                onClick={() => setFilter('upcoming')}
                className={cn(
                  'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
                  filter === 'upcoming'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                )}
              >
                {STRINGS.showings.filterUpcoming} ({showings.filter(s => s.scheduledAt.toDate() >= new Date()).length})
              </button>
              <button
                onClick={() => setFilter('past')}
                className={cn(
                  'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
                  filter === 'past'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                )}
              >
                {STRINGS.showings.filterPast} ({showings.filter(s => s.scheduledAt.toDate() < new Date()).length})
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-sm font-medium text-gray-700">
                {STRINGS.showings.sortBy}
              </label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className={cn(STYLES.select.base, STYLES.select.default, 'w-auto')}
              >
                <option value="date-desc">Date (Newest First)</option>
                <option value="date-asc">Date (Oldest First)</option>
                <option value="property">Property (A-Z)</option>
                <option value="client">Client Name (A-Z)</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>

          {/* Showings List */}
          <div className="space-y-4">
            {filteredAndSortedShowings.length === 0 ? (
              <div className={STYLES.card.default}>
                <p className="text-center text-gray-600 py-8">
                  No {filter} showings
                </p>
              </div>
            ) : (
              filteredAndSortedShowings.map((showing) => (
                <div key={showing.id} className={cn(STYLES.card.default, 'hover:shadow-md transition-shadow p-3 md:p-6')}>
                  <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                    {/* Left: Property & Client Info */}
                    <div className="flex-1 space-y-3">
                      {/* Top Row: Status & Date (Mobile Only) */}
                      <div className="flex md:hidden items-start justify-between gap-2">
                        <span className={cn(STYLES.badge.default, getStatusBadge(showing.status), 'text-xs')}>
                          {STRINGS.showings.status[showing.status.replace('-', '') as keyof typeof STRINGS.showings.status] || showing.status}
                        </span>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            {showing.scheduledAt.toDate().toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          <div className="text-xs text-gray-600">
                            {showing.scheduledAt.toDate().toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge (Desktop Only) */}
                      <div className="hidden md:block">
                        <span className={cn(STYLES.badge.default, getStatusBadge(showing.status))}>
                          {STRINGS.showings.status[showing.status.replace('-', '') as keyof typeof STRINGS.showings.status] || showing.status}
                        </span>
                      </div>

                      {/* Property Details */}
                      <div>
                        <h3 className="text-base md:text-lg font-semibold text-gray-900">{showing.propertyAddress || 'Property Address'}</h3>
                        {showing.propertyPrice && (
                          <p className="text-xs md:text-sm text-gray-600 mt-0.5">
                            ${showing.propertyPrice.toLocaleString()} • {showing.propertyBedrooms} bd • {showing.propertyBathrooms} ba
                          </p>
                        )}
                      </div>

                      {/* Client Info */}
                      <div className="text-xs md:text-sm text-gray-600 space-y-0.5 md:space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{STRINGS.showings.client}:</span>
                          <span>{showing.clientName}</span>
                          {showing.preApproved && (
                            <span className={cn(STYLES.badge.default, STYLES.badge.success, 'text-xs px-1.5 py-0.5')}>
                              Pre-Approved
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                          <a href={`mailto:${showing.clientEmail}`} className={cn(STYLES.link.default, 'text-xs md:text-sm')}>
                            {showing.clientEmail}
                          </a>
                          <span>•</span>
                          <a href={`tel:${showing.clientPhone}`} className={cn(STYLES.link.default, 'text-xs md:text-sm')}>
                            {showing.clientPhone}
                          </a>
                        </div>
                      </div>

                      {/* Notes */}
                      {showing.notes && (
                        <div className="p-2 bg-gray-50 rounded text-xs md:text-sm text-gray-700">
                          <span className="font-medium">Notes:</span> {showing.notes}
                        </div>
                      )}
                    </div>

                    {/* Right: Date/Time & Actions (Desktop) */}
                    <div className="hidden md:flex md:flex-col md:items-end gap-3 md:min-w-[200px]">
                      {/* Date & Time */}
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {showing.scheduledAt.toDate().toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-sm text-gray-600">
                          {showing.scheduledAt.toDate().toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </div>
                      </div>

                      {/* Action Buttons - Desktop */}
                      <div className="flex flex-col gap-2 w-full">
                        <a
                          href={`mailto:${showing.clientEmail}`}
                          className={cn(STYLES.button.action.base, STYLES.button.action.contact)}
                        >
                          {STRINGS.showings.contactClient}
                        </a>

                        {showing.status === 'scheduled' && (
                          <button
                            onClick={() => updateShowingStatus(showing.id, 'confirmed')}
                            disabled={updatingId === showing.id}
                            className={cn(STYLES.button.action.base, STYLES.button.action.confirm)}
                          >
                            {updatingId === showing.id ? STRINGS.showings.actions.updating : STRINGS.showings.actions.confirm}
                          </button>
                        )}

                        {(showing.status === 'scheduled' || showing.status === 'confirmed') && (
                          <button
                            onClick={() => updateShowingStatus(showing.id, 'completed')}
                            disabled={updatingId === showing.id}
                            className={cn(STYLES.button.action.base, STYLES.button.action.complete)}
                          >
                            {updatingId === showing.id ? STRINGS.showings.actions.updating : STRINGS.showings.actions.complete}
                          </button>
                        )}

                        {showing.status !== 'cancelled' && showing.status !== 'completed' && (
                          <button
                            onClick={() => {
                              if (confirm(STRINGS.showings.actions.cancelConfirm)) {
                                updateShowingStatus(showing.id, 'cancelled');
                              }
                            }}
                            disabled={updatingId === showing.id}
                            className={cn(STYLES.button.action.base, STYLES.button.action.cancel)}
                          >
                            {updatingId === showing.id ? STRINGS.showings.actions.updating : STRINGS.showings.actions.cancel}
                          </button>
                        )}

                        {showing.scheduledAt.toDate() < new Date() && showing.status !== 'completed' && showing.status !== 'cancelled' && (
                          <button
                            onClick={() => updateShowingStatus(showing.id, 'no-show')}
                            disabled={updatingId === showing.id}
                            className={cn(STYLES.button.action.base, STYLES.button.action.noShow)}
                          >
                            {updatingId === showing.id ? STRINGS.showings.actions.updating : STRINGS.showings.actions.noShow}
                          </button>
                        )}

                        {showing.status !== 'cancelled' && showing.status !== 'completed' && showing.status !== 'no-show' && (
                          <button
                            onClick={() => openRescheduleModal(showing)}
                            className={cn(STYLES.button.action.base, STYLES.button.action.reschedule)}
                          >
                            {STRINGS.showings.actions.reschedule}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons - Mobile (Grid) */}
                    <div className="grid grid-cols-2 gap-1.5 md:hidden">
                      <a
                        href={`mailto:${showing.clientEmail}`}
                        className={cn(STYLES.button.action.base, STYLES.button.action.contact, 'text-xs py-1.5')}
                      >
                        {STRINGS.showings.contactClient}
                      </a>

                      {showing.status === 'scheduled' && (
                        <button
                          onClick={() => updateShowingStatus(showing.id, 'confirmed')}
                          disabled={updatingId === showing.id}
                          className={cn(STYLES.button.action.base, STYLES.button.action.confirm, 'text-xs py-1.5')}
                        >
                          {updatingId === showing.id ? STRINGS.showings.actions.updating : STRINGS.showings.actions.confirm}
                        </button>
                      )}

                      {(showing.status === 'scheduled' || showing.status === 'confirmed') && (
                        <button
                          onClick={() => updateShowingStatus(showing.id, 'completed')}
                          disabled={updatingId === showing.id}
                          className={cn(STYLES.button.action.base, STYLES.button.action.complete, 'text-xs py-1.5')}
                        >
                          {updatingId === showing.id ? STRINGS.showings.actions.updating : STRINGS.showings.actions.complete}
                        </button>
                      )}

                      {showing.status !== 'cancelled' && showing.status !== 'completed' && (
                        <button
                          onClick={() => {
                            if (confirm(STRINGS.showings.actions.cancelConfirm)) {
                              updateShowingStatus(showing.id, 'cancelled');
                            }
                          }}
                          disabled={updatingId === showing.id}
                          className={cn(STYLES.button.action.base, STYLES.button.action.cancel, 'text-xs py-1.5')}
                        >
                          {updatingId === showing.id ? STRINGS.showings.actions.updating : STRINGS.showings.actions.cancel}
                        </button>
                      )}

                      {showing.scheduledAt.toDate() < new Date() && showing.status !== 'completed' && showing.status !== 'cancelled' && (
                        <button
                          onClick={() => updateShowingStatus(showing.id, 'no-show')}
                          disabled={updatingId === showing.id}
                          className={cn(STYLES.button.action.base, STYLES.button.action.noShow, 'text-xs py-1.5')}
                        >
                          {updatingId === showing.id ? STRINGS.showings.actions.updating : STRINGS.showings.actions.noShow}
                        </button>
                      )}

                      {showing.status !== 'cancelled' && showing.status !== 'completed' && showing.status !== 'no-show' && (
                        <button
                          onClick={() => openRescheduleModal(showing)}
                          className={cn(STYLES.button.action.base, STYLES.button.action.reschedule, 'text-xs py-1.5')}
                        >
                          {STRINGS.showings.actions.reschedule}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Reschedule Modal */}
      {rescheduleModalOpen && showingToReschedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <h2 className={STYLES.text.h3}>{STRINGS.showings.reschedule.title}</h2>
              <p className={cn(STYLES.text.small, 'mt-2')}>
                {STRINGS.showings.reschedule.selectNewTime}
              </p>

              {/* Current Time */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm font-medium text-blue-900">
                  {STRINGS.showings.reschedule.currentTime}:
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  {showingToReschedule.scheduledAt.toDate().toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })} at {showingToReschedule.scheduledAt.toDate().toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </p>
              </div>
            </div>

            {/* Available Time Slots */}
            <div className="px-6 py-4">
              {availableSlots.length === 0 ? (
                <p className="text-center text-gray-600 py-8">
                  {STRINGS.showings.reschedule.noAvailableTimes}
                </p>
              ) : (
                <div className="space-y-6">
                  {availableSlots.map((day) => (
                    <div key={day.dateKey}>
                      <h4 className={cn(STYLES.booking.dayHeader)}>{day.date}</h4>
                      <div className={STYLES.booking.timeSlotGrid}>
                        {day.slots.map((slot, idx) => (
                          <button
                            key={idx}
                            onClick={() => slot.available && setSelectedSlot(slot)}
                            disabled={!slot.available}
                            className={cn(
                              !slot.available && STYLES.booking.timeSlotDisabled,
                              slot.available && selectedSlot?.time === slot.time && selectedSlot?.date.getTime() === slot.date.getTime()
                                ? STYLES.booking.timeSlotSelected
                                : slot.available && STYLES.booking.timeSlot
                            )}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setRescheduleModalOpen(false);
                  setShowingToReschedule(null);
                  setSelectedSlot(null);
                  setAvailableSlots([]);
                }}
                className={cn(STYLES.button.secondary, '!w-auto')}
                disabled={rescheduling}
              >
                {STRINGS.showings.reschedule.cancelButton}
              </button>
              <button
                onClick={rescheduleShowing}
                disabled={!selectedSlot || rescheduling}
                className={cn(STYLES.button.primary, '!w-auto')}
              >
                {rescheduling ? STRINGS.showings.actions.updating : STRINGS.showings.reschedule.confirmButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
