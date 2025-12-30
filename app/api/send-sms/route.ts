import { NextRequest, NextResponse } from 'next/server';
import { sendSMS, SMS_TEMPLATES, formatPhoneNumber } from '@/lib/twilio';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      to,
      type, // 'booking', 'reminder1h', 'confirmed', 'cancelled', 'rescheduled'
      address,
      date,
      time,
      newDate,
      newTime,
      agentName,
    } = body;

    // Validate required fields
    if (!to) {
      return NextResponse.json(
        { error: 'Phone number (to) is required' },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: 'Message type is required' },
        { status: 400 }
      );
    }

    // Format phone number to E.164
    const formattedPhone = formatPhoneNumber(to);

    // Generate message based on type
    let message: string;

    switch (type) {
      case 'booking':
        if (!address || !date || !time || !agentName) {
          return NextResponse.json(
            { error: 'Missing required fields for booking confirmation' },
            { status: 400 }
          );
        }
        message = SMS_TEMPLATES.bookingConfirmation({
          address,
          date,
          time,
          agentName,
        });
        break;

      case 'reminder1h':
        if (!address || !time || !agentName) {
          return NextResponse.json(
            { error: 'Missing required fields for 1-hour reminder' },
            { status: 400 }
          );
        }
        message = SMS_TEMPLATES.oneHourReminder({
          address,
          time,
          agentName,
        });
        break;

      case 'confirmed':
        if (!address || !date || !time || !agentName) {
          return NextResponse.json(
            { error: 'Missing required fields for confirmation' },
            { status: 400 }
          );
        }
        message = SMS_TEMPLATES.statusConfirmed({
          address,
          date,
          time,
          agentName,
        });
        break;

      case 'cancelled':
        if (!address || !date || !time || !agentName) {
          return NextResponse.json(
            { error: 'Missing required fields for cancellation' },
            { status: 400 }
          );
        }
        message = SMS_TEMPLATES.statusCancelled({
          address,
          date,
          time,
          agentName,
        });
        break;

      case 'rescheduled':
        if (!address || !newDate || !newTime || !agentName) {
          return NextResponse.json(
            { error: 'Missing required fields for reschedule' },
            { status: 400 }
          );
        }
        message = SMS_TEMPLATES.statusRescheduled({
          address,
          newDate,
          newTime,
          agentName,
        });
        break;

      default:
        return NextResponse.json(
          { error: `Unknown message type: ${type}` },
          { status: 400 }
        );
    }

    // Send the SMS
    const result = await sendSMS({
      to: formattedPhone,
      message,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: 'SMS sent successfully',
      });
    } else {
      // Return error but don't fail the request
      // SMS is optional, so we log the error but don't block the main flow
      console.error('SMS sending failed:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error,
        message: 'SMS sending failed (non-critical)',
      }, { status: 200 }); // Return 200 to not block main flow
    }
  } catch (error: any) {
    console.error('Error in SMS API route:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
    }, { status: 200 }); // Return 200 to not block main flow
  }
}
