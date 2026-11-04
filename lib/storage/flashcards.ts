import { Flashcard } from '@/types';

export interface SavedFlashcardDeck {
  id: string;
  title: string;
  topic: string;
  notes?: string;
  sourceType: 'topic' | 'notes';
  cards: Flashcard[];
  cardCount: number;
  syncedToCloud: boolean;
  cloudSetId?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'lobex_saved_flashcard_decks_v1';

export function getStoredFlashcardDecks(): SavedFlashcardDeck[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn('Malformed flashcard decks in localStorage. Resetting.');
      return [];
    }

    return parsed.filter(
      (d) => d && typeof d.id === 'string' && typeof d.title === 'string' && Array.isArray(d.cards)
    );
  } catch (err) {
    console.warn('LocalStorage unavailable or error reading flashcard decks:', err);
    return [];
  }
}

export function saveFlashcardDeckLocally(
  deckData: Omit<SavedFlashcardDeck, 'updatedAt' | 'cardCount'> & {
    cardCount?: number;
    updatedAt?: string;
  }
): SavedFlashcardDeck {
  if (typeof window === 'undefined') {
    return {
      ...deckData,
      cardCount: deckData.cards.length,
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const currentDecks = getStoredFlashcardDecks();
    const now = new Date().toISOString();

    const fullRecord: SavedFlashcardDeck = {
      ...deckData,
      cardCount: deckData.cards.length,
      updatedAt: deckData.updatedAt || now,
      createdAt: deckData.createdAt || now,
    };

    const existingIndex = currentDecks.findIndex((d) => d.id === fullRecord.id);

    let updatedDecks: SavedFlashcardDeck[];
    if (existingIndex >= 0) {
      updatedDecks = [...currentDecks];
      updatedDecks[existingIndex] = fullRecord;
    } else {
      updatedDecks = [fullRecord, ...currentDecks];
    }

    // Keep up to 50 saved decks locally
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDecks.slice(0, 50)));
    return fullRecord;
  } catch (err) {
    console.error('Failed to write flashcard deck to localStorage:', err);
    return {
      ...deckData,
      cardCount: deckData.cards.length,
      updatedAt: new Date().toISOString(),
    };
  }
}

export function deleteStoredFlashcardDeck(id: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const currentDecks = getStoredFlashcardDecks();
    const filtered = currentDecks.filter((d) => d.id !== id);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('Failed to delete flashcard deck from localStorage:', err);
    return false;
  }
}

export function getStoredFlashcardDeckById(id: string): SavedFlashcardDeck | null {
  const decks = getStoredFlashcardDecks();
  return decks.find((d) => d.id === id) || null;
}

export function clearStoredFlashcardDecks(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear flashcard decks from localStorage:', err);
  }
}
