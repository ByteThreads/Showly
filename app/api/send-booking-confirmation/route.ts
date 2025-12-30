import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import type { EmailBranding } from '@/types/database';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, clientName, agentName, propertyAddress, showingDate, showingTime, agentEmail, agentPhone, emailBranding } = body as {
      to: string;
      clientName: string;
      agentName: string;
      propertyAddress: string;
      showingDate: string;
      showingTime: string;
      agentEmail: string;
      agentPhone: string;
      emailBranding?: EmailBranding;
    };

    // Use custom branding or defaults
    const primaryColor = emailBranding?.primaryColor || '#2563EB';
    const accentColor = emailBranding?.accentColor || '#10B981';
    const brandLogo = emailBranding?.brandLogo;
    const footerText = emailBranding?.footerText;

    // Send email to client
    const clientEmail = await resend.emails.send({
      from: 'Showly <noreply@bytethreadsllc.com>',
      to: to,
      replyTo: agentEmail, // Allows client to reply directly to agent
      subject: `Your Property Showing is Confirmed - ${propertyAddress}`,
      text: `Hi ${clientName},

Your showing has been confirmed!

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

If you need to reschedule, please contact ${agentName} directly.

Thank you,
Showly`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: ${primaryColor}; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .logo { max-width: 150px; max-height: 60px; margin-bottom: 15px; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
              .property { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .details { margin: 15px 0; }
              .details strong { color: #1f2937; }
              .button { display: inline-block; background: ${accentColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
              .custom-footer { color: #4b5563; font-size: 13px; margin-top: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                ${brandLogo ? `<img src="${brandLogo}" alt="Logo" class="logo" />` : ''}
                <h1 style="margin: 0;">Showing Confirmed!</h1>
              </div>
              <div class="content">
                <p>Hi ${clientName},</p>
                <p>Your showing has been confirmed. We're excited to show you this property!</p>

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
                  <p style="font-size: 12px; color: #9ca3af;">This is an automated confirmation email.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    // Send notification email to agent
    const agentEmailNotification = await resend.emails.send({
      from: 'Showly <noreply@bytethreadsllc.com>',
      to: agentEmail,
      replyTo: to, // Allows agent to reply directly to client
      subject: `New Showing Booked: ${propertyAddress}`,
      text: `Hi ${agentName},

You have a new showing scheduled!

Property: ${propertyAddress}
Date: ${showingDate}
Time: ${showingTime}

Client Information:
Name: ${clientName}
Email: ${to}

The client has been sent a confirmation email with your contact information.

Manage your showings at your dashboard.

Showly`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
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
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                ${brandLogo ? `<img src="${brandLogo}" alt="Logo" class="logo" />` : ''}
                <h1 style="margin: 0;">🎉 New Showing Booked!</h1>
              </div>
              <div class="content">
                <p>Hi ${agentName},</p>
                <p>You have a new showing scheduled:</p>

                <div class="property">
                  <h2 style="margin-top: 0; color: #1f2937;">📍 ${propertyAddress}</h2>
                  <div class="details">
                    <strong>📅 Date:</strong> ${showingDate}<br>
                    <strong>🕐 Time:</strong> ${showingTime}
                  </div>
                </div>

                <h3>Client Information</h3>
                <div class="details">
                  <strong>Name:</strong> ${clientName}<br>
                  <strong>Email:</strong> <a href="mailto:${to}" style="color: ${accentColor};">${to}</a>
                </div>

                <p>The client has been sent a confirmation email with your contact information.</p>

                <div class="footer">
                  ${footerText ? `<p class="custom-footer">${footerText}</p>` : ''}
                  <p>Powered by <strong>Showly</strong></p>
                  <p style="font-size: 12px; color: #9ca3af;">Manage your showings at your dashboard</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return NextResponse.json({
      success: true,
      clientEmailId: clientEmail.data?.id,
      agentEmailId: agentEmailNotification.data?.id
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
