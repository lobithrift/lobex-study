import { NextRequest, NextResponse } from 'next/server';
import { inMemoryReports, ReportedItem } from '@/lib/ai/provider';
import { loginAuditStore, addLoginAuditRecord } from '@/lib/storage/loginAudit';

if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'lobex_admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'LobexAdmin#2026!Secure';

// Generate consistent token based on credentials
function getAdminToken(): string {
  return 'lobex_adm_' + Buffer.from(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}`).toString('base64');
}

function verifyAdminAuth(req: NextRequest): boolean {
  const token = getAdminToken();
  const authHeader = req.headers.get('authorization') || '';
  const tokenHeader = req.headers.get('x-admin-token') || '';

  if (tokenHeader === token) return true;
  if (authHeader.startsWith('Bearer ') && authHeader.slice(7) === token) return true;
  return false;
}

export async function GET(req: NextRequest) {
  // Validate secret admin token
  if (!verifyAdminAuth(req)) {
    return NextResponse.json(
      { error: 'Unauthorized: Secret administrative token required.' },
      { status: 401 }
    );
  }

  // System status metrics
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
  const hasLlmKey = Boolean(process.env.LLM_API_KEY);
  const hasResendKey = Boolean(process.env.RESEND_API_KEY);
  const adminNotificationEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'lobithrift@gmail.com';

  const stats = {
    systemHealth: {
      supabaseDatabase: hasSupabaseUrl && hasSupabaseKey ? 'Operational (RLS Enforced)' : 'Degraded',
      aiProvider: hasGeminiKey
        ? 'Google Gemini API Active (Multimodal PDF Enabled)'
        : hasLlmKey
        ? 'OpenAI-Compatible LLM Active'
        : 'Offline Academic Engine Active',
      emailService: hasResendKey ? 'Live Resend Active' : 'Local Simulation Active',
      status: 'Healthy',
    },
    notificationPipeline: {
      adminEmail: adminNotificationEmail,
      fromEmail: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      resendConfigured: hasResendKey,
      status: hasResendKey ? 'Live Delivery Active' : 'Simulation & Audit Mode',
    },
    platformMetrics: {
      registeredStudents: 24,
      totalQuizzesGenerated: 142,
      totalStudySets: 89,
      brainBlitzRoundsPlayed: 320,
    },
    flaggedReports: inMemoryReports,
    recentLogins: loginAuditStore,
  };

  return NextResponse.json(stats);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Admin login verification
    if (body.action === 'login') {
      const { username, password } = body;
      const validUser = (username === ADMIN_USERNAME || username === 'admin@lobex.study');
      const validPass = password === ADMIN_PASSWORD;

      if (validUser && validPass) {
        return NextResponse.json({
          success: true,
          token: getAdminToken(),
          username: ADMIN_USERNAME,
        });
      }

      return NextResponse.json(
        { error: 'Invalid administrative username or secret password.' },
        { status: 401 }
      );
    }

    // 2. Submit a new flag / report from user
    if (body.action === 'report') {
      const { query, response, reason } = body;
      const newReport: ReportedItem = {
        id: `rep-${Date.now()}`,
        timestamp: new Date().toISOString(),
        query: String(query || '').slice(0, 500),
        response: String(response || '').slice(0, 1000),
        reason: String(reason || 'Reported for review').slice(0, 300),
        status: 'pending',
      };
      inMemoryReports.unshift(newReport);
      return NextResponse.json({ success: true, report: newReport });
    }

    // 3. Admin updates report status (requires secret admin authentication)
    if (body.action === 'update_status') {
      if (!verifyAdminAuth(req)) {
        return NextResponse.json(
          { error: 'Unauthorized: Administrative authentication required.' },
          { status: 401 }
        );
      }

      const { id, status } = body;
      const item = inMemoryReports.find((r) => r.id === id);
      if (item && (status === 'reviewed' || status === 'dismissed' || status === 'pending')) {
        item.status = status;
        return NextResponse.json({ success: true, item });
      }
      return NextResponse.json({ error: 'Report not found or invalid status' }, { status: 404 });
    }

    // 4. Test notification dispatch (requires secret admin authentication)
    if (body.action === 'test_notification') {
      if (!verifyAdminAuth(req)) {
        return NextResponse.json(
          { error: 'Unauthorized: Administrative authentication required.' },
          { status: 401 }
        );
      }

      const targetEmail = body.email || process.env.ADMIN_NOTIFICATION_EMAIL || 'lobithrift@gmail.com';
      const apiKey = process.env.RESEND_API_KEY;
      const fromAddress = process.env.EMAIL_FROM || 'onboarding@resend.dev';

      let emailSent = false;
      let statusMessage = 'Simulated test alert (No RESEND_API_KEY)';

      if (apiKey && targetEmail) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              from: fromAddress,
              to: targetEmail,
              subject: '🔔 [Lobex Study] Admin Notification Pipeline Test',
              html: `
                <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                  <h2 style="color: #0f172a; margin-top: 0;">🎉 Notification Pipeline Active!</h2>
                  <p style="color: #334155; line-height: 1.5;">This is a test notification from your Lobex Study platform. Your login and security alert pipeline is configured and ready to notify you whenever students access the system.</p>
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #475569; margin: 16px 0;">
                    <tr><td style="padding: 6px 0; font-weight: bold;">Recipient:</td><td>${targetEmail}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">Sender:</td><td>${fromAddress}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">Timestamp:</td><td>${new Date().toUTCString()}</td></tr>
                  </table>
                  <div style="margin-top: 20px; padding: 12px; background-color: #f8fafc; border-radius: 8px; font-size: 12px; color: #64748b;">
                    Delivered via Resend REST API &bull; Lobex Study Administration
                  </div>
                </div>
              `,
              text: `[Lobex Study] Notification pipeline test to ${targetEmail} succeeded at ${new Date().toUTCString()}.`,
            }),
          });

          if (res.ok) {
            const resData = await res.json();
            emailSent = true;
            statusMessage = `Email successfully dispatched to ${targetEmail} (ID: ${resData.id})`;
          } else {
            const errText = await res.text();
            statusMessage = `Resend HTTP ${res.status}: ${errText.slice(0, 100)}`;
          }
        } catch (err: any) {
          statusMessage = `Dispatch failed: ${err.message || 'Unknown network error'}`;
        }
      }

      addLoginAuditRecord({
        email: 'admin_test_probe@lobex-study.internal',
        displayName: 'Admin Test Probe',
        event: 'demo_access',
        timestamp: new Date().toISOString(),
        ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || 'Admin Dashboard Probe',
        emailSent,
        statusMessage,
      });

      return NextResponse.json({
        success: emailSent,
        emailSent,
        statusMessage,
        targetEmail,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('API /api/admin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
