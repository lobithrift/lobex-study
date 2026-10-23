import React from 'react';
import { ChatWindow } from '@/components/tutor/ChatWindow';

export default function TutorPage() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">AI Concept Tutor</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Ask questions in plain language, switch explanation depth, and follow up until concepts click.
        </p>
      </div>
      <ChatWindow />
    </div>
  );
}
