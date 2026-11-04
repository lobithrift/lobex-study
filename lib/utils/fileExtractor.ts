import mammoth from 'mammoth';

export interface ExtractedFileResult {
  fileName: string;
  fileType: 'pdf' | 'docx' | 'image' | 'text' | 'unknown';
  sizeBytes: number;
  extractedText?: string;
  fileData?: {
    base64: string;
    mimeType: string;
    fileName: string;
  };
  error?: string;
}

/**
 * Converts a browser File object into base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Parses and extracts text/multimodal payload from an educational file:
 * - PDF (.pdf) -> base64 for Gemini multimodal document reasoning
 * - Word Docs (.docx) -> extracted text via mammoth
 * - Images (.png, .jpg, .jpeg, .webp) -> base64 for visual multimodal reasoning
 * - Text (.txt, .md, .csv) -> raw text extraction
 */
export async function extractEducationalFile(file: File): Promise<ExtractedFileResult> {
  const name = file.name;
  const lowerName = name.toLowerCase();
  const sizeBytes = file.size;

  if (sizeBytes > 25 * 1024 * 1024) {
    return {
      fileName: name,
      fileType: 'unknown',
      sizeBytes,
      error: 'File size exceeds 25MB limit. Please upload a smaller excerpt.',
    };
  }

  try {
    // 1. PDF
    if (file.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
      const base64 = await fileToBase64(file);
      let extractedText: string | undefined;

      // Call extraction route to populate plain text for immediate client UI preview and grounding
      if (typeof window !== 'undefined') {
        try {
          const res = await fetch('/api/ai/extract-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64, fileName: name, mimeType: 'application/pdf' }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.text && typeof data.text === 'string') {
              extractedText = data.text;
            }
          }
        } catch (e) {
          console.warn('Client-side PDF text extraction helper caught:', e);
        }
      }

      return {
        fileName: name,
        fileType: 'pdf',
        sizeBytes,
        extractedText,
        fileData: {
          base64,
          mimeType: 'application/pdf',
          fileName: name,
        },
      };
    }

    // 2. Images (Diagrams, formulas, lecture slides, whiteboard photos)
    if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(lowerName)) {
      const base64 = await fileToBase64(file);
      const mimeType = file.type || (lowerName.endsWith('.png') ? 'image/png' : 'image/jpeg');
      return {
        fileName: name,
        fileType: 'image',
        sizeBytes,
        fileData: {
          base64,
          mimeType,
          fileName: name,
        },
      };
    }

    // 3. Word Document (.docx)
    if (
      lowerName.endsWith('.docx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value.trim();
      return {
        fileName: name,
        fileType: 'docx',
        sizeBytes,
        extractedText: text,
      };
    }

    // 4. Plain Text, Markdown, Notes
    if (
      file.type.startsWith('text/') ||
      /\.(txt|md|csv|json)$/i.test(lowerName)
    ) {
      const text = await file.text();
      return {
        fileName: name,
        fileType: 'text',
        sizeBytes,
        extractedText: text.trim(),
      };
    }

    // Fallback: try reading as text
    const textFallback = await file.text();
    return {
      fileName: name,
      fileType: 'unknown',
      sizeBytes,
      extractedText: textFallback.slice(0, 30000),
    };
  } catch (err: any) {
    console.error('File parsing error:', err);
    return {
      fileName: name,
      fileType: 'unknown',
      sizeBytes,
      error: err.message || 'Failed to process educational file.',
    };
  }
}
