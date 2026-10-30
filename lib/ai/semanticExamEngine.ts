import { DifficultyLevel, QuizQuestion, Flashcard, BrainBlitzQuestion, DocumentSummary } from '@/types';

export interface ExtractedFact {
  term: string;
  definition: string;
  category?: string;
  contextSentence: string;
  type: 'definition' | 'function' | 'mechanism' | 'distinction' | 'location';
}

/**
 * Cleans and tokenizes text into distinct sentences and structured paragraphs.
 */
function extractSentences(text: string): string[] {
  if (!text) return [];
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[•*–—]\s*/g, '\n')
    .split(/\n+|(?<=[.?!])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25 && s.length <= 400 && !/^(page\s+\d+|chapter\s+\d+|table\s+of\s+contents|slide\s+\d+)/i.test(s));
}

/**
 * Deep semantic extractor: identifies definitions, functions, mechanisms,
 * and key concepts directly from uploaded notes or course materials.
 */
export function extractDocumentFacts(text: string): ExtractedFact[] {
  const sentences = extractSentences(text);
  const facts: ExtractedFact[] = [];
  const seenTerms = new Set<string>();

  const cleanTermName = (raw: string): string => {
    return raw
      .replace(/^(the|a|an)\s+/i, '')
      .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9)]+$/g, '')
      .trim();
  };

  const addFact = (fact: ExtractedFact) => {
    const cleanTerm = cleanTermName(fact.term);
    if (cleanTerm.length < 3 || cleanTerm.length > 55) return;
    if (seenTerms.has(cleanTerm.toLowerCase())) return;
    seenTerms.add(cleanTerm.toLowerCase());
    facts.push({
      ...fact,
      term: cleanTerm,
      definition: fact.definition.trim().replace(/^[:=–—\s-]+/, '').trim(),
    });
  };

  for (const sentence of sentences) {
    // 1. Heading or Glossary style: "Term: Definition" or "Term - Definition"
    const colonMatch = sentence.match(/^([A-Z][a-zA-Z0-9\s()/-]{2,50})\s*[:–—]\s*(.{20,250})$/);
    if (colonMatch) {
      const defCandidate = colonMatch[2].trim();
      const wordCount = defCandidate.split(/\s+/).length;
      const isSubheading = wordCount < 6 || defCandidate.endsWith(':') || /^(module|chapter|unit|section|lecture|part|overview|introduction)/i.test(colonMatch[1]);
      if (!isSubheading) {
        addFact({
          term: colonMatch[1],
          definition: defCandidate,
          contextSentence: sentence,
          type: 'definition',
        });
        continue;
      }
    }

    // 2. Explicit definition patterns: "X is defined as Y", "X refers to Y", "X denotes Y"
    const defMatch = sentence.match(
      /(?:^|(?<=[.;]\s+))(?:The\s+)?([A-Z][a-zA-Z0-9\s()/-]{2,45})\s+(?:is defined as|refers to|denotes|is described as|means|is known as)\s+([^.;\n]{20,250})/i
    );
    if (defMatch) {
      addFact({
        term: defMatch[1],
        definition: defMatch[2],
        contextSentence: sentence,
        type: 'definition',
      });
      continue;
    }

    // 3. Location and occurrence: "The Krebs Cycle takes place in the mitochondrial matrix..."
    const locMatch = sentence.match(
      /(?:^|(?<=[.;]\s+))(?:The\s+)?([A-Z][a-zA-Z0-9\s()/-]{2,45}?)(?:,\s*also known as\s+[^,]+,)?\s+(?:takes place in|occurs in|is located in|resides in)\s+([^.;\n]{15,250})/i
    );
    if (locMatch) {
      addFact({
        term: locMatch[1],
        definition: `Takes place in ${locMatch[2]}`,
        contextSentence: sentence,
        type: 'location',
      });
      continue;
    }

    // 4. Functional & conversion patterns: "X converts Y into Z", "X produces Y", "X breaks down Y"
    const convMatch = sentence.match(
      /(?:^|(?<=[.;]\s+))(?:The\s+)?([A-Z][a-zA-Z0-9\s()/-]{2,45})\s+(?:converts|transforms|breaks down|oxidizes|synthesizes|generates|produces|catalyzes)\s+([^.;\n]{20,250})/i
    );
    if (convMatch) {
      addFact({
        term: convMatch[1],
        definition: `Converts or synthesizes ${convMatch[2]}`,
        contextSentence: sentence,
        type: 'function',
      });
      continue;
    }

    // 5. General functional patterns: "X is responsible for Y", "X functions to Y"
    const funcMatch = sentence.match(
      /(?:^|(?<=[.;]\s+))(?:The\s+)?([A-Z][a-zA-Z0-9\s()/-]{2,45})\s+(?:is responsible for|functions to|serves as|acts as|plays a crucial role in|regulates|inhibits)\s+([^.;\n]{20,250})/i
    );
    if (funcMatch) {
      addFact({
        term: funcMatch[1],
        definition: `Responsible for ${funcMatch[2]}`,
        contextSentence: sentence,
        type: 'function',
      });
      continue;
    }

    // 6. Copular identification: "X is a/an Y that Z"
    const copulaMatch = sentence.match(
      /(?:^|(?<=[.;]\s+))(?:The\s+)?([A-Z][a-zA-Z0-9\s()/-]{2,45})\s+(?:is|are)\s+(?:a|an|the)\s+([^.;\n]{25,250})/i
    );
    if (copulaMatch) {
      addFact({
        term: copulaMatch[1],
        definition: copulaMatch[2],
        contextSentence: sentence,
        type: 'mechanism',
      });
      continue;
    }

    // 7. Contrastive statements: "The key difference between X and Y is Z"
    const contrastMatch = sentence.match(
      /(?:the\s+(?:primary|main|key)\s+difference\s+between\s+([A-Za-z0-9\s-]+)\s+and\s+([A-Za-z0-9\s-]+)\s+is\s+that\s+([^.;\n]{20,250}))/i
    );
    if (contrastMatch) {
      addFact({
        term: `${contrastMatch[1]} vs ${contrastMatch[2]}`,
        definition: contrastMatch[3],
        contextSentence: sentence,
        type: 'distinction',
      });
    }
  }

  return facts;
}

/**
 * Authentic Discipline-Specific University Question Banks
 */
interface SubjectQuestion {
  q: string;
  opts: [string, string, string, string];
  ans: number;
  exp: string;
}

const AUTHENTIC_SUBJECT_BANKS: Record<string, SubjectQuestion[]> = {
  biology: [
    {
      q: 'Which organelle is the primary site of ATP synthesis via oxidative phosphorylation during aerobic cellular respiration?',
      opts: ['Mitochondria', 'Rough Endoplasmic Reticulum', 'Golgi Apparatus', 'Lysosome'],
      ans: 0,
      exp: 'Mitochondria contain ATP synthase embedded in the inner mitochondrial membrane (cristae), driving ATP generation via the chemiosmotic proton gradient.',
    },
    {
      q: 'What is the role of the enzyme RuBisCO in the light-independent reactions (Calvin cycle) of photosynthesis?',
      opts: [
        'Catalyzing the fixation of atmospheric CO2 onto ribulose-1,5-bisphosphate (RuBP)',
        'Photolysis of water molecules at photosystem II to release diatomic oxygen',
        'Direct phosphorylation of ADP into ATP via photophosphorylation',
        'Transport of sucrose across phloem sieve tube elements',
      ],
      ans: 0,
      exp: 'RuBisCO (Ribulose-1,5-bisphosphate carboxylase-oxygenase) catalyzes the primary rate-limiting step of carbon fixation in the stroma.',
    },
    {
      q: 'During eukaryotic DNA replication, which enzyme is responsible for synthesizing short RNA primers required by DNA polymerase?',
      opts: ['DNA Primase', 'DNA Ligase', 'DNA Helicase', 'Topoisomerase (Gyrase)'],
      ans: 0,
      exp: 'DNA primase synthesizes short RNA primers that provide the necessary 3\'-OH group for DNA polymerase III to initiate chain elongation.',
    },
    {
      q: 'In enzyme kinetics, how does a competitive inhibitor affect Vmax and the apparent Km of the reaction?',
      opts: [
        'Vmax remains unchanged, while apparent Km increases',
        'Vmax decreases, while apparent Km remains unchanged',
        'Both Vmax and apparent Km decrease proportionally',
        'Both Vmax and apparent Km increase significantly',
      ],
      ans: 0,
      exp: 'Competitive inhibitors bind reversibly to the active site, increasing the substrate concentration required to reach half-maximal velocity (higher Km), but Vmax is attainable at high substrate saturations.',
    },
    {
      q: 'Which phase of meiosis is characterized by homologous chromosome pairing (synapsis) and genetic crossing over?',
      opts: ['Prophase I', 'Metaphase II', 'Anaphase I', 'Telophase II'],
      ans: 0,
      exp: 'Synaptonemal complexes form between homologous chromosomes during Prophase I, facilitating chiasmata formation and genetic recombination.',
    },
  ],
  computer_science: [
    {
      q: 'In relational database management systems, what does the "A" in ACID transaction properties signify?',
      opts: [
        'Atomicity: all operations in a transaction succeed completely or none are applied',
        'Asynchrony: transactions execute without blocking user requests',
        'Availability: data is guaranteed to be readable across all distributed nodes',
        'Authentication: verifying cryptographic tokens before modifying records',
      ],
      ans: 0,
      exp: 'Atomicity ensures that a transaction is treated as an indivisible unit of work: if any sub-operation fails, the entire transaction rolls back.',
    },
    {
      q: 'Which condition is NOT one of the four necessary Coffman conditions required for a system deadlock to occur?',
      opts: [
        'Preemption: the operating system forcibly reclaims held resources',
        'Mutual Exclusion: only one process can hold a non-shareable resource at a time',
        'Hold and Wait: processes hold existing resources while requesting additional allocations',
        'Circular Wait: a closed chain of processes exists where each waits for a resource held by the next',
      ],
      ans: 0,
      exp: 'No Preemption is the actual condition for deadlock. If preemption IS permitted, the OS can break the cycle and resolve deadlock.',
    },
    {
      q: 'What is the worst-case time complexity of standard Quicksort when using a naive fixed pivot selection on an already sorted array?',
      opts: ['O(n²)', 'O(n log n)', 'O(n)', 'O(log n)'],
      ans: 0,
      exp: 'Choosing the first or last element as pivot on an already sorted list produces maximally unbalanced partitions of sizes 0 and n-1, leading to quadratic O(n²) comparisons.',
    },
    {
      q: 'In TCP/IP networking, what sequence of control flags completes the standard three-way handshake establishing a connection?',
      opts: ['SYN -> SYN-ACK -> ACK', 'ACK -> SYN -> FIN', 'SYN -> ACK -> RST', 'FIN -> ACK -> FIN-ACK'],
      ans: 0,
      exp: 'The client sends a SYN packet, the server responds with SYN-ACK, and the client replies with an ACK acknowledging sequence synchrony.',
    },
    {
      q: 'What is the primary function of an inverted page table in virtual memory management?',
      opts: [
        'Indexing physical frames directly to reduce memory overhead of per-process page tables',
        'Translating physical memory addresses back into hard disk sector addresses',
        'Disabling translation lookaside buffers (TLB) to enforce strict address isolation',
        'Compressing dirty cache lines before write-back to secondary storage',
      ],
      ans: 0,
      exp: 'An inverted page table has one entry per physical memory frame rather than per virtual page, drastically reducing memory overhead in large address spaces.',
    },
  ],
  economics: [
    {
      q: 'According to microeconomic theory, what condition defines the profit-maximizing level of output for a firm in any market structure?',
      opts: [
        'Marginal Revenue equals Marginal Cost (MR = MC)',
        'Price equals Average Total Cost (P = ATC)',
        'Total Revenue is strictly greater than Total Cost by 50%',
        'Marginal Cost equals Average Variable Cost at the shutdown point',
      ],
      ans: 0,
      exp: 'A firm maximizes profit where MR = MC; producing beyond this point incurs marginal costs that exceed marginal revenues.',
    },
    {
      q: 'If the price elasticity of demand for a good is -0.4 (inelastic), what will happen to total revenue if the firm raises its price?',
      opts: [
        'Total revenue will increase, because quantity demanded falls by a smaller percentage than the price increase',
        'Total revenue will decrease to zero immediately',
        'Total revenue will remain perfectly unchanged',
        'Total revenue will drop substantially as consumers substitute alternatives',
      ],
      ans: 0,
      exp: 'When demand is inelastic (|Ed| < 1), the percentage decrease in quantity demanded is smaller than the percentage increase in price, resulting in net total revenue expansion.',
    },
    {
      q: 'In Keynesian macroeconomic analysis, what is the formula for the simple government spending multiplier when the Marginal Propensity to Consume is MPC?',
      opts: ['1 / (1 - MPC)', 'MPC / (1 - MPC)', '(1 - MPC) / MPC', '1 / (1 + MPC)'],
      ans: 0,
      exp: 'The simple expenditure multiplier is 1 / (1 - MPC), which is equivalent to 1 / MPS (Marginal Propensity to Save).',
    },
    {
      q: 'Which market structure is characterized by high barriers to entry, a single supplier, and no close substitutes for the good?',
      opts: ['Monopoly', 'Monopolistic Competition', 'Oligopoly', 'Perfect Competition'],
      ans: 0,
      exp: 'A pure monopoly is characterized by a single firm producing a unique product protected by substantial structural or legal entry barriers.',
    },
    {
      q: 'What economic phenomenon is represented by the deadweight loss of an excise tax?',
      opts: [
        'The loss of total economic surplus (consumer + producer surplus) not recouped as government tax revenue',
        'The administrative cost of collecting taxes from wholesale vendors',
        'The total tax revenue paid by foreign exporting firms',
        'The increase in employment resulting from subsidized public sector investments',
      ],
      ans: 0,
      exp: 'Deadweight loss represents mutually beneficial transactions foregone due to market price distortion caused by the tax wedge.',
    },
  ],
  physics: [
    {
      q: "According to Newton's Second Law of Motion, what is the net external force acting on an object of constant mass?",
      opts: [
        'The product of mass and acceleration (F_net = m * a)',
        'The total work divided by the elapsed time interval',
        'The gravitational potential energy stored in the reference frame',
        'The kinetic energy divided by the displacement vector',
      ],
      ans: 0,
      exp: "Newton's Second Law formally defines net resultant force as the time rate of change of linear momentum (dp/dt), which reduces to F = ma for invariant mass.",
    },
    {
      q: 'What fundamental physical principle governs the operation of an electric generator converting mechanical energy to electrical energy?',
      opts: [
        "Faraday's Law of Electromagnetic Induction",
        "Coulomb's Law of Electrostatic Attraction",
        "Hooke's Law of Elastic Deformation",
        "Archimedes' Principle of Buoyant Displacement",
      ],
      ans: 0,
      exp: "Faraday's Law states that a time-varying magnetic flux through a closed conducting circuit induces an electromotive force (EMF) proportional to the rate of change of flux.",
    },
    {
      q: 'What is the First Law of Thermodynamics fundamentally an expression of?',
      opts: [
        'The Conservation of Energy in a thermodynamic system (ΔU = Q - W)',
        'The principle that entropy in an isolated system never decreases',
        'The absolute zero unreachable temperature limit',
        'The ideal gas behavior under zero pressure constraints',
      ],
      ans: 0,
      exp: 'The First Law states that the change in internal energy (ΔU) equals heat added to the system (Q) minus work performed by the system (W), confirming energy cannot be created or destroyed.',
    },
  ],
  chemistry: [
    {
      q: 'What molecular geometry does a molecule with four bonding electron pairs and zero lone pairs adopt according to VSEPR theory?',
      opts: ['Tetrahedral with 109.5° bond angles', 'Trigonal planar with 120° bond angles', 'Linear with 180° bond angles', 'Octahedral with 90° bond angles'],
      ans: 0,
      exp: 'Four electron domains with zero lone pairs (e.g. Methane CH4) minimize electron repulsion in a symmetrical 3-dimensional tetrahedral arrangement with 109.5° bond angles.',
    },
    {
      q: "According to Le Chatelier's Principle, how does an exothermic chemical reaction at equilibrium respond to an increase in ambient temperature?",
      opts: [
        'Equilibrium shifts to the left (toward reactants) to absorb added heat',
        'Equilibrium shifts to the right (toward products) to generate more heat',
        'The equilibrium constant Keq increases substantially',
        'Reaction rate decreases to zero immediately',
      ],
      ans: 0,
      exp: 'For exothermic reactions (ΔH < 0), heat acts as a product. Adding heat drives the equilibrium in the endothermic reverse direction (toward reactants).',
    },
    {
      q: 'What is the pH of a 0.001 M (1 x 10⁻³ M) aqueous solution of hydrochloric acid (HCl), assuming complete dissociation?',
      opts: ['3.0', '1.0', '7.0', '11.0'],
      ans: 0,
      exp: 'Because HCl is a strong acid, [H+] = 10⁻³ M. The pH is calculated as -log10[H+] = -log10(10⁻³) = 3.0.',
    },
  ],
  medicine: [
    {
      q: 'In cardiac electrophysiology, which anatomical structure serves as the primary intrinsic physiological pacemaker of the human heart?',
      opts: ['Sinoatrial (SA) Node', 'Atrioventricular (AV) Node', 'Bundle of His', 'Purkinje Fibers'],
      ans: 0,
      exp: 'The Sinoatrial (SA) node in the right atrium spontaneously depolarizes at the highest intrinsic rate (60–100 bpm), establishing the cardiac sinus rhythm.',
    },
    {
      q: 'Which white blood cell type is the most abundant in normal adult human peripheral blood and acts as the primary responder to bacterial infections?',
      opts: ['Neutrophils', 'Lymphocytes', 'Eosinophils', 'Basophils'],
      ans: 0,
      exp: 'Neutrophils comprise 50%–70% of circulating leukocytes and provide immediate phagocytic and antimicrobial defense during acute bacterial inflammation.',
    },
    {
      q: 'In pharmacology, what term describes the fraction of an administered drug dose that reaches the systemic circulation in active form?',
      opts: ['Bioavailability (F)', 'Clearance (CL)', 'Volume of Distribution (Vd)', 'Therapeutic Index (TI)'],
      ans: 0,
      exp: 'Bioavailability (F) is the proportion of unchanged drug reaching systemic circulation, defining intravenous administration as F = 1.0 (100%).',
    },
  ],
  law: [
    {
      q: 'In the law of torts, what four essential elements must a plaintiff establish to succeed in a cause of action for negligence?',
      opts: [
        'Duty of care, breach of duty, causation (factual and proximate), and measurable damage',
        'Malice, intent, physical trespass, and financial insolvency',
        'Offer, acceptance, consideration, and legal capacity',
        'Jurisdiction, standing, certiorari, and injunctive relief',
      ],
      ans: 0,
      exp: 'Negligence requires demonstrating that the defendant owed a legal duty of care, breached that standard, and directly caused legally cognizable damage.',
    },
    {
      q: 'Under contract law, which legal doctrine prevents a party from enforcing a promise made without valid consideration if the other party reasonably relied on it to their detriment?',
      opts: ['Promissory Estoppel', 'Parol Evidence Rule', 'Novation', 'Privity of Contract'],
      ans: 0,
      exp: 'Promissory estoppel operates in equity to enforce non-bargained promises when justifiable detrimental reliance occurred.',
    },
  ],
  general: [
    {
      q: 'In empirical scientific methodology, what distinguishes a null hypothesis (H₀) from an alternative hypothesis (H₁)?',
      opts: [
        'H₀ posits no significant statistical difference or effect, while H₁ posits a true underlying experimental effect',
        'H₀ is proven with 100% mathematical certainty before testing starts',
        'H₁ is automatically discarded if sample size exceeds 30 observations',
        'H₀ applies exclusively to qualitative interviews, whereas H₁ is quantitative',
      ],
      ans: 0,
      exp: 'Statistical hypothesis testing assesses whether observed experimental sample data provides sufficient evidence to reject the baseline assumption of no effect (H₀).',
    },
    {
      q: 'What is the primary purpose of a double-blind design in controlled clinical and empirical trials?',
      opts: [
        'Eliminating both observer expectancy bias and subject placebo effect',
        'Reducing the financial cost of pharmaceutical manufacturing',
        'Allowing participants to select their preferred experimental treatment group',
        'Ensuring all data points fit a perfectly symmetrical bell curve distribution',
      ],
      ans: 0,
      exp: 'Blinding both investigators and subjects prevents psychological bias and placebo distortion from contaminating treatment efficacy assessments.',
    },
  ],
};

function detectSubject(text: string, topic: string): string {
  const combined = `${topic} ${text.slice(0, 10000)}`.toLowerCase();

  if (/photosynthe|cell|dna|rna|protein|enzyme|mitochondri|organelle|meiosis|mitosis|gene|respirat|glycoly|krebs|chloroplast|membrane|chromosome/i.test(combined)) {
    return 'biology';
  }
  if (/database|sql|algorithm|complexity|packet|tcp|ip|network|operating system|kernel|compiler|memory|cpu|cache|class|thread|quicksort|hash/i.test(combined)) {
    return 'computer_science';
  }
  if (/market|elasticity|inflation|gdp|monopoly|cost|revenue|profit|keynes|fiscal|monetary|consumer|producer|firm|interest rate|supply|demand/i.test(combined)) {
    return 'economics';
  }
  if (/force|acceleration|momentum|velocity|thermodynamic|magnetic|electric|faraday|newton|joule|friction|optics|quantum|kinetic/i.test(combined)) {
    return 'physics';
  }
  if (/acid|base|ph|stoichiometry|bond|orbital|reaction|catalyst|equilibrium|mole|molar|vsepr|enthalpy|titration/i.test(combined)) {
    return 'chemistry';
  }
  if (/cardiac|atrium|ventricle|neuron|pharmacology|pathology|artery|vein|organ|patient|clinical|symptom|syndrome|therapy|dosage/i.test(combined)) {
    return 'medicine';
  }
  if (/contract|tort|statute|jurisdiction|plaintiff|defendant|constitutional|negligence|liability|court|amendment/i.test(combined)) {
    return 'law';
  }
  return 'general';
}

/**
 * Generates genuine, syllabus-grounded examination questions from uploaded text.
 */
export function generateGroundedExamQuiz(
  topic: string,
  text: string,
  count: number,
  difficulty: DifficultyLevel
): QuizQuestion[] {
  const targetCount = Math.max(1, Math.min(count, 15));
  const facts = extractDocumentFacts(text);
  const questions: QuizQuestion[] = [];
  const subject = detectSubject(text, topic);
  const cleanTopic = topic.trim() || 'Course Curriculum';

  // 1. Generate questions directly from extracted document facts
  if (facts.length >= 2) {
    for (let i = 0; i < facts.length && questions.length < targetCount; i++) {
      const fact = facts[i];
      const otherFacts = facts.filter((_, idx) => idx !== i);

      // Question Type Alternation:
      // Even index: Reverse Identification ("Which term matches: [definition]?")
      // Odd index: Forward Definition / Function ("What is the primary role of [term]?")
      const isReverse = i % 2 === 0;

      if (isReverse) {
        // Collect other terms as authentic distractors
        const otherTerms = otherFacts.map((f) => f.term).filter((t) => t && t !== fact.term);
        const distractor1 = otherTerms[0] || `${cleanTopic} Regulation Mechanism`;
        const distractor2 = otherTerms[1] || `Secondary Feedback Phase`;
        const distractor3 = otherTerms[2] || `External Rate Inhibitor`;

        const correctPos = i % 4;
        const opts: [string, string, string, string] = ['', '', '', ''];
        const choices = [fact.term, distractor1, distractor2, distractor3];
        opts[correctPos] = choices[0];
        opts[(correctPos + 1) % 4] = choices[1];
        opts[(correctPos + 2) % 4] = choices[2];
        opts[(correctPos + 3) % 4] = choices[3];

        let stem = '';
        if (fact.type === 'location') {
          stem = `According to your study material, which biological or physical structure ${fact.definition.toLowerCase()}?`;
        } else if (fact.type === 'function') {
          stem = `Which process or component is specifically described as: "${fact.definition}"?`;
        } else {
          stem = `Which academic concept corresponds to this definition: "${fact.definition}"?`;
        }

        questions.push({
          id: `q-rev-${i + 1}-${Date.now()}`,
          question: stem,
          options: opts,
          correctAnswer: correctPos,
          explanation: `Option ${String.fromCharCode(65 + correctPos)} (${fact.term}) is correct: The study notes state: "${fact.contextSentence}".`,
        });
      } else {
        // Forward question: "What is the primary role/definition of [Term]?"
        const otherDefs = otherFacts.map((f) => f.definition).filter((d) => d && d !== fact.definition);
        const distractor1 = otherDefs[0] || `Regulates systemic homeostasis without participating in direct energy coupling.`;
        const distractor2 = otherDefs[1] || `Catalyzes reverse equilibrium degradation under depleted substrate conditions.`;
        const distractor3 = otherDefs[2] || `Acts as a non-essential secondary cofactor with variable expression.`;

        const correctPos = (i + 1) % 4;
        const opts: [string, string, string, string] = ['', '', '', ''];
        const choices = [fact.definition, distractor1, distractor2, distractor3];
        opts[correctPos] = choices[0];
        opts[(correctPos + 1) % 4] = choices[1];
        opts[(correctPos + 2) % 4] = choices[2];
        opts[(correctPos + 3) % 4] = choices[3];

        let stem = '';
        if (fact.type === 'function') {
          stem = `In the study of ${cleanTopic}, what is the primary function or mechanism of "${fact.term}"?`;
        } else if (fact.type === 'location') {
          stem = `Based on your course notes, where does "${fact.term}" occur, and what characterizes it?`;
        } else {
          stem = `According to the syllabus, how is "${fact.term}" defined and characterized?`;
        }

        questions.push({
          id: `q-fwd-${i + 1}-${Date.now()}`,
          question: stem,
          options: opts,
          correctAnswer: correctPos,
          explanation: `Option ${String.fromCharCode(65 + correctPos)} is correct: The study material notes: "${fact.contextSentence}".`,
        });
      }
    }
  }

  // 2. Cloze / Sentence-Completion for remaining questions
  const sentences = extractSentences(text).filter(
    (s) => s.length >= 40 && !s.endsWith(':') && /\b(is|are|occurs|takes place|produces|converts|requires|contains|generates)\b/i.test(s)
  );

  if (questions.length < targetCount && sentences.length > 0) {
    for (let i = 0; i < sentences.length && questions.length < targetCount; i++) {
      const sentence = sentences[i];
      // Find prominent candidate words: terms, nouns, numbers
      const matches = sentence.match(/\b([A-Z][a-z]{3,20}|\d+(?:\s*(?:ATP|NADH|CO2|H2O|%|M|km|meters|seconds|joules))?)\b/g);
      if (matches && matches.length > 0) {
        // Pick a key word that isn't at the very beginning of the sentence
        const targetWord = matches.find((w) => sentence.indexOf(w) > 5) || matches[0];
        const blanked = sentence.replace(new RegExp(`\\b${targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`), '___________');
        if (blanked !== sentence) {
          const otherWords = sentences
            .flatMap((s) => s.match(/\b([A-Z][a-z]{3,20}|\d+(?:\s*(?:ATP|NADH|CO2|H2O|%|M))?)\b/g) || [])
            .filter((w) => w && w !== targetWord);
          const uniqueOthers = Array.from(new Set(otherWords));

          const d1 = uniqueOthers[0] || 'Cytoplasm';
          const d2 = uniqueOthers[1] || 'Ribosome';
          const d3 = uniqueOthers[2] || 'Endoplasmic Reticulum';

          const correctPos = (questions.length + 2) % 4;
          const opts: [string, string, string, string] = ['', '', '', ''];
          const choices = [targetWord, d1, d2, d3];
          opts[correctPos] = choices[0];
          opts[(correctPos + 1) % 4] = choices[1];
          opts[(correctPos + 2) % 4] = choices[2];
          opts[(correctPos + 3) % 4] = choices[3];

          questions.push({
            id: `q-cloze-${questions.length + 1}-${Date.now()}`,
            question: `Complete the following high-yield statement from your study notes: "${blanked}"`,
            options: opts,
            correctAnswer: correctPos,
            explanation: `Option ${String.fromCharCode(65 + correctPos)} (${targetWord}) is correct: Source text: "${sentence}".`,
          });
        }
      }
    }
  }

  // 3. If still under target count, pull authentic academic curriculum questions from subject bank
  const subjectBank = AUTHENTIC_SUBJECT_BANKS[subject] || AUTHENTIC_SUBJECT_BANKS.general;
  let bankIdx = 0;
  while (questions.length < targetCount && bankIdx < subjectBank.length) {
    const item = subjectBank[bankIdx % subjectBank.length];
    questions.push({
      id: `q-subject-${questions.length + 1}-${Date.now()}`,
      question: item.q,
      options: item.opts,
      correctAnswer: item.ans,
      explanation: item.exp,
    });
    bankIdx++;
  }

  return questions.slice(0, targetCount);
}

/**
 * Generates high-yield Flashcards grounded directly in the uploaded text.
 */
export function generateGroundedFlashcards(
  topic: string,
  text: string,
  count: number
): Flashcard[] {
  const safeCount = Math.max(1, Math.min(count, 15));
  const facts = extractDocumentFacts(text);
  const flashcards: Flashcard[] = [];

  for (let i = 0; i < facts.length && flashcards.length < safeCount; i++) {
    const fact = facts[i];
    flashcards.push({
      id: `fc-grounded-${i + 1}-${Date.now()}`,
      front: fact.term,
      back: fact.definition,
      position: i,
      known: false,
    });
  }

  // Fallback if notes are brief: use authentic subject definitions
  if (flashcards.length < safeCount) {
    const subject = detectSubject(text, topic);
    const bank = AUTHENTIC_SUBJECT_BANKS[subject] || AUTHENTIC_SUBJECT_BANKS.general;
    for (let i = 0; i < bank.length && flashcards.length < safeCount; i++) {
      const q = bank[i];
      flashcards.push({
        id: `fc-bank-${flashcards.length + 1}-${Date.now()}`,
        front: q.opts[q.ans],
        back: q.exp,
        position: flashcards.length,
        known: false,
      });
    }
  }

  return flashcards.slice(0, safeCount);
}

/**
 * Generates punchy, rapid-recall Brain Blitz questions grounded in the text.
 */
export function generateGroundedBrainBlitz(
  topic: string,
  text: string,
  count: number
): BrainBlitzQuestion[] {
  const safeCount = Math.max(5, Math.min(count, 30));
  const facts = extractDocumentFacts(text);
  const questions: BrainBlitzQuestion[] = [];
  const cleanTopic = topic.trim() || 'Rapid Mastery';

  if (facts.length >= 2) {
    for (let i = 0; i < facts.length && questions.length < safeCount; i++) {
      const fact = facts[i];
      const otherFacts = facts.filter((_, idx) => idx !== i);
      const d1 = otherFacts[0]?.term || 'Alternative Pathway';
      const d2 = otherFacts[1]?.term || 'Feedback Inhibition';
      const d3 = otherFacts[2]?.term || 'Substrate Binding';

      const correctPos = i % 4;
      const opts: [string, string, string, string] = ['', '', '', ''];
      const choices = [fact.term, d1, d2, d3];
      opts[correctPos] = choices[0];
      opts[(correctPos + 1) % 4] = choices[1];
      opts[(correctPos + 2) % 4] = choices[2];
      opts[(correctPos + 3) % 4] = choices[3];

      questions.push({
        id: `bb-grounded-${i + 1}-${Date.now()}`,
        prompt: `Which concept matches: "${fact.definition.slice(0, 90)}..."?`,
        options: opts,
        correctIndex: correctPos,
        category: cleanTopic.slice(0, 20),
      });
    }
  }

  // Supplement from subject bank if needed
  if (questions.length < safeCount) {
    const subject = detectSubject(text, topic);
    const bank = AUTHENTIC_SUBJECT_BANKS[subject] || AUTHENTIC_SUBJECT_BANKS.general;
    for (let i = 0; i < bank.length && questions.length < safeCount; i++) {
      const b = bank[i];
      questions.push({
        id: `bb-bank-${questions.length + 1}-${Date.now()}`,
        prompt: b.q.length > 100 ? `${b.q.slice(0, 95)}...?` : b.q,
        options: b.opts,
        correctIndex: b.ans,
        category: cleanTopic.slice(0, 20),
      });
    }
  }

  return questions.slice(0, safeCount);
}

/**
 * Generates an executive summary, glossary, and takeaways from actual document text.
 */
export function generateGroundedDocumentSummary(text: string, fileName: string): DocumentSummary {
  const cleanTitle = fileName ? fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : 'Course Material';
  const sentences = extractSentences(text);
  const facts = extractDocumentFacts(text);

  // Synthesize executive summary from top sentences
  let exec = '';
  if (sentences.length >= 3) {
    exec = sentences.slice(0, 4).join('. ') + '.';
  } else if (text.trim().length > 30) {
    exec = text.trim().slice(0, 500);
  } else {
    exec = `Comprehensive study and revision notes for ${cleanTitle}, covering foundational definitions, critical mechanisms, and examination focus areas.`;
  }

  // Key concepts from real extracted facts
  const keyConcepts = facts.slice(0, 6).map((f) => ({
    term: f.term,
    definition: f.definition,
  }));

  // If no facts could be extracted, generate meaningful subject concepts
  if (keyConcepts.length === 0) {
    const subject = detectSubject(text, cleanTitle);
    const bank = AUTHENTIC_SUBJECT_BANKS[subject] || AUTHENTIC_SUBJECT_BANKS.general;
    for (let i = 0; i < 4 && i < bank.length; i++) {
      keyConcepts.push({
        term: bank[i].opts[bank[i].ans],
        definition: bank[i].exp,
      });
    }
  }

  // Exam takeaways
  const examTakeaways = [
    `Master the exact terminology: be prepared to define and distinguish ${keyConcepts[0]?.term || 'key principles'} on exam day.`,
    `Focus on the causal mechanics: examiners frequently test why and how processes occur rather than simple recall.`,
    `Review practical application: practice working through multi-step scenarios without relying on open references.`,
  ];

  return {
    title: cleanTitle,
    executiveSummary: exec,
    keyConcepts,
    examTakeaways,
    sourceNotes: text.slice(0, 3000),
    source: 'fallback',
  };
}
