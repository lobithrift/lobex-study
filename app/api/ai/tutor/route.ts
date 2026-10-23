import { NextRequest, NextResponse } from 'next/server';
import { tutorQuerySchema } from '@/lib/validation/schemas';
import { getAiTutorResponse } from '@/lib/ai/provider';

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const result = tutorQuerySchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request input', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { message, level, history } = result.data;
    const aiResponse = await getAiTutorResponse(message, level, history);

    return NextResponse.json({
      text: aiResponse.text,
      source: aiResponse.source,
      disclaimer: 'AI-generated output. Always cross-check critical formulas and facts with your syllabus.',
    });
  } catch (error) {
    console.error('API /api/ai/tutor error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing the tutor request.' },
      { status: 500 }
    );
  }
}
