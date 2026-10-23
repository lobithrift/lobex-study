import { NextRequest, NextResponse } from 'next/server';
import { flashcardsGenerateSchema } from '@/lib/validation/schemas';
import { generateFlashcards } from '@/lib/ai/provider';

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const result = flashcardsGenerateSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid flashcard options', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { topic, notes, count, fileData } = result.data;
    const cards = await generateFlashcards(topic, notes, count, fileData);

    return NextResponse.json({
      topic,
      count: cards.length,
      flashcards: cards,
    });
  } catch (error) {
    console.error('API /api/ai/flashcards error:', error);
    return NextResponse.json(
      { error: 'Failed to generate flashcards.' },
      { status: 500 }
    );
  }
}
