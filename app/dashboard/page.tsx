'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  CalendarCheck,
  CheckSquare,
  FileText,
  Layers,
  ArrowRight,
  Trophy,
  Flame,
  CheckCircle2,
  Clock,
  HardDrive,
  Cloud,
  Zap,
} from 'lucide-react';
import { getStoredSessions } from '@/lib/storage/planner';
import { getStoredGameRecord } from '@/lib/storage/game';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function DashboardPage() {
  const [studentName, setStudentName] = useState('Student');
  const [plannerCompletedCount, setPlannerCompletedCount] = useState(0);
  const [plannerPendingCount, setPlannerPendingCount] = useState(0);
  const [blitzHighScore, setBlitzHighScore] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [recentQuizzes, setRecentQuizzes] = useState<any[]>([]);
  const [isCloudUser, setIsCloudUser] = useState(false);

  useEffect(() => {
    // 1. Load planner data from localStorage
    const sessions = getStoredSessions();
    setPlannerCompletedCount(sessions.filter((s) => s.completed).length);
    setPlannerPendingCount(sessions.filter((s) => !s.completed).length);

    // 2. Load game score from localStorage
    const game = getStoredGameRecord();
    setBlitzHighScore(game.highScore);

    // 3. Check auth state and load user & quiz attempts
    const checkAuthAndData = async () => {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setIsCloudUser(true);
        setStudentName(user.user_metadata?.display_name || user.email?.split('@')[0] || 'Student');

        const { data: attempts } = await supabase
          .from('quiz_attempts')
          .select('*')
          .order('completed_at', { ascending: false })
          .limit(5);

        if (attempts && attempts.length > 0) {
          setQuizCount(attempts.length);
          const totalScore = attempts.reduce((acc, a) => acc + (a.score / a.question_count) * 100, 0);
          setAvgScore(Math.round(totalScore / attempts.length));
          setRecentQuizzes(attempts);
        }
      } else {
        // Check demo user
        const demoRaw = localStorage.getItem('lobex_demo_user');
        if (demoRaw) {
          try {
            const demo = JSON.parse(demoRaw);
            setStudentName(demo.display_name || 'Alex');
          } catch (e) {}
        }

        // Check local guest quizzes
        const guestQuizzes = JSON.parse(localStorage.getItem('lobex_guest_quizzes') || '[]');
        if (guestQuizzes.length > 0) {
          setQuizCount(guestQuizzes.length);
          const totalScore = guestQuizzes.reduce((acc: number, a: any) => acc + (a.score / a.question_count) * 100, 0);
          setAvgScore(Math.round(totalScore / guestQuizzes.length));
          setRecentQuizzes(guestQuizzes);
        }
      }
    };

    checkAuthAndData();
  }, []);

  const actionCards = [
    {
      title: 'Material & PDF Summarizer',
      desc: 'Extract executive summaries, technical glossaries, and exam takeaways from documents.',
      href: '/summarizer',
      icon: FileText,
      badge: 'Document Synthesis',
    },
    {
      title: 'Academic Concept Tutor',
      desc: 'Ask difficult questions and get mathematically and scientifically rigorous explanations.',
      href: '/tutor',
      icon: BookOpen,
      badge: 'Interactive Q&A',
    },
    {
      title: 'Practice Examinations',
      desc: 'Generate active recall multiple-choice tests with answers and rationales.',
      href: '/quizzes',
      icon: CheckSquare,
      badge: 'Active Recall',
    },
    {
      title: 'Revision Flashcards',
      desc: 'Flip 3D cards, shuffle terms, and track concepts needing review.',
      href: '/flashcards',
      icon: Layers,
      badge: 'Spaced Repetition',
    },
    {
      title: 'Study Timetable',
      desc: 'Organize your revision schedule with Pomodoro and exam countdowns.',
      href: '/planner',
      icon: CalendarCheck,
      badge: 'Device Stored',
    },
    {
      title: 'Brain Blitz Challenge',
      desc: 'Beat the 60-second rapid-recall clock and climb your personal high score.',
      href: '/brain-blitz',
      icon: Zap,
      badge: 'Rapid Fire',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner - Refined Academic Slate */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-sm border border-slate-800">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800 text-slate-300 text-sm font-semibold">
            <span>Student Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Welcome back, {studentName}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Upload course readings for structured summarization, test your active recall with practice tests, or consult the Concept Tutor for step-by-step academic breakdowns.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-sm text-slate-500 font-semibold">
            <span>Sessions Done</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{plannerCompletedCount}</p>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            <span>{plannerPendingCount} upcoming on device</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-sm text-slate-500 font-semibold">
            <span>Quizzes Taken</span>
            <CheckSquare className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{quizCount}</p>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            {isCloudUser ? <Cloud className="w-3.5 h-3.5 text-blue-600" /> : <HardDrive className="w-3.5 h-3.5 text-slate-400" />}
            <span>{isCloudUser ? 'Cloud Synced Securely' : 'Saved in browser session'}</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-sm text-slate-500 font-semibold">
            <span>Average Quiz Score</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{quizCount > 0 ? `${avgScore}%` : 'N/A'}</p>
          <p className="text-xs text-slate-500">Calculated across practice sets</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-sm text-slate-500 font-semibold">
            <span>Brain Blitz Record</span>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{blitzHighScore}</p>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            <span>High score held in local storage</span>
          </div>
        </div>
      </div>

      {/* Quick Access Tools */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Active Learning Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actionCards.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.title}
                href={tool.href}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:border-slate-400 transition-all flex items-start gap-4 group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {tool.title}
                    </h3>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      {tool.badge}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {tool.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Quiz Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Examination Activity</h3>
            <p className="text-sm text-slate-500">Your latest practice tests and mastery scores</p>
          </div>
          <Link
            href="/quizzes"
            className="text-sm font-semibold text-slate-900 hover:text-blue-600 flex items-center gap-1"
          >
            <span>Take a Quiz</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recentQuizzes.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            <p>No recent quizzes logged yet.</p>
            <p className="mt-1">Generate a 5-question test in the Quizzes tab or summarize a PDF to start practicing!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-sm">
            {recentQuizzes.map((q, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 text-base">{q.topic}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    Difficulty: {q.difficulty || 'medium'} • {q.question_count} Questions
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 text-base">
                    {q.score} / {q.question_count}
                  </span>
                  <p className="text-xs text-slate-500">
                    {Math.round((q.score / q.question_count) * 100)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
