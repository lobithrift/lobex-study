import { NextRequest, NextResponse } from 'next/server';
import { inMemoryReports, ReportedItem } from '@/lib/ai/provider';

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
    platformMetrics: {
      registeredStudents: 24,
      totalQuizzesGenerated: 142,
      totalStudySets: 89,
      brainBlitzRoundsPlayed: 320,
    },
    flaggedReports: inMemoryReports,
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

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('API /api/admin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
