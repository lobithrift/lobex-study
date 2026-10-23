import React from 'react';
import { BrainBlitzGame } from '@/components/game/BrainBlitzGame';

export default function BrainBlitzPage() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Brain Blitz Game</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Challenge yourself against the 60-second timer to reinforce fast recall across multiple subjects.
        </p>
      </div>
      <BrainBlitzGame />
    </div>
  );
}
