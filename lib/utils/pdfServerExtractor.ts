import zlib from 'zlib';

/**
 * Robust, zero-crash PDF plain text extractor for server-side Next.js route handlers.
 * Extracts text from both compressed (FlateDecode) and uncompressed PDF content streams.
 */
export async function extractTextFromPdfBase64(base64: string): Promise<string> {
  if (!base64 || typeof base64 !== 'string') {
    return '';
  }

  const cleanBase64 = base64.replace(/^data:application\/pdf;base64,/, '').trim();
  let buffer: Buffer;
  try {
    buffer = Buffer.from(cleanBase64, 'base64');
  } catch {
    return '';
  }

  // 1. Try dynamic pdf-parse if available and working in runtime
  try {
    const pdfParseMod = await import('pdf-parse');
    const PDFParse = pdfParseMod.PDFParse || (pdfParseMod as any).default?.PDFParse || (pdfParseMod as any).default;

    if (typeof PDFParse === 'function') {
      const uint8 = new Uint8Array(buffer);
      const parser: any = new PDFParse(uint8);
      if (typeof parser.load === 'function') {
        await parser.load();
      }
      const result = await parser.getText();
      let text = '';
      if (typeof result === 'string') {
        text = result;
      } else if (result && typeof result.text === 'string') {
        text = result.text;
      } else if (result && Array.isArray(result.pages)) {
        text = result.pages.map((p: any) => p.text || '').join('\n');
      }

      text = text
        .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '')
        .replace(/\r\n/g, '\n')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (text.length > 25) {
        return text;
      }
    }
  } catch {
    // Dynamic import failed (e.g. webpack bundling constraint) - seamlessly fall back to stream decompression
  }

  // 2. Resilient Pure-Node Stream Decompressor & Extractor (zero dependencies, never crashes)
  try {
    const textChunks: string[] = [];
    const rawString = buffer.toString('binary');

    // Find all streams: stream ... endstream
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;

    while ((match = streamRegex.exec(rawString)) !== null) {
      const streamStart = match.index + match[0].indexOf('\n') + 1;
      const streamEnd = match.index + match[0].lastIndexOf('\n');
      const streamBuf = buffer.subarray(streamStart, streamEnd);

      // Check dictionary for compression
      const dictSlice = rawString.slice(Math.max(0, match.index - 300), match.index);
      let decompressed = '';

      if (/FlateDecode/i.test(dictSlice)) {
        try {
          decompressed = zlib.inflateSync(streamBuf).toString('latin1');
        } catch {
          try {
            decompressed = zlib.inflateRawSync(streamBuf).toString('latin1');
          } catch {
            decompressed = streamBuf.toString('latin1');
          }
        }
      } else {
        decompressed = streamBuf.toString('latin1');
      }

      if (decompressed) {
        // Extract (Text) Tj
        const tjRegex = /\(([^()]{1,300})\)[\s]*Tj/g;
        let tj;
        while ((tj = tjRegex.exec(decompressed)) !== null) {
          const str = tj[1].replace(/\\([()\\])/g, '$1').trim();
          if (str && !/^[0-9\s.]+$/.test(str)) {
            textChunks.push(str);
          }
        }

        // Extract [(Text) 10 (More)] TJ
        const tjArrayRegex = /\[(.*?)\][\s]*TJ/g;
        let tjArr;
        while ((tjArr = tjArrayRegex.exec(decompressed)) !== null) {
          const inner = tjArr[1];
          const innerStrs = inner.match(/\(([^()]*)\)/g);
          if (innerStrs) {
            const joined = innerStrs
              .map((s) => s.slice(1, -1).replace(/\\([()\\])/g, '$1'))
              .join('')
              .trim();
            if (joined.length > 1) {
              textChunks.push(joined);
            }
          }
        }
      }
    }

    // Also check uncompressed text outside streams
    const plainTj = /\(([^()]{3,300})\)[\s]*Tj/g;
    let pMatch;
    while ((pMatch = plainTj.exec(rawString)) !== null) {
      const s = pMatch[1].replace(/\\([()\\])/g, '$1').trim();
      if (s && !textChunks.includes(s) && !/^[0-9\s.]+$/.test(s)) {
        textChunks.push(s);
      }
    }

    const extracted = textChunks.join(' ').replace(/\s{2,}/g, ' ').trim();
    if (extracted.length > 15) {
      return extracted;
    }
  } catch (err) {
    console.warn('Pure node PDF stream extraction fallback failed:', err);
  }

  return '';
}
