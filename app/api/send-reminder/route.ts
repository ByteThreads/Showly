import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import type { EmailBranding } from '@/types/database';

const resend = new Resend(process.env.RESEND_API_KEY);

type ReminderType = '24h' | '1h';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      reminderType,
      clientEmail,
      clientName,
      agentName,
      agentEmail,
      agentPhone,
      propertyAddress,
      showingDate,
      showingTime,
      emailBranding,
    } = body as {
      reminderType: ReminderType;
      clientEmail: string;
      clientName: string;
      agentName: string;
      agentEmail: string;
      agentPhone: string;
      propertyAddress: string;
      showingDate: string;
      showingTime: string;
      emailBranding?: EmailBranding;
    };

    // Build email content based on reminder type
    const emailContent = getReminderEmailContent(reminderType, {
      clientName,
      agentName,
      agentEmail,
      agentPhone,
      propertyAddress,
      showingDate,
      showingTime,
      emailBranding,
    });

    // Send email to client
    const clientEmailResult = await resend.emails.send({
      from: 'Showly <noreply@bytethreadsllc.com>',
      to: clientEmail,
      replyTo: agentEmail,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    return NextResponse.json({
      success: true,
      emailId: clientEmailResult.data?.id,
    });
  } catch (error: any) {
    console.error('Error sending reminder:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function getReminderEmailContent(
  reminderType: ReminderType,
  data: {
    clientName: string;
    agentName: string;
    agentEmail: string;
    agentPhone: string;
    propertyAddress: string;
    showingDate: string;
    showingTime: string;
    emailBranding?: EmailBranding;
  }
) {
  const { clientName, agentName, agentEmail, agentPhone, propertyAddress, showingDate, showingTime, emailBranding } = data;

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
    .reminder-badge { background: #FEF3C7; color: #92400E; padding: 8px 16px; border-radius: 6px; font-weight: bold; display: inline-block; margin-bottom: 20px; }
    .property { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .details { margin: 15px 0; }
    .details strong { color: #1f2937; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    .custom-footer { color: #4b5563; font-size: 13px; margin-top: 10px; }
  `;

  if (reminderType === '24h') {
    return {
      subject: `Reminder: Property Showing Tomorrow - ${propertyAddress}`,
      text: `Hi ${clientName},

This is a reminder that you have a property showing scheduled for tomorrow!

Property: ${propertyAddress}
Date: ${showingDate}
Time: ${showingTime}

Your Agent:
${agentName}
${agentEmail}
${agentPhone}

What to bring:
- Valid photo ID
- Pre-approval letter (if applicable)
- Any questions you have about the property

If you need to reschedule or have any questions, please contact ${agentName} directly.

See you tomorrow!
Showly`,
      html: `
        <!DOCTYPE html>
        <html>
          <head><style>${baseStyle}</style></head>
          <body>
            <div class="container">
              <div class="header">
                ${brandLogo ? `<img src="${brandLogo}" alt="Logo" class="logo" />` : ''}
                <h1 style="margin: 0;">🔔 Showing Reminder</h1>
              </div>
              <div class="content">
                <div class="reminder-badge">⏰ Tomorrow</div>

                <p>Hi ${clientName},</p>
                <p>This is a friendly reminder that you have a property showing scheduled for <strong>tomorrow</strong>!</p>

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

                <p><strong>What to bring:</strong></p>
                <ul>
                  <li>Valid photo ID</li>
                  <li>Pre-approval letter (if applicable)</li>
                  <li>Any questions you have about the property</li>
                </ul>

                <p>If you need to reschedule or have any questions, please contact ${agentName} directly.</p>

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
  } else {
    // 1 hour reminder
    return {
      subject: `Reminder: Property Showing in 1 Hour - ${propertyAddress}`,
      text: `Hi ${clientName},

Your property showing is coming up in 1 hour!

Property: ${propertyAddress}
Date: ${showingDate}
Time: ${showingTime}

Your Agent:
${agentName}
${agentEmail}
${agentPhone}

We're looking forward to seeing you soon!

Showly`,
      html: `
        <!DOCTYPE html>
        <html>
          <head><style>${baseStyle}</style></head>
          <body>
            <div class="container">
              <div class="header">
                ${brandLogo ? `<img src="${brandLogo}" alt="Logo" class="logo" />` : ''}
                <h1 style="margin: 0;">🔔 Showing Soon!</h1>
              </div>
              <div class="content">
                <div class="reminder-badge">⏰ In 1 Hour</div>

                <p>Hi ${clientName},</p>
                <p>This is a quick reminder that your property showing is coming up in <strong>1 hour</strong>!</p>

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

                <p>We're looking forward to seeing you soon!</p>

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
  }
}
