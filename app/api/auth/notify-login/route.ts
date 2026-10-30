import { NextRequest, NextResponse } from 'next/server';
import { loginNotificationSchema } from '@/lib/validation/schemas';
import { addLoginAuditRecord } from '@/lib/storage/loginAudit';

if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const result = loginNotificationSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid login notification payload', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { email, displayName, event, userAgent } = result.data;
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const timestamp = new Date().toISOString();
    const formattedDate = new Date().toLocaleString('en-US', {
      timeZone: 'UTC',
      dateStyle: 'full',
      timeStyle: 'long',
    });

    const eventTitles: Record<string, string> = {
      login: 'Student Sign-In',
      signup: 'New Student Registration',
      demo_access: 'Fast-Pass Instant Access',
    };
    const eventTitle = eventTitles[event] || 'Authentication Event';

    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'lobithrift@gmail.com';

    let emailSent = false;
    let statusMessage = 'Recorded in admin audit log';

    if (apiKey && adminEmail) {
      try {
        const subject = `🔔 [Lobex Study Alert] ${eventTitle}: ${email}`;
        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="background-color: #0f172a; padding: 24px; text-align: center; border-bottom: 2px solid #3b82f6;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">Lobex Study Security Telemetry</h1>
              <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px;">Real-time User Activity & Access Alert</p>
            </div>
            <div style="padding: 28px;">
              <div style="display: inline-block; background-color: ${event === 'signup' ? '#ecfdf5' : '#eff6ff'}; border: 1px solid ${event === 'signup' ? '#a7f3d0' : '#bfdbfe'}; color: ${event === 'signup' ? '#065f46' : '#1e40af'}; font-size: 12px; font-weight: 700; padding: 4px 10px; rounded-md; text-transform: uppercase; border-radius: 6px; margin-bottom: 16px;">
                ${eventTitle}
              </div>
              <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 18px; font-weight: 700;">A user has accessed Lobex Study</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155; margin-bottom: 24px;">
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; font-weight: 600; width: 140px; color: #64748b;">User Email:</td>
                  <td style="padding: 10px 0; font-weight: 700; color: #0f172a;">${email}</td>
                </tr>
                ${displayName ? `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Display Name:</td>
                  <td style="padding: 10px 0; color: #334155;">${displayName}</td>
                </tr>
                ` : ''}
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Event Type:</td>
                  <td style="padding: 10px 0; color: #334155;">${eventTitle}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Timestamp (UTC):</td>
                  <td style="padding: 10px 0; color: #334155;">${formattedDate}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; font-weight: 600; color: #64748b;">IP Address:</td>
                  <td style="padding: 10px 0; font-family: monospace; color: #334155;">${clientIp}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 600; color: #64748b; vertical-align: top;">Browser / Device:</td>
                  <td style="padding: 10px 0; font-size: 12px; color: #64748b; word-break: break-all;">${userAgent || 'Not reported'}</td>
                </tr>
              </table>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
                  <strong>Long-Term Practice Notice:</strong> This email was dispatched automatically via the Lobex Study Login Notification Pipeline to notify the system administrator.
                </p>
              </div>

              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px;">
                  Open Admin Security Portal &rarr;
                </a>
              </div>
            </div>
            <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
              Lobex Study Automated Pipeline &bull; Delivered via Resend API
            </div>
          </div>
        `;

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from: fromAddress,
            to: adminEmail,
            subject,
            html,
            text: `[Lobex Study Alert] ${eventTitle}: ${email} at ${formattedDate}. IP: ${clientIp}.`,
          }),
        });

        if (res.ok) {
          const resData = await res.json();
          emailSent = true;
          statusMessage = `Email dispatched to ${adminEmail} (ID: ${resData.id})`;
        } else {
          const errBody = await res.text();
          console.warn('Resend returned non-200 code:', res.status, errBody);
          statusMessage = `Resend HTTP ${res.status}: ${errBody.slice(0, 100)}`;
        }
      } catch (sendErr: any) {
        console.warn('Resend connection hitch:', sendErr);
        statusMessage = `Delivery error: ${sendErr.message || 'Unknown'}`;
      }
    } else {
      statusMessage = 'Saved to audit trail (Set RESEND_API_KEY in .env.local for live dispatch)';
    }

    // Always record in server-side audit store
    const record = addLoginAuditRecord({
      email,
      displayName,
      event,
      timestamp,
      ip: clientIp,
      userAgent,
      emailSent,
      statusMessage,
    });

    console.log(`[LOGIN NOTIFICATION PIPELINE] ${eventTitle} for ${email}. Email sent: ${emailSent}. Status: ${statusMessage}`);

    return NextResponse.json({
      success: true,
      emailSent,
      auditLogged: true,
      statusMessage,
      record,
    });
  } catch (error) {
    console.error('API /api/auth/notify-login error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing login notification' },
      { status: 500 }
    );
  }
}
