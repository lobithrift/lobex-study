import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPdfBase64 } from '@/lib/utils/pdfServerExtractor';

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { base64, fileName = 'document.pdf', mimeType = 'application/pdf' } = json;

    if (!base64 || typeof base64 !== 'string') {
      return NextResponse.json({ error: 'Missing base64 document content' }, { status: 400 });
    }

    let text = '';
    if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      text = await extractTextFromPdfBase64(base64);
    } else {
      try {
        const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '');
        text = Buffer.from(cleanBase64, 'base64').toString('utf-8');
      } catch {
        text = '';
      }
    }

    const trimmed = text.trim();
    const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;

    return NextResponse.json({
      success: true,
      text: trimmed,
      wordCount,
      characterCount: trimmed.length,
      fileName,
    });
  } catch (error: any) {
    console.error('Error in /api/ai/extract-text:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract text from document.' },
      { status: 500 }
    );
  }
}
