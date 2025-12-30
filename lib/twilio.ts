import twilio from 'twilio';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Only initialize if all credentials are present
export const twilioClient = accountSid && authToken
  ? twilio(accountSid, authToken)
  : null;

/**
 * SMS Templates - Keep messages under 160 characters to avoid multi-segment fees
 */
export const SMS_TEMPLATES = {
  /**
   * Booking confirmation (sent immediately after booking)
   * Example: "Your showing at 123 Main St is confirmed for Jan 15 at 2 PM. See you there! -John, ABC Realty"
   */
  bookingConfirmation: ({
    address,
    date,
    time,
    agentName,
  }: {
    address: string;
    date: string;
    time: string;
    agentName: string;
  }) => {
    return `Your showing at ${address} is confirmed for ${date} at ${time}. See you there! -${agentName}`;
  },

  /**
   * 1-hour reminder (sent 1 hour before showing)
   * Example: "Reminder: Your showing at 123 Main St starts in 1 hour (2 PM). See you soon! -John"
   */
  oneHourReminder: ({
    address,
    time,
    agentName,
  }: {
    address: string;
    time: string;
    agentName: string;
  }) => {
    return `Reminder: Your showing at ${address} starts in 1 hour (${time}). See you soon! -${agentName}`;
  },

  /**
   * Status changed to confirmed (agent confirmed the showing)
   * Example: "Your showing at 123 Main St on Jan 15 at 2 PM has been confirmed by your agent. -John"
   */
  statusConfirmed: ({
    address,
    date,
    time,
    agentName,
  }: {
    address: string;
    date: string;
    time: string;
    agentName: string;
  }) => {
    return `Your showing at ${address} on ${date} at ${time} has been confirmed. -${agentName}`;
  },

  /**
   * Status changed to cancelled
   * Example: "Your showing at 123 Main St on Jan 15 at 2 PM has been cancelled. Contact us to reschedule. -John"
   */
  statusCancelled: ({
    address,
    date,
    time,
    agentName,
  }: {
    address: string;
    date: string;
    time: string;
    agentName: string;
  }) => {
    return `Your showing at ${address} on ${date} at ${time} has been cancelled. Please contact us. -${agentName}`;
  },

  /**
   * Showing rescheduled
   * Example: "Your showing at 123 Main St has been rescheduled to Jan 16 at 3 PM. -John"
   */
  statusRescheduled: ({
    address,
    newDate,
    newTime,
    agentName,
  }: {
    address: string;
    newDate: string;
    newTime: string;
    agentName: string;
  }) => {
    return `Your showing at ${address} has been rescheduled to ${newDate} at ${newTime}. -${agentName}`;
  },
};

/**
 * Send SMS via Twilio
 */
export async function sendSMS({
  to,
  message,
}: {
  to: string;
  message: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Check if Twilio is configured
  if (!twilioClient || !twilioPhoneNumber) {
    console.error('Twilio not configured - missing credentials');
    return {
      success: false,
      error: 'SMS service not configured',
    };
  }

  // Validate phone number format (basic check)
  if (!to || to.length < 10) {
    return {
      success: false,
      error: 'Invalid phone number',
    };
  }

  // Ensure message is not empty
  if (!message || message.trim().length === 0) {
    return {
      success: false,
      error: 'Message cannot be empty',
    };
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: to,
    });

    console.log(`SMS sent successfully to ${to}. Message SID: ${result.sid}`);

    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error.message || 'Failed to send SMS',
    };
  }
}

/**
 * Format phone number to E.164 format if needed
 * Twilio requires phone numbers in E.164 format (e.g., +15551234567)
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // If it's a 10-digit US number, add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  // If it already has country code (11 digits starting with 1), add +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }

  // If it already starts with +, return as-is
  if (phone.startsWith('+')) {
    return phone;
  }

  // Otherwise, assume it's already formatted or international
  return `+${cleaned}`;
}
