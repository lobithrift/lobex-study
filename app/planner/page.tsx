import React from 'react';
import { PlannerCalendar } from '@/components/planner/PlannerCalendar';

export default function PlannerPage() {
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Personalized Study Timetable</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Plan balanced revision sessions ahead of your exams with customizable Pomodoro blocks, saved directly in your browser.
        </p>
      </div>
      <PlannerCalendar />
    </div>
  );
}
