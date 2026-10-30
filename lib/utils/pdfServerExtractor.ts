import { PDFParse } from 'pdf-parse';

/**
 * Extracts plain text from a base64-encoded PDF string on the server.
 */
export async function extractTextFromPdfBase64(base64: string): Promise<string> {
  if (!base64 || typeof base64 !== 'string') {
    return '';
  }

  try {
    const cleanBase64 = base64.replace(/^data:application\/pdf;base64,/, '').trim();
    const buffer = Buffer.from(cleanBase64, 'base64');
    const uint8 = new Uint8Array(buffer);

    const parser: any = new PDFParse(uint8);
    if (typeof parser.load === 'function') {
      await parser.load();
    }

    const result = await parser.getText();
    let text = '';

    if (typeof result === 'string') {
      text = result;
    } else if (result && typeof (result as any).text === 'string') {
      text = (result as any).text;
    } else if (result && Array.isArray((result as any).pages)) {
      text = (result as any).pages.map((p: any) => p.text || '').join('\n');
    }

    // Clean up pagination noise like "-- 1 of 5 --"
    text = text.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '');

    // Normalize spacing and clean null/unprintable bytes
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (text.length > 30) {
      return text;
    }
  } catch (error) {
    console.warn('PDFParse failed, attempting stream extraction fallback:', error);
  }

  // Fallback: direct regex text extraction from uncompressed PDF streams
  try {
    const cleanBase64 = base64.replace(/^data:application\/pdf;base64,/, '').trim();
    const buffer = Buffer.from(cleanBase64, 'base64');
    const raw = buffer.toString('latin1');
    const textMatches = raw.match(/\(([^()]{3,200})\)[\s]*Tj/g);
    if (textMatches && textMatches.length >= 3) {
      return textMatches
        .map((m) => m.replace(/^[\s(]+/, '').replace(/[)\s]*Tj$/, ''))
        .filter((s) => !/^[0-9\s.]+$/.test(s))
        .join(' ')
        .slice(0, 40000);
    }
  } catch (err) {
    console.warn('Stream extraction fallback failed:', err);
  }

  return '';
}
