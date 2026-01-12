import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import type { EmailBranding } from '@/types/database';

const resend = new Resend(process.env.RESEND_API_KEY);

type NotificationType = 'confirmed' | 'cancelled' | 'rescheduled' | 'completed';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      clientEmail,
      clientName,
      agentName,
      agentEmail,
      agentPhone,
      propertyAddress,
      showingDate,
      showingTime,
      oldShowingDate,
      oldShowingTime,
      emailBranding,
    } = body as {
      type: NotificationType;
      clientEmail: string;
      clientName: string;
      agentName: string;
      agentEmail: string;
      agentPhone: string;
      propertyAddress: string;
      showingDate: string;
      showingTime: string;
      oldShowingDate?: string;
      oldShowingTime?: string;
      emailBranding?: EmailBranding;
    };

    // Build email content based on notification type
    const emailContent = getEmailContent(type, {
      clientName,
      agentName,
      agentEmail,
      agentPhone,
      propertyAddress,
      showingDate,
      showingTime,
      oldShowingDate,
      oldShowingTime,
      emailBranding,
    });

    // Send email to client
    console.log('Sending status notification email:', {
      type,
      from: 'Showly <noreply@bytethreadsllc.com>',
      to: clientEmail,
      subject: emailContent.subject,
    });

    const clientEmailResult = await resend.emails.send({
      from: 'Showly <noreply@bytethreadsllc.com>',
      to: clientEmail,
      replyTo: agentEmail,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    console.log('Email sent successfully! Resend ID:', clientEmailResult.data?.id);

    return NextResponse.json({
      success: true,
      emailId: clientEmailResult.data?.id,
    });
  } catch (error: any) {
    console.error('Error sending status notification:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function getEmailContent(
  type: NotificationType,
  data: {
    clientName: string;
    agentName: string;
    agentEmail: string;
    agentPhone: string;
    propertyAddress: string;
    showingDate: string;
    showingTime: string;
    oldShowingDate?: string;
    oldShowingTime?: string;
    emailBranding?: EmailBranding;
  }
) {
  const { clientName, agentName, agentEmail, agentPhone, propertyAddress, showingDate, showingTime, oldShowingDate, oldShowingTime, emailBranding } = data;

  // Use custom branding or defaults
  const primaryColor = emailBranding?.primaryColor || '#2563EB';
  const accentColor = emailBranding?.accentColor || '#10B981';
  const brandLogo = emailBranding?.brandLogo;
  const footerText = emailBranding?.footerText;

  const baseStyle = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${primaryColor}; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .logo { max-width: 150px; max-height: 60px; margin-bottom: 15px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .property { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .details { margin: 15px 0; }
    .details strong { color: #1f2937; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    .custom-footer { color: #4b5563; font-size: 13px; margin-top: 10px; }
    .cancelled { background: #FEE2E2; border: 1px solid #FCA5A5; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .old-time { text-decoration: line-through; color: #9CA3AF; }
    .new-time { color: ${accentColor}; font-weight: bold; }
  `;

  switch (type) {
    case 'confirmed':
      return {
        subject: `Showing Confirmed - ${propertyAddress}`,
        text: `Hi ${clientName},

Great news! Your showing has been confirmed by ${agentName}.

Property: ${propertyAddress}
Date: ${showingDate}
Time: ${showingTime}

Your Agent:
${agentName}
${agentEmail}
${agentPhone}

If you need to make any changes, please contact ${agentName} directly.

Thank you,
Showly`,
        html: `
          <!DOCTYPE html>
          <html>
            <head><style>${baseStyle}</style></head>
            <body>
              <div class="container">
                <div class="header">
                  ${brandLogo ? `<img src="${brandLogo}" alt="Logo" class="logo" />` : ''}
                  <h1 style="margin: 0;">✓ Showing Confirmed!</h1>
                </div>
                <div class="content">
                  <p>Hi ${clientName},</p>
                  <p>Great news! Your showing has been confirmed by ${agentName}.</p>

                  <div class="property">
                    <h2 style="margin-top: 0; color: #1f2937;">📍 ${propertyAddress}</h2>
                    <div class="details">
                      <strong>📅 Date:</strong> ${showingDate}<br>
                      <strong>🕐 Time:</strong> ${showingTime}
                    </div>
                  </div>

                  <h3>Your Agent</h3>
                  <div class="details">
                    <strong>Name:</strong> ${agentName}<br>
                    <strong>Email:</strong> <a href="mailto:${agentEmail}" style="color: ${accentColor};">${agentEmail}</a><br>
                    <strong>Phone:</strong> <a href="tel:${agentPhone}" style="color: ${accentColor};">${agentPhone}</a>
                  </div>

                  <p>If you need to make any changes, please contact ${agentName} directly.</p>

                  <div class="footer">
                    ${footerText ? `<p class="custom-footer">${footerText}</p>` : ''}
                    <p>Powered by <strong>Showly</strong></p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case 'cancelled':
      return {
        subject: `Showing Cancelled - ${propertyAddress}`,
        text: `Hi ${clientName},

Your showing has been cancelled.

Property: ${propertyAddress}
Original Date: ${showingDate}
Original Time: ${showingTime}

If you would like to reschedule or have any questions, please contact ${agentName}:
${agentEmail}
${agentPhone}

Thank you,
Showly`,
        html: `
          <!DOCTYPE html>
          <html>
            <head><style>${baseStyle}</style></head>
            <body>
              <div class="container">
                <div class="header" style="background: #DC2626;">
                  ${brandLogo ? `<img src="${brandLogo}" alt="Logo" class="logo" />` : ''}
                  <h1 style="margin: 0;">Showing Cancelled</h1>
                </div>
                <div class="content">
                  <p>Hi ${clientName},</p>
                  <p>Your showing has been cancelled.</p>

                  <div class="cancelled">
                    <h2 style="margin-top: 0; color: #991B1B;">📍 ${propertyAddress}</h2>
                    <div class="details">
                      <strong>📅 Date:</strong> ${showingDate}<br>
                      <strong>🕐 Time:</strong> ${showingTime}
                    </div>
                  </div>

                  <p>If you would like to reschedule or have any questions, please contact ${agentName}:</p>
                  <div class="details">
                    <strong>Email:</strong> <a href="mailto:${agentEmail}" style="color: ${accentColor};">${agentEmail}</a><br>
                    <strong>Phone:</strong> <a href="tel:${agentPhone}" style="color: ${accentColor};">${agentPhone}</a>
                  </div>

                  <div class="footer">
                    ${footerText ? `<p class="custom-footer">${footerText}</p>` : ''}
                    <p>Powered by <strong>Showly</strong></p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case 'rescheduled':
      return {
        subject: `Showing Rescheduled - ${propertyAddress}`,
        text: `Hi ${clientName},

Your showing has been rescheduled.

Property: ${propertyAddress}

Previous Time:
${oldShowingDate} at ${oldShowingTime}

New Time:
${showingDate} at ${showingTime}

Your Agent:
${agentName}
${agentEmail}
${agentPhone}

If you have any questions, please contact ${agentName} directly.

Thank you,
Showly`,
        html: `
          <!DOCTYPE html>
          <html>
            <head><style>${baseStyle}</style></head>
            <body>
              <div class="container">
                <div class="header" style="background: #7C3AED;">
                  ${brandLogo ? `<img src="${brandLogo}" alt="Logo" class="logo" />` : ''}
                  <h1 style="margin: 0;">Showing Rescheduled</h1>
                </div>
                <div class="content">
                  <p>Hi ${clientName},</p>
                  <p>Your showing has been rescheduled to a new time.</p>

                  <div class="property">
                    <h2 style="margin-top: 0; color: #1f2937;">📍 ${propertyAddress}</h2>

                    <div class="details">
                      <p><strong>Previous Time:</strong></p>
                      <p class="old-time">📅 ${oldShowingDate}<br>🕐 ${oldShowingTime}</p>

                      <p><strong>New Time:</strong></p>
                      <p class="new-time">📅 ${showingDate}<br>🕐 ${showingTime}</p>
                    </div>
                  </div>

                  <h3>Your Agent</h3>
                  <div class="details">
                    <strong>Name:</strong> ${agentName}<br>
                    <strong>Email:</strong> <a href="mailto:${agentEmail}" style="color: ${accentColor};">${agentEmail}</a><br>
                    <strong>Phone:</strong> <a href="tel:${agentPhone}" style="color: ${accentColor};">${agentPhone}</a>
                  </div>

                  <p>If you have any questions, please contact ${agentName} directly.</p>

                  <div class="footer">
                    ${footerText ? `<p class="custom-footer">${footerText}</p>` : ''}
                    <p>Powered by <strong>Showly</strong></p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case 'completed':
      return {
        subject: `Thank You for Visiting - ${propertyAddress}`,
        text: `Hi ${clientName},

Thank you for viewing the property at ${propertyAddress} on ${showingDate}.

We hope you enjoyed the showing! If you have any questions or would like to schedule another viewing, please contact ${agentName}:

${agentEmail}
${agentPhone}

Thank you,
Showly`,
        html: `
          <!DOCTYPE html>
          <html>
            <head><style>${baseStyle}</style></head>
            <body>
              <div class="container">
                <div class="header" style="background: #059669;">
                  ${brandLogo ? `<img src="${brandLogo}" alt="Logo" class="logo" />` : ''}
                  <h1 style="margin: 0;">Thank You!</h1>
                </div>
                <div class="content">
                  <p>Hi ${clientName},</p>
                  <p>Thank you for viewing the property at <strong>${propertyAddress}</strong> on ${showingDate}.</p>

                  <p>We hope you enjoyed the showing! If you have any questions or would like to schedule another viewing, please contact ${agentName}:</p>

                  <div class="details">
                    <strong>Email:</strong> <a href="mailto:${agentEmail}" style="color: ${accentColor};">${agentEmail}</a><br>
                    <strong>Phone:</strong> <a href="tel:${agentPhone}" style="color: ${accentColor};">${agentPhone}</a>
                  </div>

                  <div class="footer">
                    ${footerText ? `<p class="custom-footer">${footerText}</p>` : ''}
                    <p>Powered by <strong>Showly</strong></p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    default:
      throw new Error(`Unknown notification type: ${type}`);
  }
}
