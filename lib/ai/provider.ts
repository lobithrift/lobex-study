import { ExplanationLevel, DifficultyLevel, QuizQuestion, Flashcard, DocumentSummary, BrainBlitzQuestion } from '@/types';
import { extractTextFromPdfBase64 } from '@/lib/utils/pdfServerExtractor';
import {
  generateGroundedExamQuiz,
  generateGroundedFlashcards,
  generateGroundedBrainBlitz,
  generateGroundedDocumentSummary,
} from '@/lib/ai/semanticExamEngine';

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface ReportedItem {
  id: string;
  timestamp: string;
  query: string;
  response: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
}

export const inMemoryReports: ReportedItem[] = [
  {
    id: 'rep-001',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    query: 'Can you write my final exam essay for me?',
    response: 'I cannot write your exam essays for you, but I can help you outline your arguments and review key concepts.',
    reason: 'Student attempted academic dishonesty prompt; AI refused appropriately.',
    status: 'reviewed',
  },
  {
    id: 'rep-002',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    query: 'Explain quantum entanglement simply',
    response: 'Quantum entanglement is a physical phenomenon occurring when pairs or groups of particles interact in ways such that the quantum state of each particle cannot be described independently.',
    reason: 'Student requested review of technical rigor.',
    status: 'pending',
  },
];

const ACADEMIC_SYSTEM_PROMPT = `You are a distinguished university professor and examination board author.
Your primary objective is academic precision, conceptual clarity, and rigorous pedagogical accuracy.
STRICT GUIDELINES:
1. Provide direct, factual, and logically structured explanations.
2. Absolutely avoid conversational filler, clichés, patronizing enthusiasm, marketing jargon, and speculative generalizations.
3. Include standard academic definitions, relevant mathematical or chemical equations, and concrete empirical examples where applicable.
4. If a question is ambiguous, clarify the fundamental principles and provide the accepted academic consensus.
5. Adapt to the requested depth level:
   - simple: Clear foundational language, intuitive physical models, and essential definitions without trivialization.
   - standard: Formal secondary/undergraduate textbook clarity with structured points and standard terminology.
   - detailed: Rigorous academic derivation, boundary conditions, governing equations, and examination nuances.`;

/**
 * Call Google Gemini API
 */
async function callGemini(contents: any[], systemInstruction?: string): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return null;

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

  try {
    const payload: any = {
      contents,
      generationConfig: {
        temperature: 0.2, // Lower temperature for academic precision and zero hallucination
        maxOutputTokens: 2500,
      },
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && typeof text === 'string') {
        return text.trim();
      }
    } else {
      console.warn('Gemini API call returned non-200 status:', res.status, await res.text());
    }
  } catch (err) {
    console.warn('Gemini API call failed:', err);
  }

  return null;
}

/**
 * Call OpenAI-compatible LLM endpoint (OpenAI, Groq, DeepSeek, etc.)
 */
async function callOpenAiCompatible(
  messages: Array<{ role: string; content: string }>,
  jsonMode: boolean = false
): Promise<string | null> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return null;

  const model = process.env.LLM_MODEL || 'gpt-4o-mini';
  const url = process.env.LLM_BASE_URL || 'https://api.openai.com/v1/chat/completions';

  try {
    const payload: any = {
      model,
      messages,
      temperature: 0.2,
      max_tokens: 2500,
    };
    if (jsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    }
  } catch (err) {
    console.warn('OpenAI compatible LLM fetch failed:', err);
  }
  return null;
}

/**
 * AI Concept Tutor & Q&A
 */
export async function getAiTutorResponse(
  message: string,
  level: ExplanationLevel = 'standard',
  history: ChatHistoryItem[] = []
): Promise<{ text: string; source: 'gemini' | 'llm' | 'fallback' }> {
  // 1. Try Gemini API
  if (process.env.GEMINI_API_KEY) {
    const geminiContents = [
      ...history.slice(-8).map((h) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      })),
      {
        role: 'user',
        parts: [{ text: `[Explanation Level: ${level.toUpperCase()}]\n\nQuestion: ${message}` }],
      },
    ];

    const geminiText = await callGemini(geminiContents, ACADEMIC_SYSTEM_PROMPT);
    if (geminiText) {
      return { text: geminiText, source: 'gemini' };
    }
  }

  // 2. Try alternative LLM (OpenAI compatible)
  if (process.env.LLM_API_KEY) {
    const messages = [
      { role: 'system', content: `${ACADEMIC_SYSTEM_PROMPT}\nTarget explanation depth: ${level}` },
      ...history.slice(-8).map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];
    const llmOutput = await callOpenAiCompatible(messages);
    if (llmOutput) {
      return { text: llmOutput.trim(), source: 'llm' };
    }
  }

  // 3. Educational Academic Fallback (Accurate, Direct, No Jargon)
  const text = generateAccurateAcademicResponse(message, level, history);
  return { text, source: 'fallback' };
}

/**
 * Concept Explanation Generator
 */
export async function getConceptExplanation(
  topic: string,
  level: ExplanationLevel = 'standard'
): Promise<{ explanation: string; keyPoints: string[]; analogies: string[]; source: 'gemini' | 'llm' | 'fallback' }> {
  const tutorRes = await getAiTutorResponse(`Provide a concise, academically accurate concept breakdown of: ${topic}`, level);
  const points = [
    `Formal Definition: Core scientific or mathematical principles governing ${topic}.`,
    `Mechanistic Operation: Step-by-step causal pathway and variable relationships.`,
    `Examination Criteria: Critical distinction points, unit conventions, and boundary assumptions.`,
  ];
  const analogies = [
    level === 'simple'
      ? `Physical intuition: Analogy with dynamic equilibrium in physical fluid or mechanical systems.`
      : `Empirical model: Corresponds to governed conservation laws across closed thermodynamic boundaries.`,
  ];

  return {
    explanation: tutorRes.text,
    keyPoints: points,
    analogies,
    source: tutorRes.source,
  };
}

/**
 * Helper to parse document summary JSON safely
 */
function parseSummaryJson(rawText: string, fileName: string, fallbackNotes: string): DocumentSummary | null {
  try {
    const clean = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);
    if (parsed.executiveSummary && Array.isArray(parsed.keyConcepts)) {
      return {
        title: parsed.title || fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        executiveSummary: parsed.executiveSummary,
        keyConcepts: parsed.keyConcepts,
        examTakeaways: Array.isArray(parsed.examTakeaways) ? parsed.examTakeaways : [],
        sourceNotes: fallbackNotes.slice(0, 3000),
        source: 'gemini',
      };
    }
  } catch (e) {
    console.warn('Failed to parse summary JSON:', e);
  }
  return null;
}

/**
 * AI Document & Notes Summarizer (Supports PDF base64 & Text)
 */
export async function summarizeDocument(params: {
  text?: string;
  pdfBase64?: string;
  fileName?: string;
}): Promise<DocumentSummary> {
  const { text = '', pdfBase64, fileName = 'Document' } = params;

  let effectiveText = text ? text.trim() : '';
  if (!effectiveText && pdfBase64) {
    try {
      const extracted = await extractTextFromPdfBase64(pdfBase64);
      if (extracted) effectiveText = extracted;
    } catch (e) {
      console.warn('PDF text extraction error in summarizeDocument:', e);
    }
  }

  const prompt = `Analyze this academic learning material (${fileName}) and provide a comprehensive, rigorous study summary.
Format your output strictly as valid JSON with this exact structure:
{
  "title": "Clear concise subject title",
  "executiveSummary": "A concise 2-3 paragraph academic synthesis of the foundational thesis, core mechanisms, and conclusions.",
  "keyConcepts": [
    { "term": "Technical Term 1", "definition": "Precise textbook definition with exact formula/mechanism" },
    { "term": "Technical Term 2", "definition": "Precise textbook definition with exact formula/mechanism" },
    { "term": "Technical Term 3", "definition": "Precise textbook definition with exact formula/mechanism" },
    { "term": "Technical Term 4", "definition": "Precise textbook definition with exact formula/mechanism" }
  ],
  "examTakeaways": [
    "High-yield takeaway 1: Specific formula or principle frequently examined",
    "High-yield takeaway 2: Key distinction or common pitfall to avoid",
    "High-yield takeaway 3: Empirical application or problem-solving method"
  ]
}`;

  // 1. Try Gemini
  if (process.env.GEMINI_API_KEY) {
    const parts: any[] = [{ text: prompt }];
    if (pdfBase64 && !effectiveText) {
      parts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64,
        },
      });
    } else if (effectiveText) {
      parts.push({ text: `Document content:\n"""\n${effectiveText.slice(0, 40000)}\n"""` });
    }

    const geminiRes = await callGemini([{ role: 'user', parts }], ACADEMIC_SYSTEM_PROMPT);
    if (geminiRes) {
      const parsed = parseSummaryJson(geminiRes, fileName, effectiveText);
      if (parsed) return parsed;
    }
  }

  // 2. Try alternative LLM
  if (process.env.LLM_API_KEY && effectiveText) {
    const messages = [
      { role: 'system', content: ACADEMIC_SYSTEM_PROMPT },
      { role: 'user', content: `${prompt}\n\nDocument content:\n"""\n${effectiveText.slice(0, 30000)}\n"""` },
    ];
    const llmRes = await callOpenAiCompatible(messages);
    if (llmRes) {
      const parsed = parseSummaryJson(llmRes, fileName, effectiveText);
      if (parsed) return parsed;
    }
  }

  // 3. Fallback Grounded Semantic Summarizer
  return generateGroundedDocumentSummary(effectiveText, fileName);
}

/**
 * Helper to parse quiz questions JSON safely
 */
function parseQuizJson(rawText: string, count: number): QuizQuestion[] | null {
  try {
    const clean = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const list = JSON.parse(clean);
    const parsedList = Array.isArray(list) ? list : list.questions || list.quiz || list.items;
    if (Array.isArray(parsedList) && parsedList.length > 0) {
      return parsedList.slice(0, count).map((q: any, i: number) => ({
        id: q.id || `q-${i + 1}-${Date.now()}`,
        question: String(q.question || q.prompt),
        options: [
          String(q.options?.[0] || 'Option A'),
          String(q.options?.[1] || 'Option B'),
          String(q.options?.[2] || 'Option C'),
          String(q.options?.[3] || 'Option D'),
        ] as [string, string, string, string],
        correctAnswer:
          typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < 4
            ? q.correctAnswer
            : typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4
            ? q.correctIndex
            : 0,
        explanation: String(q.explanation || 'Accurate answer derived from curriculum material.'),
      }));
    }
  } catch (e) {
    console.warn('Failed to parse quiz JSON:', e);
  }
  return null;
}

/**
 * Quiz Generator
 */
export async function generateQuizQuestions(
  topic: string,
  notes: string = '',
  questionCount: number = 5,
  difficulty: DifficultyLevel = 'medium',
  fileData?: { base64: string; mimeType: string; fileName?: string }
): Promise<QuizQuestion[]> {
  const count = Math.max(1, Math.min(questionCount, 15));

  // Extract text from attached PDF if provided
  let effectiveNotes = notes ? notes.trim() : '';
  if (fileData?.base64 && (fileData.mimeType === 'application/pdf' || fileData.fileName?.toLowerCase().endsWith('.pdf'))) {
    try {
      const extracted = await extractTextFromPdfBase64(fileData.base64);
      if (extracted) {
        effectiveNotes = effectiveNotes ? `${effectiveNotes}\n\n${extracted}` : extracted;
      }
    } catch (err) {
      console.warn('PDF extraction failed in generateQuizQuestions:', err);
    }
  }

  const prompt = `You are a university professor and senior examination author.
Generate exactly ${count} rigorous, authentic examination questions based strictly on the provided study material on "${topic}" (difficulty: "${difficulty}").

STRICT EXAMINATION REQUIREMENTS:
1. Academic Grounding: Every question stem must test a concrete definition, key formula, causal mechanism, specific stage, or critical distinction from the text.
2. NO GENERIC JARGON: Strictly avoid abstract fillers (e.g. "What is the precise scientific definition...", "Which variable limits equilibrium..."). Ask actual, direct, syllabus-grounded questions.
3. Plausible Distractors: All 4 options must be distinct, plausible academic answers (terms, definitions, or mechanisms from the same subject area).
4. Explanations: The explanation must cite the specific reason or source fact confirming why the correct answer is valid.

${effectiveNotes ? `Study Material / Notes:\n"""\n${effectiveNotes.slice(0, 30000)}\n"""\n` : ''}

Return ONLY valid JSON matching this schema:
[
  {
    "id": "q1",
    "question": "Direct academic question stem?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Detailed rationale quoting or referencing the material."
  }
]`;

  // 1. Try Gemini
  if (process.env.GEMINI_API_KEY) {
    const parts: any[] = [{ text: prompt }];
    if (fileData?.base64 && fileData?.mimeType && !effectiveNotes) {
      parts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.base64,
        },
      });
    }

    const resText = await callGemini([{ role: 'user', parts }], ACADEMIC_SYSTEM_PROMPT);
    if (resText) {
      const parsed = parseQuizJson(resText, count);
      if (parsed) return parsed;
    }
  }

  // 2. Try alternative LLM
  if (process.env.LLM_API_KEY) {
    const messages = [
      { role: 'system', content: ACADEMIC_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ];
    const llmRes = await callOpenAiCompatible(messages);
    if (llmRes) {
      const parsed = parseQuizJson(llmRes, count);
      if (parsed) return parsed;
    }
  }

  // 3. Grounded University Exam Engine (Zero template jargon, genuine questions from their material)
  return generateGroundedExamQuiz(topic, effectiveNotes, count, difficulty);
}

/**
 * Helper to parse flashcards JSON safely
 */
function parseFlashcardsJson(rawText: string, safeCount: number, topic: string): Flashcard[] | null {
  try {
    const clean = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);
    const list = Array.isArray(parsed) ? parsed : parsed.flashcards || parsed.cards;
    if (Array.isArray(list) && list.length > 0) {
      return list.slice(0, safeCount).map((item: any, i: number) => ({
        id: `fc-${Date.now()}-${i}`,
        front: String(item.front || `Concept ${i + 1}`),
        back: String(item.back || `Definition for ${topic}`),
        position: i,
        known: false,
      }));
    }
  } catch (e) {
    console.warn('Failed to parse flashcards JSON:', e);
  }
  return null;
}

/**
 * Flashcard Generator
 */
export async function generateFlashcards(
  topic: string,
  notes: string = '',
  count: number = 6,
  fileData?: { base64: string; mimeType: string; fileName?: string }
): Promise<Flashcard[]> {
  const safeCount = Math.max(1, Math.min(count, 15));

  let effectiveNotes = notes ? notes.trim() : '';
  if (fileData?.base64 && (fileData.mimeType === 'application/pdf' || fileData.fileName?.toLowerCase().endsWith('.pdf'))) {
    try {
      const extracted = await extractTextFromPdfBase64(fileData.base64);
      if (extracted) {
        effectiveNotes = effectiveNotes ? `${effectiveNotes}\n\n${extracted}` : extracted;
      }
    } catch (err) {
      console.warn('PDF extraction failed in generateFlashcards:', err);
    }
  }

  const prompt = `Generate exactly ${safeCount} concise, high-yield academic flashcards from "${topic}".
${effectiveNotes ? `Based strictly on this course material/notes:\n"""\n${effectiveNotes.slice(0, 25000)}\n"""\n` : ''}
Synthesize key terms and textbook definitions directly from the document. Provide accurate definitions, exact equations, and zero jargon.
Return ONLY valid JSON array:
[
  {
    "front": "Technical term, cue question, or governing law",
    "back": "Precise textbook definition, equation, or causal outcome"
  }
]`;

  // 1. Try Gemini
  if (process.env.GEMINI_API_KEY) {
    const parts: any[] = [{ text: prompt }];
    if (fileData?.base64 && fileData?.mimeType && !effectiveNotes) {
      parts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.base64,
        },
      });
    }

    const resText = await callGemini([{ role: 'user', parts }], ACADEMIC_SYSTEM_PROMPT);
    if (resText) {
      const parsed = parseFlashcardsJson(resText, safeCount, topic);
      if (parsed) return parsed;
    }
  }

  // 2. Try alternative LLM
  if (process.env.LLM_API_KEY) {
    const messages = [
      { role: 'system', content: ACADEMIC_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ];
    const llmRes = await callOpenAiCompatible(messages);
    if (llmRes) {
      const parsed = parseFlashcardsJson(llmRes, safeCount, topic);
      if (parsed) return parsed;
    }
  }

  // 3. Grounded Flashcards from document facts
  return generateGroundedFlashcards(topic, effectiveNotes, safeCount);
}

/**
 * Helper to parse Brain Blitz questions JSON safely
 */
function parseBrainBlitzJson(rawText: string, safeCount: number, topicPrompt: string): BrainBlitzQuestion[] | null {
  try {
    const clean = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const list = JSON.parse(clean);
    const parsedList = Array.isArray(list) ? list : list.questions || list.quiz || list.items;
    if (Array.isArray(parsedList) && parsedList.length > 0) {
      return parsedList.slice(0, safeCount).map((q: any, i: number) => ({
        id: q.id || `bb-custom-${i + 1}-${Date.now()}`,
        prompt: String(q.prompt || q.question),
        options: [
          String(q.options?.[0] || 'Option A'),
          String(q.options?.[1] || 'Option B'),
          String(q.options?.[2] || 'Option C'),
          String(q.options?.[3] || 'Option D'),
        ] as [string, string, string, string],
        correctIndex:
          typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4
            ? q.correctIndex
            : typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < 4
            ? q.correctAnswer
            : 0,
        category: String(q.category || topicPrompt.slice(0, 20) || 'Revision'),
      }));
    }
  } catch (e) {
    console.warn('Failed to parse Brain Blitz JSON:', e);
  }
  return null;
}

/**
 * Brain Blitz Rapid Recall Question Generator
 */
export async function generateBrainBlitzQuestions(
  topic: string = '',
  notes: string = '',
  count: number = 15,
  fileData?: { base64: string; mimeType: string; fileName?: string }
): Promise<BrainBlitzQuestion[]> {
  const safeCount = Math.max(5, Math.min(count, 30));
  const topicPrompt = topic.trim() || fileData?.fileName?.replace(/\.[^/.]+$/, '') || 'Study Material Recall';

  let effectiveNotes = notes ? notes.trim() : '';
  if (fileData?.base64 && (fileData.mimeType === 'application/pdf' || fileData.fileName?.toLowerCase().endsWith('.pdf'))) {
    try {
      const extracted = await extractTextFromPdfBase64(fileData.base64);
      if (extracted) {
        effectiveNotes = effectiveNotes ? `${effectiveNotes}\n\n${extracted}` : extracted;
      }
    } catch (err) {
      console.warn('PDF extraction failed in generateBrainBlitzQuestions:', err);
    }
  }

  const prompt = `Generate exactly ${safeCount} rapid-recall multiple-choice examination questions suitable for a 60-second fast active recall challenge based on "${topicPrompt}".
${effectiveNotes ? `Focus strictly on this course material/notes:\n"""\n${effectiveNotes.slice(0, 25000)}\n"""\n` : ''}
Questions must be punchy, factually rigorous, testing real terms, mechanisms, equations, and facts with NO filler or conversational jargon.
Each question must have exactly 4 plausible options with one unambiguously correct answer (indexed 0-3).

Return ONLY a valid JSON array matching this schema:
[
  {
    "id": "bb-1",
    "prompt": "Punchy rapid-recall question stem?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "category": "${topicPrompt.slice(0, 20)}"
  }
]`;

  // 1. Try Gemini
  if (process.env.GEMINI_API_KEY) {
    const parts: any[] = [{ text: prompt }];
    if (fileData?.base64 && fileData?.mimeType && !effectiveNotes) {
      parts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.base64,
        },
      });
    }

    const resText = await callGemini([{ role: 'user', parts }], ACADEMIC_SYSTEM_PROMPT);
    if (resText) {
      const parsed = parseBrainBlitzJson(resText, safeCount, topicPrompt);
      if (parsed) return parsed;
    }
  }

  // 2. Try alternative LLM
  if (process.env.LLM_API_KEY) {
    const messages = [
      { role: 'system', content: ACADEMIC_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ];
    const llmRes = await callOpenAiCompatible(messages);
    if (llmRes) {
      const parsed = parseBrainBlitzJson(llmRes, safeCount, topicPrompt);
      if (parsed) return parsed;
    }
  }

  // 3. Grounded Brain Blitz from document facts
  return generateGroundedBrainBlitz(topicPrompt, effectiveNotes, safeCount);
}

// --------------------------------------------------------------------------
// Concept Tutor Academic Fallback Engines (Accurate, Direct, Rigorous)
// --------------------------------------------------------------------------

function generateAccurateAcademicResponse(
  message: string,
  level: ExplanationLevel,
  history: ChatHistoryItem[]
): string {
  const q = message.toLowerCase().trim();

  if (q.includes('photosynthesis')) {
    if (level === 'simple') {
      return `### Photosynthesis: Essential Principles

**Definition:** The biochemical process by which green plants and autotrophic organisms synthesize glucose from carbon dioxide and water using light energy absorbed by chlorophyll pigments.

**Overall Equation:**
$$6\\text{CO}_2 + 6\\text{H}_2\\text{O} + \\text{Photons} \\longrightarrow \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$$

**Two Core Steps:**
1. **Light Reactions (Thylakoid Membranes):** Solar photons split water ($H_2O$) into protons, electrons, and $O_2$ byproduct, generating chemical energy carriers (ATP and NADPH).
2. **Calvin Cycle (Stroma):** The plant uses ATP and NADPH to fix atmospheric carbon dioxide into 3-carbon sugar precursors that form glucose.

**Exam Rule:** Limiting factors include light intensity, carbon dioxide concentration, and ambient temperature (which governs enzyme kinetics).`;
    }

    if (level === 'detailed') {
      return `### Photosynthesis: Mechanistic Biophysical Analysis

**Location:** Chloroplasts of mesophyll tissue cells.

#### 1. Light-Dependent Phase (Thylakoids)
- **Photosystem II (P680):** Absorption of 680 nm photons drives charge separation. Photolysis of water ($2H_2O \\to O_2 + 4H^+ + 4e^-$) supplies replacement electrons.
- **Electron Transport Chain (ETC):** Electrons traverse Plastoquinone, Cytochrome $b_6f$ complex, and Plastocyanin, establishing a trans-thylakoid proton gradient (chemiosmotic coupling across ATP Synthase).
- **Photosystem I (P700):** Photo-excitation reduces Ferredoxin-NADP+ reductase to produce NADPH.

#### 2. Light-Independent Phase / Calvin Cycle (Stroma)
- **Carboxylation:** Ribulose-1,5-bisphosphate carboxylase-oxygenase (RuBisCO) catalyzes fixation of $CO_2$ to RuBP (5C), producing unstable 6C intermediates cleaved into two 3-phosphoglycerate (3-PGA) molecules.
- **Reduction:** Phosphorylation via ATP and reduction via NADPH converts 3-PGA to glyceraldehyde-3-phosphate (G3P).
- **Regeneration:** Five G3P molecules are rearranged using 3 ATP to regenerate three RuBP acceptors, allowing sustained cycling. Net yield: one net triose phosphate per 3 turns.`;
    }

    return `### Photosynthesis: Standard Examination Breakdown

**Biological Role:** Converts electromagnetic radiation into stable chemical potential energy stored in covalent bonds of carbohydrates.

- **Governing Reaction:**
  $$6\\text{CO}_2 + 6\\text{H}_2\\text{O} \\xrightarrow{\\text{Light, Chlorophyll}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$$

- **Phase Comparison:**
  - **Light-Dependent Phase:** Occurs on the thylakoid membrane. Uses water and light; yields ATP, NADPH, and oxygen gas.
  - **Light-Independent Phase (Calvin Cycle):** Occurs in the stroma. Consumes ATP, NADPH, and $CO_2$; yields hexose sugars.

- **Critical Examination Notes:**
  - RuBisCO is the rate-limiting enzyme in carbon fixation.
  - At elevated temperatures and low $CO_2$, RuBisCO binds $O_2$ instead of $CO_2$, initiating wasteful photorespiration.`;
  }

  if (q.includes('respiration') || q.includes('glycolysis') || q.includes('krebs') || q.includes('atp')) {
    return `### Cellular Respiration: Comprehensive Biochemical Breakdown

**Overall Stoichiometric Equation:**
$$\\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2 \\longrightarrow 6\\text{CO}_2 + 6\\text{H}_2\\text{O} + 30\\text{-}32\\text{ ATP}$$

#### The Four Sequential Metabolic Stages:
1. **Glycolysis (Cytosol, Anaerobic):**
   - Enzymatic cleavage of 1 glucose (6C) into 2 pyruvate (3C) molecules.
   - Net yield: **2 ATP** (via substrate-level phosphorylation) and **2 NADH**.
   - Rate-limiting enzyme: Phosphofructokinase-1 (PFK-1), allosterically inhibited by ATP and citrate.

2. **Link Reaction / Pyruvate Decarboxylation (Mitochondrial Matrix):**
   - Pyruvate dehydrogenase converts 2 pyruvate into 2 Acetyl-CoA (2C), releasing $2\\text{ CO}_2$ and yielding **2 NADH**.

3. **Krebs Cycle / Citric Acid Cycle (Mitochondrial Matrix):**
   - Acetyl-CoA condenses with oxaloacetate (4C) to form citrate (6C).
   - Per glucose molecule (2 turns): Yields **2 ATP/GTP**, **6 NADH**, **2 FADH2**, and releases $4\\text{ CO}_2$.

4. **Oxidative Phosphorylation & Chemiosmosis (Inner Mitochondrial Membrane):**
   - Electrons from 10 NADH and 2 FADH2 pass through Complexes I–IV of the Electron Transport Chain (ETC).
   - Protons ($H^+$) are pumped into the intermembrane space, generating a steep proton motive force.
   - Protons return down their electrochemical gradient through **ATP Synthase**, producing approximately **26–28 ATP**. Final electron acceptor: $O_2$ reduced to $H_2O$.`;
  }

  if (q.includes('newton') || q.includes('force') || q.includes('momentum')) {
    return `### Newton's Three Laws of Classical Dynamics

1. **First Law (Principle of Inertia):**
   A body remains at rest or in uniform velocity in an inertial reference frame unless acted upon by a resultant non-zero external force:
   $$\\sum \\vec{F} = 0 \\iff \\frac{d\\vec{v}}{dt} = 0$$

2. **Second Law (Fundamental Equation of Dynamics):**
   The net applied force equals the time rate of change of linear momentum:
   $$\\vec{F}_{\\text{net}} = \\frac{d\\vec{p}}{dt} = m\\vec{a} \\quad (\\text{for constant mass } m)$$

3. **Third Law (Action and Reaction):**
   When body A exerts a force on body B, body B simultaneously exerts a force of equal magnitude and opposite direction on body A:
   $$\\vec{F}_{A \\to B} = -\\vec{F}_{B \\to A}$$
   *Crucial distinction:* These paired forces act on **two distinct bodies**, meaning they never cancel out when analyzing a single free-body diagram.`;
  }

  if (q.includes('calculus') || q.includes('derivative') || q.includes('integral')) {
    return `### Differential & Integral Calculus Fundamentals

- **The Derivative:** Measures instantaneous rate of change via limit:
  $$f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$
  - **Power Rule:** $\\frac{d}{dx}[x^n] = n x^{n-1}$
  - **Product Rule:** $(uv)' = u'v + uv'$
  - **Chain Rule:** $\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)$

- **Fundamental Theorem of Calculus (FTC):**
  Connects differentiation and integration as inverse operations:
  $$\\int_a^b f(x) dx = F(b) - F(a) \\quad \\text{where } F'(x) = f(x)$$`;
  }

  // General academic response
  return `### Academic Analysis: ${message.slice(0, 100)}

**1. Theoretical Formulation:**
In formal curriculum standards, this concept is defined through empirical observation and mathematical or mechanistic constraints. Focus on isolating independent vs. dependent variables.

**2. Key Governing Mechanics:**
- **Boundary Assumptions:** Identify the initial state and reference frame before applying standard formulas.
- **Causal Progression:** Step-by-step transition from cause to observed equilibrium.
- **Mathematical Form:** Express relationships using proportionalities (direct vs. inverse).

**3. Common Examination Pitfalls:**
- Conflating correlation with direct linear causality.
- Failing to verify consistent SI base units across calculations.
- Overlooking conservation laws (mass, energy, charge, or momentum).`;
}
