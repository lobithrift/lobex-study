import { NextRequest, NextResponse } from 'next/server';
import { summarizeDocumentSchema } from '@/lib/validation/schemas';
import { summarizeDocument } from '@/lib/ai/provider';
import { generateGroundedDocumentSummary } from '@/lib/ai/semanticExamEngine';

export async function POST(req: NextRequest) {
  let fallbackText = '';
  let fallbackName = 'Document';

  try {
    const json = await req.json();
    fallbackText = json.text || '';
    fallbackName = json.fileName || 'Document';

    const result = summarizeDocumentSchema.safeParse(json);

    if (!result.success) {
      console.warn('Summarize payload warning, recovering with grounded summary:', result.error.flatten());
      const summary = generateGroundedDocumentSummary(fallbackText, fallbackName);
      return NextResponse.json({ summary });
    }

    const { text, pdfBase64, fileName } = result.data;
    const summary = await summarizeDocument({ text, pdfBase64, fileName });

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('API /api/ai/summarize error, engaging emergency recovery:', error);
    try {
      const summary = generateGroundedDocumentSummary(fallbackText, fallbackName);
      return NextResponse.json({ summary });
    } catch {
      return NextResponse.json(
        { error: 'An unexpected error occurred while analyzing the document.' },
        { status: 500 }
      );
    }
  }
}
