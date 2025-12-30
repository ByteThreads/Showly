import type { Agent, Showing, WorkingHours } from '@/types/database';

export interface TimeSlot {
  date: Date;
  time: string; // "9:00 AM"
  available: boolean;
}

export interface GroupedTimeSlots {
  date: string; // "Monday, Dec 23"
  dateKey: string; // "2024-12-23"
  slots: TimeSlot[];
}

/**
 * Generate available time slots for a property based on agent's working hours
 * @param agent Agent with working hours settings
 * @param existingShowings Already booked showings for this property
 * @param showingDuration Duration of each showing in minutes (default 30)
 * @param bufferTime Buffer time between showings in minutes (default 15)
 * @param daysAhead How many days to generate slots for (uses agent's bookingWindow setting, default 14)
 */
export function generateTimeSlots(
  agent: Agent,
  existingShowings: Showing[],
  showingDuration: number = 30,
  bufferTime: number = 15,
  daysAhead?: number
): GroupedTimeSlots[] {
  // Use agent's booking window setting if daysAhead not specified
  const effectiveDaysAhead = daysAhead ?? agent?.settings?.bookingWindow ?? 14;
  const slots: GroupedTimeSlots[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log('Generating time slots:', {
    effectiveDaysAhead,
    showingDuration,
    bufferTime,
    agentWorkingHours: agent?.settings?.workingHours
  });

  // Generate slots for each day
  for (let dayOffset = 0; dayOffset < effectiveDaysAhead; dayOffset++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + dayOffset);

    const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const workingHoursForDay = agent?.settings?.workingHours?.[dayOfWeek as keyof typeof agent.settings.workingHours];

    // Skip if agent doesn't work this day or data is missing
    if (!workingHoursForDay || !workingHoursForDay.enabled) {
      continue;
    }

    // Generate time slots for this day
    const daySlots = generateSlotsForDay(
      currentDate,
      workingHoursForDay.start,
      workingHoursForDay.end,
      showingDuration,
      bufferTime,
      existingShowings
    );

    if (daySlots.length > 0) {
      slots.push({
        date: currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
        dateKey: currentDate.toISOString().split('T')[0],
        slots: daySlots,
      });
    }
  }

  return slots;
}

/**
 * Generate time slots for a specific day
 */
function generateSlotsForDay(
  date: Date,
  startTime: string, // "09:00"
  endTime: string, // "17:00"
  showingDuration: number,
  bufferTime: number,
  existingShowings: Showing[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const slotDuration = showingDuration + bufferTime;

  // Parse start and end times
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  // Create start and end Date objects
  const startDate = new Date(date);
  startDate.setHours(startHour, startMin, 0, 0);

  const endDate = new Date(date);
  endDate.setHours(endHour, endMin, 0, 0);

  // Generate slots
  let currentSlot = new Date(startDate);
  const now = new Date();

  while (currentSlot < endDate) {
    // Check if slot is in the past
    const isPast = currentSlot < now;

    // Check if slot conflicts with existing showing
    const hasConflict = existingShowings.some(showing => {
      const showingStart = showing.scheduledAt.toDate();
      const showingEnd = new Date(showingStart.getTime() + (showingDuration * 60 * 1000));

      return (
        currentSlot >= showingStart && currentSlot < showingEnd ||
        currentSlot.getTime() === showingStart.getTime()
      );
    });

    slots.push({
      date: new Date(currentSlot),
      time: formatTime(currentSlot),
      available: !isPast && !hasConflict,
    });

    // Move to next slot
    currentSlot = new Date(currentSlot.getTime() + (slotDuration * 60 * 1000));
  }

  return slots;
}

/**
 * Format time as "9:00 AM"
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Group slots by time of day
 */
export function groupSlotsByTimeOfDay(slots: TimeSlot[]): {
  morning: TimeSlot[];
  afternoon: TimeSlot[];
  evening: TimeSlot[];
} {
  const morning: TimeSlot[] = [];
  const afternoon: TimeSlot[] = [];
  const evening: TimeSlot[] = [];

  slots.forEach(slot => {
    const hour = slot.date.getHours();

    if (hour < 12) {
      morning.push(slot);
    } else if (hour < 17) {
      afternoon.push(slot);
    } else {
      evening.push(slot);
    }
  });

  return { morning, afternoon, evening };
}

/**
 * Count showings for a specific week
 */
export function countShowingsThisWeek(showings: Showing[]): number {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return showings.filter(showing => {
    const showingDate = showing.scheduledAt.toDate();
    return showingDate >= startOfWeek && showingDate < endOfWeek;
  }).length;
}
