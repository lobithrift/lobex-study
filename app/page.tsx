import React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  CalendarCheck,
  CheckSquare,
  FileText,
  Layers,
  Zap,
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';

export default function HomePage() {
  const tools = [
    {
      title: 'Material & PDF Summarizer',
      description:
        'Upload course syllabi, lecture slides, or PDF notes to extract structured executive summaries, precise terminology glossaries, and high-yield examination focus points.',
      href: '/summarizer',
      icon: FileText,
      badge: 'Document Synthesis',
    },
    {
      title: 'Academic Concept Tutor',
      description:
        'Address challenging topics with mathematically and scientifically rigorous explanations. Adjust depth from foundational intuitive principles to comprehensive academic derivations.',
      href: '/tutor',
      icon: BookOpen,
      badge: 'Precision Q&A',
    },
    {
      title: 'Examination Practice Builder',
      description:
        'Generate syllabus-aligned multiple-choice examinations directly from lecture notes or topics. Review step-by-step scoring with technical explanations for each option.',
      href: '/quizzes',
      icon: CheckSquare,
      badge: 'Active Recall',
    },
    {
      title: 'Active Recall Flashcards',
      description:
        'Study with interactive flashcard decks. Sort between Mastered concepts and items Needing Review, shuffle card sequences, and build custom cue cards.',
      href: '/flashcards',
      icon: Layers,
      badge: 'Spaced Repetition',
    },
    {
      title: 'Study Timetable Planner',
      description:
        'Construct an organized examination revision timetable configured around target exam dates, weekly study commitments, and structured Pomodoro focus intervals.',
      href: '/planner',
      icon: CalendarCheck,
      badge: 'Local Schedule',
    },
    {
      title: 'Brain Blitz Recall Challenge',
      description:
        'A focused, 60-second rapid-fire recall exercise across multidisciplinary academic topics. Fully accessible via keyboard controls with local performance tracking.',
      href: '/brain-blitz',
      icon: Zap,
      badge: 'Rapid Mastery',
    },
  ];

  return (
    <div className="space-y-16 py-6 sm:py-10">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-sm font-semibold">
          <span>Evidence-Based Academic Learning Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold text-slate-900 tracking-tight leading-tight">
          Learn Smarter. Practice Better. Achieve More.
        </h1>

        <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Lobex Study brings together document synthesis, conceptual tutoring, active recall examinations, interactive flashcards, and personalized revision timetabling into a unified, distraction-free environment.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/summarizer"
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm sm:text-base shadow-xs transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <FileText className="w-4 h-4" />
            <span>Summarize PDF or Notes</span>
          </Link>
          <Link
            href="/tutor"
            className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold rounded-xl text-sm sm:text-base shadow-xs transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <BookOpen className="w-4 h-4" />
            <span>Open Concept Tutor</span>
          </Link>
          <Link
            href="/login?mode=signup"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm sm:text-base shadow-xs transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Student Account</span>
          </Link>
        </div>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-slate-700" /> Encrypted Data Protection
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-700" /> Zero Audio Dependency
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-slate-700" /> Complete Keyboard Operability
          </span>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Integrated Learning & Revision Tools
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Engineered around cognitive science principles: active recall, spaced repetition, and structured conceptual synthesis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.title}
                className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:border-slate-400 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center font-bold">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                      {tool.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2">{tool.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    {tool.description}
                  </p>
                </div>

                <Link
                  href={tool.href}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-blue-600 pt-3 border-t border-slate-100 group"
                >
                  <span>Launch Tool</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Structured Methodology Banner */}
      <section className="bg-slate-900 text-white rounded-2xl p-8 sm:p-10 shadow-sm border border-slate-800">
        <div className="max-w-4xl space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Methodology
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              An Academic Workflow Built for Retention
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-slate-300">
            <div className="space-y-2 border-l border-slate-700 pl-4">
              <span className="text-base font-bold text-white">1. Synthesize Notes</span>
              <p className="leading-relaxed text-slate-400 text-sm">
                Process dense PDF readings or transcripts into executive summaries, core vocabulary, and high-yield examination points.
              </p>
            </div>
            <div className="space-y-2 border-l border-slate-700 pl-4">
              <span className="text-base font-bold text-white">2. Test Recall</span>
              <p className="leading-relaxed text-slate-400 text-sm">
                Immediately convert concepts into practice multiple-choice questions and interactive 3D flashcards to reinforce retention.
              </p>
            </div>
            <div className="space-y-2 border-l border-slate-700 pl-4">
              <span className="text-base font-bold text-white">3. Maintain Timetable</span>
              <p className="leading-relaxed text-slate-400 text-sm">
                Structure study blocks across upcoming deadlines and monitor your progress across consistent revision sessions.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
