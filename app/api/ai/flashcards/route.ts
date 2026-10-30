import { NextRequest, NextResponse } from 'next/server';
import { flashcardsGenerateSchema } from '@/lib/validation/schemas';
import { generateFlashcards } from '@/lib/ai/provider';
import { generateGroundedFlashcards } from '@/lib/ai/semanticExamEngine';

export async function POST(req: NextRequest) {
  let fallbackTopic = 'Course Revision';
  let fallbackNotes = '';
  let fallbackCount = 6;

  try {
    const json = await req.json();
    fallbackTopic = json.topic || fallbackTopic;
    fallbackNotes = json.notes || '';
    fallbackCount = json.count || 6;

    const result = flashcardsGenerateSchema.safeParse(json);

    if (!result.success) {
      console.warn('Flashcard payload warning, recovering with grounded flashcards:', result.error.flatten());
      const cards = generateGroundedFlashcards(fallbackTopic, fallbackNotes, fallbackCount);
      return NextResponse.json({
        topic: fallbackTopic,
        count: cards.length,
        flashcards: cards,
      });
    }

    const { topic, notes, count, fileData } = result.data;
    const cards = await generateFlashcards(topic, notes, count, fileData);

    return NextResponse.json({
      topic,
      count: cards.length,
      flashcards: cards,
    });
  } catch (error: any) {
    console.error('API /api/ai/flashcards error, engaging emergency recovery:', error);
    try {
      const cards = generateGroundedFlashcards(fallbackTopic, fallbackNotes, fallbackCount);
      return NextResponse.json({
        topic: fallbackTopic,
        count: cards.length,
        flashcards: cards,
      });
    } catch {
      return NextResponse.json(
        { error: 'Failed to generate flashcards.' },
        { status: 500 }
      );
    }
  }
}
