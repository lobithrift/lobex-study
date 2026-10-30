import { NextRequest, NextResponse } from 'next/server';
import { brainBlitzGenerateSchema } from '@/lib/validation/schemas';
import { generateBrainBlitzQuestions } from '@/lib/ai/provider';
import { generateGroundedBrainBlitz } from '@/lib/ai/semanticExamEngine';

export async function POST(req: NextRequest) {
  let fallbackTopic = 'Custom Study Material';
  let fallbackNotes = '';
  let fallbackCount = 15;

  try {
    const json = await req.json();
    fallbackTopic = json.topic || fallbackTopic;
    fallbackNotes = json.notes || '';
    fallbackCount = json.questionCount || 15;

    const result = brainBlitzGenerateSchema.safeParse(json);

    if (!result.success) {
      console.warn('Brain Blitz payload warning, recovering with grounded questions:', result.error.flatten());
      const questions = generateGroundedBrainBlitz(fallbackTopic, fallbackNotes, fallbackCount);
      return NextResponse.json({
        topic: fallbackTopic,
        questionCount: questions.length,
        questions,
        source: 'grounded_recovery',
      });
    }

    const { topic, notes, questionCount, fileData } = result.data;
    const questions = await generateBrainBlitzQuestions(topic, notes, questionCount, fileData);

    return NextResponse.json({
      topic: topic || fileData?.fileName || 'Custom Study Material',
      questionCount: questions.length,
      questions,
      source: fileData ? 'uploaded_document' : notes ? 'custom_notes' : 'curriculum_topic',
    });
  } catch (error: any) {
    console.error('API /api/ai/brain-blitz error, engaging emergency recovery:', error);
    try {
      const questions = generateGroundedBrainBlitz(fallbackTopic, fallbackNotes, fallbackCount);
      return NextResponse.json({
        topic: fallbackTopic,
        questionCount: questions.length,
        questions,
        source: 'emergency_recovery',
      });
    } catch {
      return NextResponse.json(
        { error: 'Failed to generate Brain Blitz questions from study material.' },
        { status: 500 }
      );
    }
  }
}
