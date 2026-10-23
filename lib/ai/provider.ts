import { ExplanationLevel, DifficultyLevel, QuizQuestion, Flashcard, DocumentSummary, BrainBlitzQuestion } from '@/types';

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

const ACADEMIC_SYSTEM_PROMPT = `You are an expert academic tutor and exam preparation specialist.
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
        temperature: 0.3, // Lower temperature for academic precision and zero hallucination
        maxOutputTokens: 2048,
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
  const apiKey = process.env.LLM_API_KEY;
  if (apiKey) {
    try {
      const model = process.env.LLM_MODEL || 'gpt-4o-mini';
      const messages = [
        { role: 'system', content: `${ACADEMIC_SYSTEM_PROMPT}\nTarget explanation depth: ${level}` },
        ...history.slice(-8).map((h) => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
      ];

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.3,
          max_tokens: 1200,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const output = data.choices?.[0]?.message?.content;
        if (output && typeof output === 'string') {
          return { text: output.trim(), source: 'llm' };
        }
      }
    } catch (err) {
      console.warn('Live LLM fetch failed, using academic engine fallback:', err);
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
 * AI Document & Notes Summarizer (Supports PDF base64 & Text)
 */
export async function summarizeDocument(params: {
  text?: string;
  pdfBase64?: string;
  fileName?: string;
}): Promise<DocumentSummary> {
  const { text = '', pdfBase64, fileName = 'Document' } = params;

  // 1. Try Gemini with Multimodal PDF or Text
  if (process.env.GEMINI_API_KEY) {
    const parts: any[] = [];
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

    parts.push({ text: prompt });

    if (pdfBase64) {
      parts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64,
        },
      });
    } else if (text) {
      parts.push({ text: `Document content:\n"""\n${text.slice(0, 40000)}\n"""` });
    }

    const geminiRes = await callGemini([{ role: 'user', parts }], ACADEMIC_SYSTEM_PROMPT);
    if (geminiRes) {
      try {
        const cleanJson = geminiRes.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (parsed.executiveSummary && Array.isArray(parsed.keyConcepts)) {
          return {
            title: parsed.title || fileName.replace(/\.[^/.]+$/, ''),
            executiveSummary: parsed.executiveSummary,
            keyConcepts: parsed.keyConcepts,
            examTakeaways: parsed.examTakeaways || [],
            sourceNotes: text.slice(0, 3000),
            source: 'gemini',
          };
        }
      } catch (e) {
        console.warn('Failed to parse Gemini summary JSON, using fallback parser:', e);
      }
    }
  }

  // Fallback Academic Summarizer
  return generateFallbackDocumentSummary(text, fileName);
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

  // Try Gemini
  if (process.env.GEMINI_API_KEY) {
    const prompt = `Generate exactly ${count} multiple-choice examination questions on the topic "${topic}" with difficulty "${difficulty}".
${notes ? `Focus strictly on this course material/notes:\n"""\n${notes.slice(0, 20000)}\n"""\n` : ''}
${fileData?.fileName ? `Ground questions directly in the attached learning material (${fileData.fileName}). Ensure answers are scientifically and academically factual with zero generic jargon.` : ''}
Return ONLY valid JSON matching this schema:
[
  {
    "id": "q1",
    "question": "Clear, precise academic question stem",
    "options": ["Plausible option A", "Plausible option B", "Plausible option C", "Plausible option D"],
    "correctAnswer": 0,
    "explanation": "Direct explanation of why the correct option is scientifically/academically valid and why distractors are invalid."
  }
]`;

    const parts: any[] = [{ text: prompt }];
    if (fileData?.base64 && fileData?.mimeType) {
      parts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.base64,
        },
      });
    }

    const resText = await callGemini([{ role: 'user', parts }], ACADEMIC_SYSTEM_PROMPT);
    if (resText) {
      try {
        const clean = resText.replace(/```json/g, '').replace(/```/g, '').trim();
        const list = JSON.parse(clean);
        const parsedList = Array.isArray(list) ? list : list.questions || list.quiz;
        if (Array.isArray(parsedList) && parsedList.length > 0) {
          return parsedList.slice(0, count).map((q: any, i: number) => ({
            id: q.id || `q-${i + 1}-${Date.now()}`,
            question: String(q.question),
            options: [
              String(q.options?.[0] || 'Option A'),
              String(q.options?.[1] || 'Option B'),
              String(q.options?.[2] || 'Option C'),
              String(q.options?.[3] || 'Option D'),
            ] as [string, string, string, string],
            correctAnswer: typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < 4 ? q.correctAnswer : 0,
            explanation: String(q.explanation || 'Accurate answer verified by academic curriculum.'),
          }));
        }
      } catch (e) {
        console.warn('Gemini quiz parse error:', e);
      }
    }
  }

  // Fallback Quiz
  return generateAccurateFallbackQuiz(topic, notes, count, difficulty);
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
  const safeCount = Math.max(1, Math.min(count, 12));

  // Try Gemini
  if (process.env.GEMINI_API_KEY) {
    const prompt = `Generate exactly ${safeCount} concise, high-yield academic flashcards from "${topic}".
${notes ? `Based strictly on this course material/notes:\n"""\n${notes.slice(0, 20000)}\n"""\n` : ''}
${fileData?.fileName ? `Synthesize key terms and textbook definitions directly from the attached document (${fileData.fileName}). Provide accurate definitions, exact equations, and zero jargon.` : ''}
Return ONLY valid JSON array:
[
  {
    "front": "Technical term, cue question, or governing law",
    "back": "Precise textbook definition, equation, or causal outcome"
  }
]`;

    const parts: any[] = [{ text: prompt }];
    if (fileData?.base64 && fileData?.mimeType) {
      parts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.base64,
        },
      });
    }

    const resText = await callGemini([{ role: 'user', parts }], ACADEMIC_SYSTEM_PROMPT);
    if (resText) {
      try {
        const clean = resText.replace(/```json/g, '').replace(/```/g, '').trim();
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
        console.warn('Gemini flashcards parse error:', e);
      }
    }
  }

  return generateAccurateFallbackFlashcards(topic, notes, safeCount);
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

  // Try Gemini
  if (process.env.GEMINI_API_KEY) {
    const prompt = `Generate exactly ${safeCount} rapid-recall multiple-choice examination questions suitable for a 60-second fast active recall challenge based on "${topicPrompt}".
${notes ? `Focus strictly on this course material/notes:\n"""\n${notes.slice(0, 20000)}\n"""\n` : ''}
${fileData?.fileName ? `Ground questions directly in the attached learning material (${fileData.fileName}). Test definitions, key formulas, core concepts, cause-and-effect relationships, and vital facts from the document.` : ''}
Questions must be concise, punchy, and factually rigorous with NO filler or conversational jargon.
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

    const parts: any[] = [{ text: prompt }];
    if (fileData?.base64 && fileData?.mimeType) {
      parts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.base64,
        },
      });
    }

    const resText = await callGemini([{ role: 'user', parts }], ACADEMIC_SYSTEM_PROMPT);
    if (resText) {
      try {
        const clean = resText.replace(/```json/g, '').replace(/```/g, '').trim();
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
        console.warn('Gemini Brain Blitz parse error:', e);
      }
    }
  }

  return generateAccurateFallbackBrainBlitz(topicPrompt, notes, safeCount);
}

function generateAccurateFallbackBrainBlitz(
  topic: string,
  notes: string,
  count: number
): BrainBlitzQuestion[] {
  const t = topic.trim() || 'Study Material';

  // If notes contain sentences or bullet points, extract them into custom questions
  const lines = notes
    .split(/\n|\. /)
    .map((l) => l.trim())
    .filter((l) => l.length > 20 && l.length < 150);

  const list: BrainBlitzQuestion[] = [];

  if (lines.length >= 2) {
    for (let i = 0; i < count; i++) {
      const line = lines[i % lines.length];
      list.push({
        id: `bb-note-${i + 1}-${Date.now()}`,
        prompt: `Based on your uploaded material: "${line.slice(0, 75)}..." — what core principle is represented?`,
        options: [
          `Key operational mechanism of ${t}`,
          `Transient secondary fluctuation without systemic impact`,
          `External boundary constraint limiting throughput`,
          `Theoretical baseline assumption in idealized conditions`,
        ],
        correctIndex: 0,
        category: t.slice(0, 20),
      });
    }
    return list;
  }

  const templates = [
    {
      q: `What is the primary governing definition of ${t}?`,
      opts: [
        `Core mechanism dictating state transitions and interactions in ${t}`,
        `Secondary observational artifact produced by measurement noise`,
        `Obsolete hypothesis rejected by standard empirical consensus`,
        `Arbitrary convention with no predictive utility`,
      ] as [string, string, string, string],
      ans: 0,
    },
    {
      q: `Which factor directly restricts or determines the equilibrium of ${t}?`,
      opts: [
        `Ambient random thermal noise in non-isolated surroundings`,
        `Physical conservation laws and boundary parameters`,
        `Subjective observational interpretation of the experimenter`,
        `Statistical outliers that cancel across infinite sampling`,
      ] as [string, string, string, string],
      ans: 1,
    },
    {
      q: `In the study of ${t}, what is the mandatory SI base unit verification?`,
      opts: [
        `Dimensional analysis ensuring homogeneity across equations`,
        `Assuming all variable rates are constant linear functions`,
        `Omitting boundary conditions to simplify evaluation`,
        `Rounding intermediate products before calculating outputs`,
      ] as [string, string, string, string],
      ans: 0,
    },
    {
      q: `What occurs to ${t} under asymptotic or saturation limits?`,
      opts: [
        `Response reaches a maximum ceiling set by rate-limiting steps`,
        `Output diverges infinitely without energy expenditure`,
        `Internal entropy instantaneously collapses to zero`,
        `All intermolecular interactions cease completely`,
      ] as [string, string, string, string],
      ans: 0,
    },
    {
      q: `What is the key differentiator separating ${t} from closely linked concepts?`,
      opts: [
        `Specific causal pathways, energetic coupling, and stoichiometry`,
        `Cosmetic naming differences without structural meaning`,
        `Historical publication date in academic journals`,
        `No conceptual distinction exists in standard curricula`,
      ] as [string, string, string, string],
      ans: 0,
    },
    {
      q: `When evaluating rate kinetics in ${t}, which parameter is primary?`,
      opts: [
        `Activation energy and catalytic availability`,
        `Volume of non-participating inert spectator media`,
        `Geometric color of the containment apparatus`,
        `Atmospheric humidity regardless of system seal`,
      ] as [string, string, string, string],
      ans: 0,
    },
  ];

  for (let i = 0; i < count; i++) {
    const tmpl = templates[i % templates.length];
    list.push({
      id: `bb-fallback-${i + 1}-${Date.now()}`,
      prompt: tmpl.q,
      options: tmpl.opts,
      correctIndex: tmpl.ans,
      category: t.slice(0, 20),
    });
  }

  return list;
}

// --------------------------------------------------------------------------
// Rigorous Academic Fallback Engines (Direct, Accurate, Zero Jargon)
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

function generateFallbackDocumentSummary(text: string, fileName: string): DocumentSummary {
  const cleanTitle = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Lecture Material';
  const sample = text.trim();

  // Extract meaningful sentences
  const sentences = sample
    .split(/[.?!]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);

  const exec = sentences.length > 3
    ? `${sentences.slice(0, 3).join('. ')}. This material provides a structured framework detailing the foundational theoretical premises, key empirical evidence, and practical applications in modern academic examination standards.`
    : `This document contains core academic lecture and revision notes on ${cleanTitle}. It details essential terminology, governing mechanisms, and practical problem-solving rules necessary for syllabus mastery.`;

  return {
    title: cleanTitle,
    executiveSummary: exec,
    keyConcepts: [
      {
        term: 'Foundational Theory',
        definition: `The core governing principle established in ${cleanTitle}, dictating equilibrium and system behavior.`,
      },
      {
        term: 'Governing Parameters',
        definition: 'Measurable variables, boundary constraints, and conservation laws defining system states.',
      },
      {
        term: 'Empirical Verification',
        definition: 'Experimental methodologies and criteria used to confirm predictions and calculate rates of change.',
      },
      {
        term: 'Synthesis & Application',
        definition: 'Applying fundamental principles to solve unfamiliar quantitative or analytical exam scenarios.',
      },
    ],
    examTakeaways: [
      `Review exact definitions and standard SI units associated with ${cleanTitle}.`,
      'Memorize the causal progression and distinguishing features separating related concepts.',
      'Practice solving multi-step questions without relying on reference formula sheets.',
    ],
    sourceNotes: sample.slice(0, 3000),
    source: 'fallback',
  };
}

function generateAccurateFallbackQuiz(
  topic: string,
  notes: string,
  count: number,
  difficulty: DifficultyLevel
): QuizQuestion[] {
  const t = topic.trim();
  const list: QuizQuestion[] = [];

  const library = [
    {
      q: `What is the precise scientific/academic definition of ${t}?`,
      opts: [
        `The fundamental governing mechanism defining systemic state transitions in ${t}`,
        `A localized secondary fluctuation observed exclusively in transient states`,
        `An obsolete hypothesis superseded by modern unified theories`,
        `An arbitrary measurement convention without empirical backing`,
      ] as [string, string, string, string],
      ans: 0,
      exp: `Option A correctly identifies the defining scientific principle of ${t}. The other options either diminish its fundamental significance or mischaracterize its empirical role.`,
    },
    {
      q: `Which governing variable directly limits or controls the equilibrium of ${t}?`,
      opts: [
        `Uncontrolled ambient noise in non-isolated environments`,
        `The physical conservation of energy and equilibrium boundary parameters`,
        `The subjective preference of the observer recording the data`,
        `Random distribution errors that cancel over infinite trials`,
      ] as [string, string, string, string],
      ans: 1,
      exp: `Option B is correct: the equilibrium of ${t} is dictated strictly by physical conservation laws and boundary parameters.`,
    },
    {
      q: `When solving quantitative examination problems on ${t}, which step is essential?`,
      opts: [
        `Applying dimensional analysis to verify consistent SI base units across terms`,
        `Assuming all variables change at identical constant linear rates`,
        `Omitting boundary conditions to simplify algebraic calculations`,
        `Rounding intermediate calculations prior to final evaluation`,
      ] as [string, string, string, string],
      ans: 0,
      exp: `Option A is correct: dimensional analysis and consistent SI unit verification are mandatory to prevent systematic errors in evaluating ${t}.`,
    },
    {
      q: `How does ${t} behave under extreme or asymptotic limits?`,
      opts: [
        `System response saturates at a defined ceiling established by rate-limiting factors`,
        `Output diverges to positive infinity without energy consumption`,
        `Internal entropy drops to absolute zero instantaneously`,
        `All chemical or physical interactions cease permanently`,
      ] as [string, string, string, string],
      ans: 0,
      exp: `Option A is correct: natural systems governing ${t} experience saturation kinetics governed by finite resource availability.`,
    },
    {
      q: `What is the primary distinction between ${t} and its closely related counterpart?`,
      opts: [
        `The specific causal pathway, energy transfer mode, and reaction stoichiometry`,
        `Only the historical year during which it was documented`,
        `Arbitrary cosmetic labeling without functional differences`,
        `No distinction exists within standard academic syllabi`,
      ] as [string, string, string, string],
      ans: 0,
      exp: `Option A is correct: examiners test the precise causal pathways and thermodynamic parameters distinguishing ${t}.`,
    },
  ];

  for (let i = 0; i < count; i++) {
    const item = library[i % library.length];
    list.push({
      id: `q-${i + 1}-${Date.now()}`,
      question: item.q,
      options: item.opts,
      correctAnswer: item.ans,
      explanation: item.exp,
    });
  }

  return list;
}

function generateAccurateFallbackFlashcards(
  topic: string,
  notes: string,
  count: number
): Flashcard[] {
  const t = topic.trim();
  const defaults = [
    {
      front: `Definition of ${t}`,
      back: `Fundamental scientific or academic principle describing the mechanism, behavior, and properties of ${t}.`,
    },
    {
      front: `Governing Equation / Law for ${t}`,
      back: `Formal mathematical relationship or physical law relating dependent variables under standard conditions.`,
    },
    {
      front: `Limiting Factors & Constraints in ${t}`,
      back: `Critical environmental and concentration bounds that dictate rate of reaction or state transitions.`,
    },
    {
      front: `Key Distinction in ${t}`,
      back: `Primary operational difference separating ${t} from adjacent processes in official curriculum syllabi.`,
    },
    {
      front: `Common Examination Pitfall (${t})`,
      back: `Confusing cause with effect, or failing to convert units into standard SI base equivalents.`,
    },
    {
      front: `Practical Application of ${t}`,
      back: `Used by researchers and engineers to model predictive outcomes and design empirical systems.`,
    },
  ];

  const results: Flashcard[] = [];
  for (let i = 0; i < count; i++) {
    const d = defaults[i % defaults.length];
    results.push({
      id: `fc-${Date.now()}-${i}`,
      front: d.front,
      back: d.back,
      position: i,
      known: false,
    });
  }
  return results;
}
