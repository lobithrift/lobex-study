'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  User,
  Shield,
  Trash2,
  Bell,
  Sliders,
  CheckCircle2,
  LogOut,
  Info,
  Download,
} from 'lucide-react';
import { usePwa } from '@/components/pwa/PwaContext';
import { ExplanationLevel } from '@/types';
import { clearStoredSessions } from '@/lib/storage/planner';
import { clearGameRecord } from '@/lib/storage/game';
import { clearStoredFlashcardDecks } from '@/lib/storage/flashcards';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { AlertBanner } from '@/components/ui/AlertBanner';

export default function SettingsPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('Alex Rivera');
  const [email, setEmail] = useState('student@lobex-study.internal');
  const [explanationLevel, setExplanationLevel] = useState<ExplanationLevel>('standard');
  const [defaultSessionDuration, setDefaultSessionDuration] = useState(45);
  const [emailReminders, setEmailReminders] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [clearedNotice, setClearedNotice] = useState('');
  const { isInstalled, isStandalone, promptInstall } = usePwa();

  useEffect(() => {
    // Load local preferences
    const savedLvl = localStorage.getItem('lobex_pref_explanation_level');
    if (savedLvl && ['simple', 'standard', 'detailed'].includes(savedLvl)) {
      setExplanationLevel(savedLvl as ExplanationLevel);
    }

    const checkUser = async () => {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email || '');
        setDisplayName(user.user_metadata?.display_name || user.email?.split('@')[0] || 'Student');
      } else {
        const demoRaw = localStorage.getItem('lobex_demo_user');
        if (demoRaw) {
          try {
            const demo = JSON.parse(demoRaw);
            setDisplayName(demo.display_name || 'Alex Rivera');
            setEmail(demo.email || 'student@lobex-study.internal');
          } catch (e) {}
        }
      }
    };

    checkUser();
  }, []);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('lobex_pref_explanation_level', explanationLevel);
    localStorage.setItem('lobex_pref_session_duration', String(defaultSessionDuration));
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleClearPlanner = () => {
    if (confirm('Clear all local study planner timetable sessions?')) {
      clearStoredSessions();
      setClearedNotice('Study planner sessions cleared from this browser.');
      setTimeout(() => setClearedNotice(''), 3000);
    }
  };

  const handleClearGameScores = () => {
    if (confirm('Clear your Brain Blitz high scores from this device?')) {
      clearGameRecord();
      setClearedNotice('Brain Blitz high scores cleared from this browser.');
      setTimeout(() => setClearedNotice(''), 3000);
    }
  };

  const handleClearFlashcards = () => {
    if (confirm('Clear your saved flashcard decks from this device?')) {
      clearStoredFlashcardDecks();
      setClearedNotice('Saved flashcard decks cleared from this browser.');
      setTimeout(() => setClearedNotice(''), 3000);
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    localStorage.removeItem('lobex_demo_user');
    router.push('/');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Settings & Privacy</h1>
        <p className="text-sm sm:text-base text-slate-500 mt-0.5">
          Manage your learning preferences, profile information, and local device storage.
        </p>
      </div>

      {savedNotice && (
        <AlertBanner type="success" message="Preferences saved successfully." />
      )}

      {clearedNotice && (
        <AlertBanner type="warning" message={clearedNotice} />
      )}

      {/* Profile & Account Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Profile Information</h2>
            <p className="text-sm text-slate-500">Your student identity and sign-in details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-300 text-sm sm:text-base focus:ring-2 focus:ring-indigo-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 text-sm sm:text-base text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Learning Preferences Form */}
      <form onSubmit={handleSavePreferences} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Learning Preferences</h2>
            <p className="text-sm text-slate-500">Configure default AI explanation depths and study duration</p>
          </div>
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Default AI Tutor Explanation Depth
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['simple', 'standard', 'detailed'] as ExplanationLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setExplanationLevel(lvl)}
                  className={`p-3.5 rounded-xl border text-left capitalize transition-all ${
                    explanationLevel === lvl
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold ring-2 ring-indigo-600/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-bold text-sm sm:text-base">{lvl}</p>
                  <p className="text-xs text-slate-500 font-normal mt-0.5">
                    {lvl === 'simple'
                      ? 'Everyday analogies'
                      : lvl === 'standard'
                      ? 'Structured bullet points'
                      : 'Deep academic theory'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Default Planner Session Length
            </label>
            <select
              value={defaultSessionDuration}
              onChange={(e) => setDefaultSessionDuration(Number(e.target.value))}
              className="w-full p-3 rounded-lg border border-slate-300 bg-white text-sm sm:text-base"
            >
              <option value={25}>25 Minutes (Pomodoro)</option>
              <option value={45}>45 Minutes (Recommended standard)</option>
              <option value={60}>60 Minutes (Deep study block)</option>
            </select>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={emailReminders}
                onChange={(e) => setEmailReminders(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span className="font-medium text-slate-700 text-sm">
                Receive study timetable reminders via email (optional Resend integration)
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-colors"
          >
            Save Learning Preferences
          </button>
        </div>
      </form>

      {/* App Installation & Home Screen */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Add to Home Screen & Offline Mode</h2>
              <p className="text-sm text-slate-500">
                Install as a standalone web application for one-tap launch and offline revision
              </p>
            </div>
          </div>
          <span
            className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-semibold ${
              isInstalled || isStandalone
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
            }`}
          >
            {isInstalled || isStandalone ? 'Installed & Standalone' : 'Web Version'}
          </span>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          Lobex Study can be installed directly onto your iPhone, iPad, Android phone, tablet, Mac, or Windows PC. Enjoy full-screen study sessions, rapid active recall access, and cached offline flashcard and Brain Blitz practice.
        </p>

        <div className="pt-1">
          <button
            type="button"
            onClick={promptInstall}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-all shadow-xs flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{isInstalled || isStandalone ? 'View App Details & Reinstall' : 'Install / Add to Home Screen'}</span>
          </button>
        </div>
      </div>

      {/* Privacy and Local Device Data */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Privacy & Local Storage</h2>
            <p className="text-sm text-slate-500">
              Clear browser-held records or disconnect your session safely
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          Lobex-Study minimizes data collection. Your pasted notes are never used for model training or permanently archived by default. Planner sessions and Brain Blitz scores remain strictly inside your browser unless explicitly cleared.
        </p>

        <div className="flex flex-wrap gap-3 pt-2 text-sm">
          <button
            type="button"
            onClick={handleClearPlanner}
            className="px-4 py-2 border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            Clear Planner Sessions
          </button>

          <button
            type="button"
            onClick={handleClearGameScores}
            className="px-4 py-2 border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            Reset Brain Blitz Scores
          </button>

          <button
            type="button"
            onClick={handleClearFlashcards}
            className="px-4 py-2 border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            Clear Saved Flashcard Decks
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl transition-colors flex items-center gap-1.5 ml-auto"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
