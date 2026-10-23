import { NextRequest, NextResponse } from 'next/server';
import { explainConceptSchema } from '@/lib/validation/schemas';
import { getConceptExplanation } from '@/lib/ai/provider';

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const result = explainConceptSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid topic input', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { topic, level } = result.data;
    const explanation = await getConceptExplanation(topic, level);

    return NextResponse.json(explanation);
  } catch (error) {
    console.error('API /api/ai/explain error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while explaining the concept.' },
      { status: 500 }
    );
  }
}
