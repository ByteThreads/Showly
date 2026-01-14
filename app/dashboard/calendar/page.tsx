'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Showing, Property } from '@/types/database';
import { STRINGS } from '@/lib/constants/strings';
import { STYLES, cn } from '@/lib/constants/styles';
import { ChevronLeft, ChevronRight, Clock, MapPin, User, X, CheckCircle, XCircle, Calendar as CalendarIcon } from 'lucide-react';

type ViewMode = 'day' | 'week' | 'month' | 'year';

export default function CalendarPage() {
  const { agent } = useAuth();
  const [showings, setShowings] = useState<Showing[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShowing, setSelectedShowing] = useState<(Showing & { property?: Property }) | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // Fetch showings and properties with real-time updates
  useEffect(() => {
    if (!agent) return;

    // Fetch properties
    const propertiesQuery = query(
      collection(db, 'properties'),
      where('agentId', '==', agent.id)
    );

    const unsubscribeProperties = onSnapshot(propertiesQuery, (snapshot) => {
      const propertiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Property[];
      setProperties(propertiesData);
    });

    // Fetch showings
    const showingsQuery = query(
      collection(db, 'showings'),
      where('agentId', '==', agent.id)
    );

    const unsubscribeShowings = onSnapshot(showingsQuery, (snapshot) => {
      const showingsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          scheduledAt: data.scheduledAt,
        };
      }) as Showing[];

      setShowings(showingsData);
      setLoading(false);
    });

    return () => {
      unsubscribeProperties();
      unsubscribeShowings();
    };
  }, [agent]);

  // Combine showings with property data
  const showingsWithProperties = showings.map(showing => {
    const property = properties.find(p => p.id === showing.propertyId);
    return { ...showing, property };
  });

  // Calendar utilities
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);

  // Get showings for a specific day
  const getShowingsForDay = (day: number, monthOverride?: number, yearOverride?: number) => {
    const targetMonth = monthOverride ?? month;
    const targetYear = yearOverride ?? year;
    return showingsWithProperties.filter(showing => {
      const showingDate = showing.scheduledAt.toDate();
      return (
        showingDate.getDate() === day &&
        showingDate.getMonth() === targetMonth &&
        showingDate.getFullYear() === targetYear
      );
    }).sort((a, b) => a.scheduledAt.toDate().getTime() - b.scheduledAt.toDate().getTime());
  };

  // Calculate column layout for overlapping showings
  interface ShowingWithLayout extends Showing {
    property?: Property;
    column: number;
    totalColumns: number;
  }

  const calculateShowingLayout = (showings: (Showing & { property?: Property })[], pixelsPerHour: number): ShowingWithLayout[] => {
    if (showings.length === 0) return [];

    // Sort showings chronologically first - CRITICAL for column assignment
    const sortedShowings = [...showings].sort((a, b) =>
      a.scheduledAt.toDate().getTime() - b.scheduledAt.toDate().getTime()
    );

    // Helper: Check if two showings overlap visually (accounting for minimum heights)
    const showingsOverlap = (a: Showing, b: Showing) => {
      const aTime = a.scheduledAt.toDate();
      const bTime = b.scheduledAt.toDate();

      // Calculate visual positions
      const aTop = (aTime.getHours() * pixelsPerHour) + (aTime.getMinutes() / 60 * pixelsPerHour);
      const bTop = (bTime.getHours() * pixelsPerHour) + (bTime.getMinutes() / 60 * pixelsPerHour);

      // Calculate visual heights (with minimum height constraints)
      const minHeight = pixelsPerHour === 80 ? 60 : 40;
      const aHeight = Math.max((a.duration / 60) * pixelsPerHour, minHeight);
      const bHeight = Math.max((b.duration / 60) * pixelsPerHour, minHeight);

      const aBottom = aTop + aHeight;
      const bBottom = bTop + bHeight;

      // Standard overlap check: does event A's visual space overlap with event B's visual space?
      // We treat touching events as overlapping for proper cascading layout
      // Add 1px buffer to catch events that touch exactly at boundaries
      return aTop < bBottom && bTop < (aBottom + 1);
    };

    // Assign columns to showings
    const showingsWithLayout: ShowingWithLayout[] = sortedShowings.map(showing => ({
      ...showing,
      column: 0,
      totalColumns: 1,
    }));

    // For each showing, find which column it should be in
    for (let i = 0; i < showingsWithLayout.length; i++) {
      const currentShowing = showingsWithLayout[i];

      // Find all showings that overlap with this one, keeping track of their original indices
      const overlappingShowingsWithIndex: Array<{ showing: ShowingWithLayout; originalIndex: number }> = [];
      for (let j = 0; j < showingsWithLayout.length; j++) {
        if (j !== i && showingsOverlap(currentShowing, showingsWithLayout[j])) {
          overlappingShowingsWithIndex.push({
            showing: showingsWithLayout[j],
            originalIndex: j
          });
        }
      }

      // Find which columns are already taken by earlier overlapping showings
      const earlierOverlaps = overlappingShowingsWithIndex.filter(item => item.originalIndex < i);
      const takenColumns = new Set(
        earlierOverlaps.map(item => item.showing.column)
      );

      // Assign the first available column
      let column = 0;
      while (takenColumns.has(column)) {
        column++;
      }
      currentShowing.column = column;

      // Update totalColumns for all earlier overlapping showings
      // Only count columns that have been assigned (from earlier showings)
      if (earlierOverlaps.length > 0) {
        const assignedColumns = [column, ...earlierOverlaps.map(item => item.showing.column)];
        const maxColumn = Math.max(...assignedColumns);
        const totalColumns = maxColumn + 1;

        // Update this showing and all earlier overlapping showings
        currentShowing.totalColumns = totalColumns;
        earlierOverlaps.forEach(item => {
          item.showing.totalColumns = Math.max(item.showing.totalColumns, totalColumns);
        });
      }
    }

    return showingsWithLayout;
  };

  // Get working hours range from agent settings
  const getWorkingHoursRange = () => {
    if (!agent?.settings?.workingHours) {
      return { start: 0, end: 24 }; // Default to full day if no settings
    }

    const workingHours = agent.settings.workingHours;
    const enabledDays = Object.values(workingHours).filter(day => day.enabled);

    if (enabledDays.length === 0) {
      return { start: 9, end: 17 }; // Default 9-5 if no days enabled
    }

    // Find earliest start and latest end across all enabled days
    let earliestStart = 24;
    let latestEnd = 0;

    enabledDays.forEach(day => {
      const startHour = parseInt(day.start.split(':')[0]);
      const endHour = parseInt(day.end.split(':')[0]);
      earliestStart = Math.min(earliestStart, startHour);
      latestEnd = Math.max(latestEnd, endHour);
    });

    // Add buffer (1 hour before and after) for flexibility
    return {
      start: Math.max(0, earliestStart - 1),
      end: Math.min(24, latestEnd + 1)
    };
  };

  const workingHoursRange = getWorkingHoursRange();

  // Get showings for the current day (day view)
  const getShowingsForToday = () => {
    return showingsWithProperties.filter(showing => {
      const showingDate = showing.scheduledAt.toDate();
      return (
        showingDate.getDate() === currentDate.getDate() &&
        showingDate.getMonth() === currentDate.getMonth() &&
        showingDate.getFullYear() === currentDate.getFullYear()
      );
    }).sort((a, b) => a.scheduledAt.toDate().getTime() - b.scheduledAt.toDate().getTime());
  };

  // Get start of week
  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  };

  // Navigation
  const goToPreviousMonth = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    // Fade out first
    setTimeout(() => {
      setSlideDirection('right');
      const newDate = new Date(currentDate);

      switch (viewMode) {
        case 'day':
          newDate.setDate(newDate.getDate() - 1);
          break;
        case 'week':
          newDate.setDate(newDate.getDate() - 7);
          break;
        case 'month':
          newDate.setMonth(newDate.getMonth() - 1);
          break;
        case 'year':
          newDate.setFullYear(newDate.getFullYear() - 1);
          break;
      }

      setCurrentDate(newDate);
    }, 150);
    // Fade in complete
    setTimeout(() => {
      setIsAnimating(false);
      setSlideDirection(null);
    }, 450);
  };

  const goToNextMonth = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    // Fade out first
    setTimeout(() => {
      setSlideDirection('left');
      const newDate = new Date(currentDate);

      switch (viewMode) {
        case 'day':
          newDate.setDate(newDate.getDate() + 1);
          break;
        case 'week':
          newDate.setDate(newDate.getDate() + 7);
          break;
        case 'month':
          newDate.setMonth(newDate.getMonth() + 1);
          break;
        case 'year':
          newDate.setFullYear(newDate.getFullYear() + 1);
          break;
      }

      setCurrentDate(newDate);
    }, 150);
    // Fade in complete
    setTimeout(() => {
      setIsAnimating(false);
      setSlideDirection(null);
    }, 450);
  };

  const goToToday = () => {
    if (isAnimating) return;
    setSlideDirection(null);
    setCurrentDate(new Date());
    setViewMode('day');
  };

  // Status colors (matching Calendly's friendly design)
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'no-show':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const today = new Date();
  const isToday = (day: number) => {
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  // Get header title based on view mode
  const getHeaderTitle = () => {
    const date = currentDate;
    switch (viewMode) {
      case 'day':
        return `${fullDayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}`;
      case 'week': {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}-${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
        } else {
          return `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()} - ${monthNames[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
        }
      }
      case 'month':
        return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      case 'year':
        return `${date.getFullYear()}`;
      default:
        return '';
    }
  };

  // Generate Google Calendar URL
  const generateGoogleCalendarUrl = (showing: Showing & { property?: Property }) => {
    try {
      console.log('Showing scheduledAt:', showing.scheduledAt, 'Type:', typeof showing.scheduledAt);

      // Handle both Firestore Timestamp and Date objects
      let startTime: Date;

      if (showing.scheduledAt && typeof showing.scheduledAt === 'object' && 'toDate' in showing.scheduledAt) {
        // Firestore Timestamp
        startTime = showing.scheduledAt.toDate();
      } else if ((showing.scheduledAt as any) instanceof Date) {
        // Already a Date
        startTime = showing.scheduledAt as Date;
      } else {
        // Try to convert to Date
        startTime = new Date(showing.scheduledAt as any);
      }

      console.log('Converted startTime:', startTime, 'isValid:', !isNaN(startTime.getTime()));

      // Validate the date
      if (isNaN(startTime.getTime())) {
        console.error('Invalid start time after conversion:', showing.scheduledAt);
        alert('Error: Invalid date. Cannot create calendar event.');
        return '#';
      }

      // Use duration from showing, or default to 30 minutes for legacy showings
      const duration = showing.duration || 30;
      console.log('Showing duration:', showing.duration, 'Using duration:', duration);

      const endTime = new Date(startTime.getTime() + duration * 60000);
      console.log('End time calculated:', endTime, 'isValid:', !isNaN(endTime.getTime()));

      const formatDate = (date: Date) => {
        try {
          console.log('Formatting date:', date, 'Time:', date.getTime());
          const iso = date.toISOString();
          console.log('ISO string:', iso);
          return iso.replace(/[-:]/g, '').split('.')[0] + 'Z';
        } catch (err) {
          console.error('Error in formatDate:', err, 'Date:', date);
          throw err;
        }
      };

      const title = `Property Showing - ${showing.property?.address?.formatted || 'Address TBD'}`;
      const details = `Showing for ${showing.clientName}\nClient: ${showing.clientEmail} | ${showing.clientPhone}${showing.notes ? `\n\nNotes: ${showing.notes}` : ''}`;
      const location = showing.property?.address?.formatted || '';

      console.log('About to format dates...');
      const dates = `${formatDate(startTime)}/${formatDate(endTime)}`;
      console.log('Formatted dates:', dates);

      // Build the Google Calendar URL manually to ensure proper formatting
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dates}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;

      console.log('Generated Google Calendar URL:', url);
      return url;
    } catch (error) {
      console.error('Error generating Google Calendar URL:', error, error);
      alert('Error creating calendar link. Please try again.');
      return '#';
    }
  };

  // Handle status change
  const handleStatusChange = async (showingId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'showings', showingId), {
        status: newStatus,
      });

      // Send notification email
      if (selectedShowing) {
        await fetch('/api/send-status-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: newStatus,
            clientEmail: selectedShowing.clientEmail,
            clientName: selectedShowing.clientName,
            agentName: agent?.name,
            agentEmail: agent?.email,
            agentPhone: agent?.phone,
            propertyAddress: selectedShowing.property?.address.formatted,
            showingDate: selectedShowing.scheduledAt.toDate().toLocaleDateString(),
            showingTime: selectedShowing.scheduledAt.toDate().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          }),
        });
      }

      // Sync to Google Calendar if enabled (only for confirmed or cancelled showings)
      if (agent?.settings.googleCalendarSync) {
        try {
          let action: 'delete' | undefined = undefined;

          if (newStatus === 'cancelled') {
            // Delete event from calendar if showing is cancelled
            action = 'delete';
          } else if (newStatus === 'confirmed') {
            // Create/update event in calendar when confirmed
            action = undefined; // sync-showing will create or update
          } else {
            // Don't sync for 'completed' or 'no-show' - calendar event stays as-is
            console.log('[Calendar] Skipping calendar sync for status:', newStatus);
            throw new Error('skip'); // Skip calendar sync
          }

          await fetch('/api/calendar/sync-showing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              showingId,
              action,
            }),
          });
          console.log('[Calendar] Showing status synced to Google Calendar');
        } catch (calendarError) {
          if (calendarError instanceof Error && calendarError.message === 'skip') {
            // Intentionally skipped, not an error
          } else {
            console.error('Error syncing status to Google Calendar:', calendarError);
          }
          // Don't fail the status update if calendar sync fails
        }
      }

      setSelectedShowing(null);
    } catch (error) {
      console.error('Error updating showing status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Animation styles */}
      <style jsx>{`
        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
        @keyframes morphIn {
          from {
            opacity: 0;
            transform: scale(0.97);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-slide-left {
          animation: slideInFromLeft 0.3s ease-out;
        }
        .animate-slide-right {
          animation: slideInFromRight 0.3s ease-out;
        }
        .animate-fade-out {
          animation: fadeOut 0.15s ease-out forwards;
        }
        .animate-morph {
          animation: morphIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>

      {/* Header */}
      <div>
        <h1 className={STYLES.text.h1}>{STRINGS.dashboard.calendar}</h1>
        <p className={STYLES.text.muted}>Visual overview of all your scheduled showings</p>
      </div>

      {/* Calendar Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
        {/* View Mode Selector */}
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border-2 border-transparent"
          >
            Today
          </button>
          {(['day', 'week', 'month', 'year'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-4 py-2 rounded-lg font-semibold text-sm transition-all",
                viewMode === mode
                  ? "bg-blue-100 text-blue-700 border-2 border-blue-200"
                  : "bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100"
              )}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>

          <h2
            key={`${year}-${month}-${currentDate.getDate()}-${viewMode}`}
            className={cn(
              "text-2xl font-bold text-gray-900",
              isAnimating && !slideDirection && 'animate-fade-out',
              slideDirection === 'left' && 'animate-slide-left',
              slideDirection === 'right' && 'animate-slide-right'
            )}
          >
            {getHeaderTitle()}
          </h2>

          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div
        key={viewMode}
        className={cn(
          "bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden",
          "animate-morph"
        )}
      >
        {viewMode === 'month' && (
          <>
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
              {dayNames.map(day => (
                <div key={day} className="text-center py-4 text-sm font-semibold text-gray-700">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div
              key={`${year}-${month}`}
              className={cn(
                "grid grid-cols-7",
                isAnimating && !slideDirection && 'animate-fade-out',
                slideDirection === 'left' && 'animate-slide-left',
                slideDirection === 'right' && 'animate-slide-right'
              )}
            >
          {/* Empty cells for days before month starts */}
          {Array.from({ length: startingDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} className="min-h-[140px] bg-gray-50 border-b border-r border-gray-100" />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dayShowings = getShowingsForDay(day);
            const isTodayDate = isToday(day);

            return (
              <div
                key={day}
                className={cn(
                  'min-h-[140px] border-b border-r border-gray-100 p-3 transition-colors hover:bg-gray-50',
                  isTodayDate && 'bg-blue-50/30'
                )}
              >
                <div className={cn(
                  'text-sm font-semibold mb-2 w-8 h-8 flex items-center justify-center rounded-full',
                  isTodayDate ? 'bg-blue-600 text-white' : 'text-gray-700'
                )}>
                  {day}
                </div>

                {/* Showings for this day */}
                <div className="space-y-1.5">
                  {dayShowings.slice(0, 3).map(showing => (
                    <button
                      key={showing.id}
                      onClick={() => setSelectedShowing(showing)}
                      className={cn(
                        'w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium border transition-all hover:scale-105 hover:shadow-md',
                        getStatusColor(showing.status)
                      )}
                    >
                      <div className="flex items-center space-x-1 truncate">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {showing.scheduledAt.toDate().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="truncate text-[11px] mt-0.5 opacity-80">
                        {showing.property?.address.street}
                      </div>
                    </button>
                  ))}
                  {dayShowings.length > 3 && (
                    <div className="text-xs text-gray-500 text-center py-1">
                      +{dayShowings.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
            </div>
          </>
        )}

        {/* Week View */}
        {viewMode === 'week' && (
          <div className="flex">
            {/* Time scale */}
            <div className="w-20 flex-shrink-0 border-r border-gray-200">
              <div className="h-16"></div> {/* Header spacer */}
              {Array.from({ length: workingHoursRange.end - workingHoursRange.start }, (_, i) => {
                const hour = workingHoursRange.start + i;
                return (
                  <div key={hour} className="h-16 border-t border-gray-100 px-3 py-1 text-xs text-gray-500">
                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                  </div>
                );
              })}
            </div>

            {/* Week days */}
            <div className="flex-1 grid grid-cols-7">
              {getWeekDays().map((day, index) => {
                const dayShowings = getShowingsForDay(day.getDate(), day.getMonth(), day.getFullYear());
                const dayShowingsWithLayout = calculateShowingLayout(dayShowings, 64);
                const isTodayDate = day.toDateString() === new Date().toDateString();

                return (
                  <div key={index} className="border-r border-gray-200 last:border-r-0">
                    {/* Day header */}
                    <div className={cn(
                      "h-16 border-b border-gray-200 flex flex-col items-center justify-center",
                      isTodayDate && 'bg-blue-50/50'
                    )}>
                      <div className="text-xs text-gray-500 font-medium">{dayNames[day.getDay()]}</div>
                      <div className={cn(
                        "mt-1 w-10 h-10 flex items-center justify-center rounded-full font-semibold",
                        isTodayDate ? 'bg-blue-600 text-white' : 'text-gray-900'
                      )}>
                        {day.getDate()}
                      </div>
                    </div>

                    {/* Time grid */}
                    <div className="relative">
                      {/* Hour lines */}
                      {Array.from({ length: workingHoursRange.end - workingHoursRange.start }, (_, i) => {
                        const hour = workingHoursRange.start + i;
                        return (
                          <div key={hour} className={cn(
                            "h-16 border-t",
                            i === 0 ? 'border-gray-200' : 'border-gray-100'
                          )} />
                        );
                      })}

                      {/* Showings positioned by time with overlap handling */}
                      {dayShowingsWithLayout.map(showing => {
                        const showingTime = showing.scheduledAt.toDate();
                        const hours = showingTime.getHours();
                        const minutes = showingTime.getMinutes();
                        // Adjust position relative to working hours start
                        const topPosition = ((hours - workingHoursRange.start) * 64) + (minutes / 60 * 64);
                        const height = Math.max((showing.duration / 60) * 64, 40); // Min 40px height

                        // Calculate width and left position based on column layout
                        // Google Calendar style: each event takes remaining space after accounting for overlaps
                        const widthPercent = (100 / showing.totalColumns) * (showing.totalColumns - showing.column);
                        const leftPercent = (100 / showing.totalColumns) * showing.column;
                        const adjustedWidth = widthPercent - 1; // Small gap

                        return (
                          <button
                            key={showing.id}
                            onClick={() => setSelectedShowing(showing)}
                            className={cn(
                              'absolute px-2 py-1.5 rounded-lg text-xs font-medium border-2 transition-all hover:shadow-lg hover:z-10 overflow-hidden text-left',
                              getStatusColor(showing.status)
                            )}
                            style={{
                              top: `${topPosition}px`,
                              height: `${height}px`,
                              left: `${leftPercent}%`,
                              width: `${adjustedWidth}%`,
                            }}
                          >
                            {/* Compact view (< 50px): Just time */}
                            {height < 50 && (
                              <div className="font-semibold truncate">
                                {showingTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                              </div>
                            )}

                            {/* Medium view (50-70px): Time + address */}
                            {height >= 50 && height < 70 && (
                              <>
                                <div className="font-semibold truncate">
                                  {showingTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </div>
                                <div className="text-[11px] mt-0.5 opacity-80 truncate">
                                  {showing.property?.address.street}
                                </div>
                              </>
                            )}

                            {/* Full view (>= 70px): Time + address + client */}
                            {height >= 70 && (
                              <>
                                <div className="font-semibold truncate">
                                  {showingTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </div>
                                <div className="text-[11px] mt-0.5 opacity-80 truncate">
                                  {showing.property?.address.street}
                                </div>
                                <div className="text-[10px] mt-0.5 opacity-70 truncate">
                                  {showing.clientName}
                                </div>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Day View */}
        {viewMode === 'day' && (
          <div className="flex">
            {/* Time scale */}
            <div className="w-24 flex-shrink-0 border-r border-gray-200 p-4">
              <div className="h-20"></div> {/* Header spacer */}
              {Array.from({ length: workingHoursRange.end - workingHoursRange.start }, (_, i) => {
                const hour = workingHoursRange.start + i;
                return (
                  <div key={hour} className="h-20 border-t border-gray-100 py-2 text-sm text-gray-600 font-medium">
                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                  </div>
                );
              })}
            </div>

            {/* Timeline */}
            <div className="flex-1 p-4">
              {/* Day header */}
              <div className="h-20 mb-4 flex items-center justify-center">
                <h3 className="text-3xl font-bold text-gray-900">
                  {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
              </div>

              {/* Time grid */}
              <div className="relative">
                {/* Hour lines */}
                {Array.from({ length: workingHoursRange.end - workingHoursRange.start }, (_, i) => {
                  const hour = workingHoursRange.start + i;
                  return (
                    <div key={hour} className={cn(
                      "h-20 border-t",
                      i === 0 ? 'border-gray-200' : 'border-gray-100'
                    )} />
                  );
                })}

                {/* Showings positioned by time with overlap handling */}
                {calculateShowingLayout(getShowingsForToday(), 80).map(showing => {
                  const showingTime = showing.scheduledAt.toDate();
                  const hours = showingTime.getHours();
                  const minutes = showingTime.getMinutes();
                  // Adjust position relative to working hours start
                  const topPosition = ((hours - workingHoursRange.start) * 80) + (minutes / 60 * 80);
                  const height = Math.max((showing.duration / 60) * 80, 60); // Min 60px height

                  // Calculate width and left position based on column layout
                  // Google Calendar style: each event takes remaining space after accounting for overlaps
                  const widthPercent = (100 / showing.totalColumns) * (showing.totalColumns - showing.column);
                  const leftPercent = (100 / showing.totalColumns) * showing.column;
                  const adjustedWidth = widthPercent - 1; // Small gap

                  return (
                    <button
                      key={showing.id}
                      onClick={() => setSelectedShowing(showing)}
                      className={cn(
                        'absolute p-2 rounded-lg border-2 transition-all hover:shadow-lg hover:z-10 overflow-hidden text-left',
                        getStatusColor(showing.status)
                      )}
                      style={{
                        top: `${topPosition}px`,
                        height: `${height}px`,
                        left: `${leftPercent}%`,
                        width: `${adjustedWidth}%`,
                      }}
                    >
                      <div className="h-full overflow-hidden flex flex-col">
                        {/* Compact view (< 80px): Everything on one line */}
                        {height < 80 && (
                          <div className="text-xs font-semibold truncate">
                            {showingTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} • {showing.property?.address.street} • {showing.clientName}
                          </div>
                        )}

                        {/* Medium view (80-120px): Two lines */}
                        {height >= 80 && height < 120 && (
                          <>
                            <div className="font-bold text-sm mb-0.5 truncate">
                              {showingTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} • {showing.property?.address.street}
                            </div>
                            <div className="text-xs truncate opacity-90">
                              {showing.clientName}
                            </div>
                          </>
                        )}

                        {/* Full view (>= 120px): Multiple lines with icons */}
                        {height >= 120 && (
                          <>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="font-bold text-sm">
                                {showingTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                              </span>
                              <span className="text-xs opacity-75">({showing.duration} min)</span>
                            </div>
                            <div className="flex items-start gap-1.5 mb-1">
                              <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold truncate">{showing.property?.address.street}</div>
                                <div className="text-xs opacity-80 truncate">{showing.property?.address.city}, {showing.property?.address.state}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="text-xs truncate">{showing.clientName}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Empty state */}
                {getShowingsForToday().length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No showings scheduled for this day</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Year View */}
        {viewMode === 'year' && (
          <div className="p-6">
            <div className="grid grid-cols-3 gap-6">
              {Array.from({ length: 12 }).map((_, monthIndex) => {
                const monthShowings = showingsWithProperties.filter(showing => {
                  const showingDate = showing.scheduledAt.toDate();
                  return showingDate.getMonth() === monthIndex && showingDate.getFullYear() === year;
                });

                return (
                  <div key={monthIndex} className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-bold text-gray-900 mb-3 text-center">{monthNames[monthIndex]}</h4>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{monthShowings.length}</div>
                      <div className="text-xs text-gray-600 mt-1">showing{monthShowings.length !== 1 ? 's' : ''}</div>
                    </div>
                    {monthShowings.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {monthShowings.slice(0, 3).map(showing => (
                          <button
                            key={showing.id}
                            onClick={() => setSelectedShowing(showing)}
                            className="w-full text-left px-2 py-1 rounded text-xs hover:bg-white transition-colors"
                          >
                            <div className="font-medium truncate">
                              {showing.scheduledAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </button>
                        ))}
                        {monthShowings.length > 3 && (
                          <div className="text-xs text-gray-500 text-center">+{monthShowings.length - 3} more</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Showing Detail Modal */}
      {selectedShowing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900">Showing Details</h2>
              <button
                onClick={() => setSelectedShowing(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className={cn(
                  'px-4 py-2 rounded-full text-sm font-semibold border-2',
                  getStatusColor(selectedShowing.status)
                )}>
                  {selectedShowing.status.charAt(0).toUpperCase() + selectedShowing.status.slice(1)}
                </span>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <CalendarIcon className="w-4 h-4" />
                  <span>{selectedShowing.scheduledAt.toDate().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>

              {/* Property Info */}
              {selectedShowing.property && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">{selectedShowing.property.address.street}</p>
                      <p className="text-sm text-gray-600">{selectedShowing.property.address.city}, {selectedShowing.property.address.state} {selectedShowing.property.address.zip}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-700">
                    <span className="font-semibold text-blue-600">${selectedShowing.property.price.toLocaleString()}</span>
                    <span>•</span>
                    <span>{selectedShowing.property.bedrooms} bed</span>
                    <span>•</span>
                    <span>{selectedShowing.property.bathrooms} bath</span>
                    {selectedShowing.property.sqft && (
                      <>
                        <span>•</span>
                        <span>{selectedShowing.property.sqft.toLocaleString()} sqft</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Time Info */}
              <div className="flex items-center space-x-3 text-gray-700">
                <Clock className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="font-semibold">
                    {selectedShowing.scheduledAt.toDate().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </p>
                  <p className="text-sm text-gray-600">{selectedShowing.duration} minutes</p>
                </div>
              </div>

              {/* Client Info */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-blue-900 font-semibold mb-3">
                  <User className="w-5 h-5" />
                  <span>Client Information</span>
                </div>
                <div className="space-y-1 text-sm text-gray-900">
                  <p><span className="font-semibold text-gray-900">Name:</span> {selectedShowing.clientName}</p>
                  <p><span className="font-semibold text-gray-900">Email:</span> {selectedShowing.clientEmail}</p>
                  <p><span className="font-semibold text-gray-900">Phone:</span> {selectedShowing.clientPhone}</p>
                  {selectedShowing.preApproved && (
                    <p className="text-emerald-700 font-semibold">✓ Pre-approved</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedShowing.notes && (
                <div>
                  <p className="font-semibold text-gray-900 mb-2">Notes</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedShowing.notes}</p>
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <p className="font-semibold text-gray-900">Quick Actions</p>

                {/* Add to Calendar Button - Full Width */}
                {(selectedShowing.status === 'confirmed' || selectedShowing.status === 'scheduled') && (
                  <a
                    href={generateGoogleCalendarUrl(selectedShowing)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white border-2 border-transparent rounded-xl hover:from-blue-700 hover:to-emerald-700 transition-all font-semibold shadow-md hover:shadow-lg w-full"
                  >
                    <CalendarIcon className="w-5 h-5" />
                    <span>Add to Google Calendar</span>
                  </a>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {selectedShowing.status === 'scheduled' && (
                    <button
                      onClick={() => handleStatusChange(selectedShowing.id, 'confirmed')}
                      className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-100 text-blue-700 border-2 border-blue-200 rounded-xl hover:bg-blue-200 hover:border-blue-300 transition-colors font-semibold"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Confirm</span>
                    </button>
                  )}
                  {(selectedShowing.status === 'scheduled' || selectedShowing.status === 'confirmed') && (
                    <>
                      <button
                        onClick={() => handleStatusChange(selectedShowing.id, 'completed')}
                        className="flex items-center justify-center space-x-2 px-4 py-3 bg-emerald-100 text-emerald-700 border-2 border-emerald-200 rounded-xl hover:bg-emerald-200 hover:border-emerald-300 transition-colors font-semibold"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Complete</span>
                      </button>
                      <button
                        onClick={() => handleStatusChange(selectedShowing.id, 'cancelled')}
                        className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-100 text-red-700 border-2 border-red-200 rounded-xl hover:bg-red-200 hover:border-red-300 transition-colors font-semibold"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
