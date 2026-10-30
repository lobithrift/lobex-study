import { NextRequest, NextResponse } from 'next/server';
import { quizGenerateSchema } from '@/lib/validation/schemas';
import { generateQuizQuestions } from '@/lib/ai/provider';
import { generateGroundedExamQuiz } from '@/lib/ai/semanticExamEngine';

export async function POST(req: NextRequest) {
  let fallbackTopic = 'Course Revision';
  let fallbackNotes = '';
  let fallbackCount = 5;
  let fallbackDifficulty: any = 'medium';

  try {
    const json = await req.json();
    fallbackTopic = json.topic || fallbackTopic;
    fallbackNotes = json.notes || '';
    fallbackCount = json.questionCount || 5;
    fallbackDifficulty = json.difficulty || 'medium';

    const result = quizGenerateSchema.safeParse(json);

    if (!result.success) {
      console.warn('Quiz validation warning, recovering with safe fallback:', result.error.flatten());
      const questions = generateGroundedExamQuiz(fallbackTopic, fallbackNotes, fallbackCount, fallbackDifficulty);
      return NextResponse.json({
        topic: fallbackTopic,
        difficulty: fallbackDifficulty,
        questionCount: questions.length,
        questions,
      });
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
  } catch (error: any) {
    console.error('API /api/ai/quiz error, engaging emergency grounded recovery:', error);
    try {
      const questions = generateGroundedExamQuiz(fallbackTopic, fallbackNotes, fallbackCount, fallbackDifficulty);
      return NextResponse.json({
        topic: fallbackTopic,
        difficulty: fallbackDifficulty,
        questionCount: questions.length,
        questions,
      });
    } catch {
      return NextResponse.json(
        { error: 'Failed to generate practice quiz: ' + (error?.message || 'Unexpected server error') },
        { status: 500 }
      );
    }
  }
}
