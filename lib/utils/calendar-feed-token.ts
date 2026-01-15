/**
 * Generate unique calendar feed token for iCal subscription
 */

import { randomBytes } from 'crypto';

/**
 * Generate a secure random token for calendar feed subscription
 * Returns a URL-safe base64 string (32 bytes = 256 bits of entropy)
 */
export function generateCalendarFeedToken(): string {
  return randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
