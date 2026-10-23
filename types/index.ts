export type ExplanationLevel = 'simple' | 'standard' | 'detailed';
export type DifficultyLevel = 'easy' | 'medium' | 'difficult';
export type UserRole = 'student' | 'admin';

export interface Profile {
  id: string;
  display_name: string | null;
  role: UserRole;
  preferred_explanation_level: ExplanationLevel;
  created_at: string;
  updated_at: string;
}

export interface StudySet {
  id: string;
  user_id: string;
  title: string;
  source_type: 'topic' | 'notes';
  created_at: string;
  updated_at: string;
  cards_count?: number;
}

export interface Flashcard {
  id: string;
  study_set_id?: string;
  front: string;
  back: string;
  position: number;
  known?: boolean;
  created_at?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctAnswer: number; // 0, 1, 2, 3
  explanation: string;
}

export interface QuizAttempt {
  id: string;
  user_id?: string;
  topic: string;
  difficulty: DifficultyLevel;
  question_count: number;
  score: number;
  completed_at: string;
}

export interface StudySession {
  id: string;
  subject: string;
  topic: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number; // 25, 45, 60, etc.
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface BrainBlitzQuestion {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  category: string;
}

export interface BrainBlitzRecord {
  highScore: number;
  totalGames: number;
  bestStreak: number;
  lastPlayed: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  explanationLevel?: ExplanationLevel;
  flagged?: boolean;
}

export interface FlaggedReport {
  id: string;
  timestamp: string;
  query: string;
  response: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
}

export interface DocumentSummary {
  title: string;
  executiveSummary: string;
  keyConcepts: Array<{ term: string; definition: string }>;
  examTakeaways: string[];
  sourceNotes: string;
  source: 'gemini' | 'llm' | 'fallback';
}
