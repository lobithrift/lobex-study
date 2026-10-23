import { NextRequest, NextResponse } from 'next/server';
import { brainBlitzGenerateSchema } from '@/lib/validation/schemas';
import { generateBrainBlitzQuestions } from '@/lib/ai/provider';

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const result = brainBlitzGenerateSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid Brain Blitz parameters', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { topic, notes, questionCount, fileData } = result.data;
    const questions = await generateBrainBlitzQuestions(topic, notes, questionCount, fileData);

    return NextResponse.json({
      topic: topic || fileData?.fileName || 'Custom Study Material',
      questionCount: questions.length,
      questions,
      source: fileData ? 'uploaded_document' : notes ? 'custom_notes' : 'curriculum_topic',
    });
  } catch (error) {
    console.error('API /api/ai/brain-blitz error:', error);
    return NextResponse.json(
      { error: 'Failed to generate Brain Blitz questions from study material.' },
      { status: 500 }
    );
  }
}
