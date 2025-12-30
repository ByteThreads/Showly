// Timezone utility for US states
// Maps US state codes to IANA timezone identifiers

export const US_TIMEZONES = {
  // Eastern Time
  CT: 'America/New_York',
  DE: 'America/New_York',
  FL: 'America/New_York',
  GA: 'America/New_York',
  IN: 'America/New_York', // Most of Indiana
  KY: 'America/New_York', // Eastern Kentucky
  ME: 'America/New_York',
  MD: 'America/New_York',
  MA: 'America/New_York',
  MI: 'America/New_York', // Most of Michigan
  NH: 'America/New_York',
  NJ: 'America/New_York',
  NY: 'America/New_York',
  NC: 'America/New_York',
  OH: 'America/New_York',
  PA: 'America/New_York',
  RI: 'America/New_York',
  SC: 'America/New_York',
  VT: 'America/New_York',
  VA: 'America/New_York',
  WV: 'America/New_York',

  // Central Time
  AL: 'America/Chicago',
  AR: 'America/Chicago',
  IL: 'America/Chicago',
  IA: 'America/Chicago',
  KS: 'America/Chicago', // Most of Kansas
  LA: 'America/Chicago',
  MN: 'America/Chicago',
  MS: 'America/Chicago',
  MO: 'America/Chicago',
  NE: 'America/Chicago', // Most of Nebraska
  ND: 'America/Chicago', // Most of North Dakota
  OK: 'America/Chicago',
  SD: 'America/Chicago', // Most of South Dakota
  TN: 'America/Chicago', // Most of Tennessee
  TX: 'America/Chicago', // Most of Texas
  WI: 'America/Chicago',

  // Mountain Time
  AZ: 'America/Phoenix', // Arizona doesn't observe DST
  CO: 'America/Denver',
  ID: 'America/Denver', // Most of Idaho
  MT: 'America/Denver',
  NM: 'America/Denver',
  UT: 'America/Denver',
  WY: 'America/Denver',

  // Pacific Time
  CA: 'America/Los_Angeles',
  NV: 'America/Los_Angeles', // Most of Nevada
  OR: 'America/Los_Angeles',
  WA: 'America/Los_Angeles',

  // Alaska Time
  AK: 'America/Anchorage',

  // Hawaii Time
  HI: 'America/Honolulu',
} as const;

export type USStateCode = keyof typeof US_TIMEZONES;

/**
 * Get timezone for a US state
 */
export function getTimezoneForState(stateCode: string): string {
  const upperCode = stateCode.toUpperCase();
  return US_TIMEZONES[upperCode as USStateCode] || 'America/New_York'; // Default to Eastern
}

/**
 * Get short timezone name (e.g., "PST", "EST")
 */
export function getShortTimezoneName(timezone: string, date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });

    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((part) => part.type === 'timeZoneName');
    return tzPart?.value || '';
  } catch (error) {
    console.error('Error getting timezone name:', error);
    return '';
  }
}

/**
 * Get long timezone name (e.g., "Pacific Standard Time", "Eastern Daylight Time")
 */
export function getLongTimezoneName(timezone: string, date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'long',
    });

    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((part) => part.type === 'timeZoneName');
    return tzPart?.value || '';
  } catch (error) {
    console.error('Error getting timezone name:', error);
    return '';
  }
}

/**
 * Format a date/time in a specific timezone
 */
export function formatInTimezone(
  date: Date,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      ...options,
      timeZone: timezone,
    }).format(date);
  } catch (error) {
    console.error('Error formatting date in timezone:', error);
    return date.toLocaleString('en-US', options);
  }
}
