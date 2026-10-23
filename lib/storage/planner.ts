import { StudySession } from '@/types';

const STORAGE_KEY = 'lobex_study_planner_v1';

export function getStoredSessions(): StudySession[] {
  if (typeof window === 'undefined') return [];

  try {
    const item = window.localStorage.getItem(STORAGE_KEY);
    if (!item) {
      // Seed default helpful sessions for new students
      const defaults = getDefaultSessions();
      saveStoredSessions(defaults);
      return defaults;
    }
    const parsed = JSON.parse(item);
    if (!Array.isArray(parsed)) {
      console.warn('Malformed planner data in storage. Resetting to defaults.');
      return getDefaultSessions();
    }
    return parsed.filter(
      (s) => s && typeof s.id === 'string' && typeof s.subject === 'string' && typeof s.date === 'string'
    );
  } catch (err) {
    console.warn('LocalStorage unavailable or corrupted. Using memory state.', err);
    return getDefaultSessions();
  }
}

export function saveStoredSessions(sessions: StudySession[]): boolean {
  if (typeof window === 'undefined') return false;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return true;
  } catch (err) {
    console.error('Failed to write planner sessions to localStorage:', err);
    return false;
  }
}

export function clearStoredSessions(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear planner localStorage:', err);
  }
}

export function getDefaultSessions(): StudySession[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  return [
    {
      id: 'session-demo-1',
      subject: 'Biology',
      topic: 'Cell Division & Photosynthesis Revision',
      date: formatDate(today),
      startTime: '16:00',
      durationMinutes: 45,
      completed: false,
      notes: 'Review Calvin cycle diagrams and solve 10 practice questions',
    },
    {
      id: 'session-demo-2',
      subject: 'Mathematics',
      topic: 'Calculus & Derivatives Practice',
      date: formatDate(tomorrow),
      startTime: '10:00',
      durationMinutes: 60,
      completed: false,
      notes: 'Focus on chain rule problems and rate of change applications',
    },
  ];
}

/**
 * Generate an optimized timetable from user preferences
 */
export function generateTimetablePlan(params: {
  subjects: string[];
  examDate: string;
  daysPerWeek: number;
  sessionDuration: number;
}): StudySession[] {
  const { subjects, examDate, daysPerWeek, sessionDuration } = params;
  if (!subjects.length) return [];

  const sessions: StudySession[] = [];
  const targetDate = new Date(examDate);
  const now = new Date();

  // If exam date is invalid or in the past, use a 2-week default window
  const endDate = isNaN(targetDate.getTime()) || targetDate <= now
    ? new Date(now.getTime() + 14 * 86400000)
    : targetDate;

  const totalDays = Math.max(1, Math.min(60, Math.ceil((endDate.getTime() - now.getTime()) / 86400000)));
  const preferredDays = Math.max(1, Math.min(7, daysPerWeek));

  let subjectIdx = 0;
  for (let d = 1; d <= totalDays; d++) {
    const curDate = new Date(now.getTime() + d * 86400000);
    const dayOfWeek = curDate.getDay(); // 0 is Sunday, 6 is Saturday

    // Distribute according to preferred days
    const isStudyDay = preferredDays >= 5 || (preferredDays === 3 && [1, 3, 5].includes(dayOfWeek)) || (preferredDays === 4 && [1, 2, 4, 6].includes(dayOfWeek));

    if (isStudyDay) {
      const subject = subjects[subjectIdx % subjects.length];
      subjectIdx++;

      sessions.push({
        id: `gen-session-${d}-${Date.now()}`,
        subject,
        topic: `Systematic Revision & Practice (${subject})`,
        date: curDate.toISOString().split('T')[0],
        startTime: '16:30',
        durationMinutes: sessionDuration || 45,
        completed: false,
        notes: `Focus on high-yield topic definitions and flashcards.`,
      });
    }

    if (sessions.length >= 20) break; // Keep manageable initial plan
  }

  return sessions;
}
