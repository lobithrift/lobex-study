import { NextRequest, NextResponse } from 'next/server';
import { summarizeDocumentSchema } from '@/lib/validation/schemas';
import { summarizeDocument } from '@/lib/ai/provider';

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const result = summarizeDocumentSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid document payload', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { text, pdfBase64, fileName } = result.data;
    const summary = await summarizeDocument({ text, pdfBase64, fileName });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('API /api/ai/summarize error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while analyzing the document.' },
      { status: 500 }
    );
  }
}
