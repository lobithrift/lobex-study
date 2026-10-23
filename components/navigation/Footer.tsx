import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white overflow-hidden flex items-center justify-center p-1 shadow-xs flex-shrink-0">
                <img src="/logo.png" alt="Lobex Study Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-2xl font-black text-white tracking-tight">Lobex Study</span>
            </div>
            <p className="text-slate-400 max-w-md text-sm leading-relaxed">
              <strong>Learn Smarter. Practice Better. Achieve More.</strong> An academic learning platform engineered to help students synthesize difficult course readings, practice active recall, and master exam syllabi.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
              <ShieldCheck className="w-4 h-4 text-slate-300" />
              <span>Secure student sessions. Study timetables and flashcards are safely stored on your device.</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3">Academic Tools</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/summarizer" className="hover:text-white transition-colors">
                  Material & PDF Summarizer
                </Link>
              </li>
              <li>
                <Link href="/tutor" className="hover:text-white transition-colors">
                  Concept Tutor
                </Link>
              </li>
              <li>
                <Link href="/quizzes" className="hover:text-white transition-colors">
                  Examination Practice Quizzes
                </Link>
              </li>
              <li>
                <Link href="/flashcards" className="hover:text-white transition-colors">
                  Active Recall Flashcards
                </Link>
              </li>
              <li>
                <Link href="/planner" className="hover:text-white transition-colors">
                  Study Timetable Planner
                </Link>
              </li>
              <li>
                <Link href="/brain-blitz" className="hover:text-white transition-colors">
                  Brain Blitz Recall Challenge
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3">Platform</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Student Dashboard
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-white transition-colors">
                  Account & Privacy
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-white transition-colors">
                  Administrative Portal
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Sign In / Register
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>
            &copy; {new Date().getFullYear()} Lobex Study. All rights reserved.
          </p>
          <p className="text-center sm:text-right">
            Always verify critical formulas and empirical definitions with your primary academic syllabus and course textbooks.
          </p>
        </div>
      </div>
    </footer>
  );
}
