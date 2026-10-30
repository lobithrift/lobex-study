import { NextRequest, NextResponse } from 'next/server';
import { emailSendSchema } from '@/lib/validation/schemas';

if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const result = emailSendSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid email payload', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { to, subject, content } = result.data;
    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.EMAIL_FROM || 'onboarding@resend.dev';

    if (apiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from: fromAddress,
            to,
            subject,
            text: content,
          }),
        });

        if (!res.ok) {
          console.error('Resend provider returned status:', res.status);
          return NextResponse.json(
            { error: 'Email could not be sent at this time. Please try again later.' },
            { status: 502 }
          );
        }

        const data = await res.json();
        return NextResponse.json({ success: true, id: data.id });
      } catch (e) {
        console.error('Error contacting Resend service:', e);
        return NextResponse.json(
          { error: 'Email could not be sent. Service temporarily unavailable.' },
          { status: 502 }
        );
      }
    }

    // Educational local simulation when RESEND_API_KEY is not configured
    return NextResponse.json({
      success: true,
      simulated: true,
      message: `Email delivery simulated successfully to ${to}. (Set RESEND_API_KEY to send live emails).`,
    });
  } catch (error) {
    console.error('API /api/email error:', error);
    return NextResponse.json(
      { error: 'Internal server error while processing email request.' },
      { status: 500 }
    );
  }
}
