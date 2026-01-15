// TypeScript types matching Firestore database schema
import type { Timestamp } from 'firebase/firestore';

export type SubscriptionStatus = 'active' | 'inactive' | 'trial' | 'cancelled' | 'past_due';
export type ShowingStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
export type PropertyStatus = 'active' | 'pending' | 'sold' | 'inactive';

export interface WorkingHours {
  start: string;      // "09:00"
  end: string;        // "17:00"
  enabled: boolean;
}

export interface EmailBranding {
  brandLogo?: string;           // URL to uploaded brand logo
  primaryColor?: string;         // Hex color for email headers/buttons (e.g., "#2563EB")
  accentColor?: string;          // Hex color for accents (e.g., "#10B981")
  footerText?: string;           // Custom footer text
}

export interface AgentSettings {
  defaultShowingDuration: number;
  bufferTime: number;
  bookingWindow: number;  // How many days ahead showings can be booked (default: 14)
  workingHours: {
    monday: WorkingHours;
    tuesday: WorkingHours;
    wednesday: WorkingHours;
    thursday: WorkingHours;
    friday: WorkingHours;
    saturday: WorkingHours;
    sunday: WorkingHours;
  };
  smsReminders: boolean;
  emailReminders: boolean;
  googleCalendarSync: boolean;
  googleRefreshToken?: string;
  googleAccessToken?: string;
  googleTokenExpiry?: number;  // Unix timestamp when access token expires
  googleCalendarId?: string;  // Calendar ID to sync to (usually "primary")
  calendarFeedToken?: string;  // Unique token for iCal subscription feed (webcal://.../feed/[token])
  emailBranding?: EmailBranding;  // Custom email branding settings
}

export interface Agent {
  id: string;
  email: string;
  name: string;
  phone: string;
  brokerage?: string;
  bio?: string;
  photoURL?: string;

  // Subscription & Billing
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;  // Which product/price they're subscribed to (founder vs standard)
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndDate?: Date;  // Date (converted from Timestamp by auth context)

  // Trial Tracking
  trialStartDate?: Date;  // Date (converted from Timestamp by auth context)
  trialShowingsCount: number;  // Count showings during trial for 3-showing limit

  // Founder Program (first 200 customers)
  isFounderCustomer: boolean;
  founderNumber?: number;  // 1-200 for early customers

  createdAt: Date;  // Date (converted from Timestamp by auth context)
  updatedAt: Date;  // Date (converted from Timestamp by auth context)
  settings: AgentSettings;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  formatted: string;
}

export interface Property {
  id: string;
  agentId: string;
  address: Address;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft?: number;
  description?: string; // Optional property description (max 1000 characters)
  photoURL?: string; // Legacy: first photo URL (kept for backward compatibility)
  photos?: string[]; // Array of photo URLs in display order
  mlsNumber?: string;
  // Note: showingDuration and bufferTime are now global settings from agent.settings
  // Legacy properties may still have these fields, but they are ignored
  showingDuration?: number; // Legacy field - no longer used
  bufferTime?: number; // Legacy field - no longer used
  status: PropertyStatus;
  bookingSlug: string;
  isBookingEnabled: boolean;
  timezone: string; // IANA timezone identifier (e.g., "America/New_York")
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ClientInfo {
  name: string;
  email: string;
  phone: string;
  preApproved?: boolean;
  notes?: string;
}

export interface Reminders {
  email24h: boolean;
  email1h: boolean;
  sms24h: boolean;
  sms1h: boolean;
}

export interface ShowingFeedback {
  interested: boolean;
  rating?: number;
  comments?: string;
  submittedAt?: Timestamp;
}

export interface Showing {
  id: string;
  propertyId: string;
  agentId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes?: string;
  preApproved: boolean;
  scheduledAt: Timestamp;
  duration: number;
  status: ShowingStatus;
  clientWantsReminders: boolean; // Whether client opted in to receive email reminders
  clientWantsSMS: boolean; // Whether client explicitly opted in to receive SMS notifications (TCPA compliance)
  smsConsentTimestamp?: Timestamp; // When client provided SMS consent (TCPA compliance)
  reminders: Reminders;
  feedback?: ShowingFeedback;
  cancelledAt?: Timestamp;
  cancellationReason?: string;
  rescheduledFrom?: Timestamp; // Original scheduled time if rescheduled
  googleCalendarEventId?: string; // Google Calendar event ID for synced events
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Feedback {
  id: string;
  showingId: string;
  propertyId: string;
  agentId: string;
  interested: boolean;
  rating: number;
  comments: string;
  clientName: string;
  clientEmail: string;
  submittedAt: Timestamp;
}

// Helper types for forms
export interface CreatePropertyInput {
  address: Address;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft?: number;
  photoURL?: string;
  mlsNumber?: string;
}

export interface BookShowingInput {
  propertyId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  scheduledAt: Date;
  notes?: string;
  preApproved?: boolean;
}

export interface SubmitFeedbackInput {
  showingId: string;
  interested: boolean;
  rating: number;
  comments: string;
}
