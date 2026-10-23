import { NextRequest, NextResponse } from 'next/server';
import { quizGenerateSchema } from '@/lib/validation/schemas';
import { generateQuizQuestions } from '@/lib/ai/provider';

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const result = quizGenerateSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid quiz options', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { topic, notes, questionCount, difficulty, fileData } = result.data;
    const questions = await generateQuizQuestions(topic, notes, questionCount, difficulty, fileData);

    return NextResponse.json({
      topic,
      difficulty,
      questionCount: questions.length,
      questions,
      disclaimer: 'Generated practice questions. Intended for active recall revision, not an official test guarantee.',
    });
  } catch (error) {
    console.error('API /api/ai/quiz error:', error);
    return NextResponse.json(
      { error: 'Failed to generate practice quiz.' },
      { status: 500 }
    );
  }
}
