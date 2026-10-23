import { BrainBlitzQuestion, BrainBlitzRecord } from '@/types';

const STORAGE_KEY = 'lobex_brain_blitz_v1';

export function getStoredGameRecord(): BrainBlitzRecord {
  if (typeof window === 'undefined') {
    return { highScore: 0, totalGames: 0, bestStreak: 0, lastPlayed: '' };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { highScore: 0, totalGames: 0, bestStreak: 0, lastPlayed: '' };
    }
    const data = JSON.parse(raw);
    return {
      highScore: Number(data.highScore) || 0,
      totalGames: Number(data.totalGames) || 0,
      bestStreak: Number(data.bestStreak) || 0,
      lastPlayed: String(data.lastPlayed || ''),
    };
  } catch (err) {
    console.warn('Corrupted Brain Blitz data in localStorage:', err);
    return { highScore: 0, totalGames: 0, bestStreak: 0, lastPlayed: '' };
  }
}

export function saveGameRecord(score: number, streak: number): BrainBlitzRecord {
  const current = getStoredGameRecord();
  const updated: BrainBlitzRecord = {
    highScore: Math.max(current.highScore, score),
    totalGames: current.totalGames + 1,
    bestStreak: Math.max(current.bestStreak, streak),
    lastPlayed: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save Brain Blitz score:', e);
    }
  }

  return updated;
}

export function clearGameRecord(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear Brain Blitz storage:', e);
  }
}

export const DEFAULT_BRAIN_BLITZ_QUESTIONS: BrainBlitzQuestion[] = [
  {
    id: 'bb-1',
    prompt: 'What organelle is known as the powerhouse of the cell?',
    options: ['Mitochondria', 'Nucleus', 'Ribosome', 'Golgi Apparatus'],
    correctIndex: 0,
    category: 'Biology',
  },
  {
    id: 'bb-2',
    prompt: 'What is the chemical symbol for Gold?',
    options: ['Ag', 'Au', 'Fe', 'Gd'],
    correctIndex: 1,
    category: 'Chemistry',
  },
  {
    id: 'bb-3',
    prompt: 'What is the derivative of x² with respect to x?',
    options: ['x', '2x', 'x²', '2'],
    correctIndex: 1,
    category: 'Mathematics',
  },
  {
    id: 'bb-4',
    prompt: 'Which planet has the most prominent ring system?',
    options: ['Jupiter', 'Saturn', 'Neptune', 'Mars'],
    correctIndex: 1,
    category: 'Astronomy',
  },
  {
    id: 'bb-5',
    prompt: 'What is the fundamental unit of electric current in the SI system?',
    options: ['Volt', 'Watt', 'Ampere', 'Ohm'],
    correctIndex: 2,
    category: 'Physics',
  },
  {
    id: 'bb-6',
    prompt: 'In computing, what does "HTTP" stand for?',
    options: [
      'High Transfer Text Protocol',
      'Hypertext Transfer Protocol',
      'Hyperlink Terminal Transfer Path',
      'Host Type Test Program',
    ],
    correctIndex: 1,
    category: 'Computer Science',
  },
  {
    id: 'bb-7',
    prompt: 'Who proposed the Theory of General Relativity?',
    options: ['Isaac Newton', 'Niels Bohr', 'Albert Einstein', 'Galileo Galilei'],
    correctIndex: 2,
    category: 'Physics',
  },
  {
    id: 'bb-8',
    prompt: 'Which gas is most abundant in Earth’s atmosphere?',
    options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Argon'],
    correctIndex: 2,
    category: 'Earth Science',
  },
  {
    id: 'bb-9',
    prompt: 'What is the solution to 3(x - 2) = 12?',
    options: ['x = 4', 'x = 6', 'x = 5', 'x = 8'],
    correctIndex: 1,
    category: 'Mathematics',
  },
  {
    id: 'bb-10',
    prompt: 'Which blood vessels carry oxygenated blood away from the heart?',
    options: ['Veins', 'Arteries', 'Capillaries', 'Venules'],
    correctIndex: 1,
    category: 'Biology',
  },
];
