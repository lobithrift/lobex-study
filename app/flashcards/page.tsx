import React from 'react';
import { FlashcardViewer } from '@/components/flashcards/FlashcardViewer';

export default function FlashcardsPage() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Active Recall Flashcards</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Flip cards with 3D animation, track cards that need review, and test definitions with keyboard shortcuts.
        </p>
      </div>
      <FlashcardViewer />
    </div>
  );
}
