import React from 'react';
import { QuizPlayer } from '@/components/quiz/QuizPlayer';

export default function QuizzesPage() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">AI Quiz Generator & Practice</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Generate targeted multiple-choice questions from any topic or your study notes to build active recall.
        </p>
      </div>
      <QuizPlayer />
    </div>
  );
}
