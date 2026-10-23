'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  Trash2,
  Edit2,
  Calendar,
  AlertCircle,
  RefreshCw,
  Bell,
  BellRing,
  Mail,
  Send,
  Check,
  X,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import { StudySession } from '@/types';
import {
  getStoredSessions,
  saveStoredSessions,
  clearStoredSessions,
  generateTimetablePlan,
} from '@/lib/storage/planner';
import { AlertBanner } from '@/components/ui/AlertBanner';

interface ReminderSettings {
  desktopEnabled: boolean;
  emailEnabled: boolean;
  studentEmail: string;
  leadTimeMinutes: number;
}

export function PlannerCalendar() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Filter state
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  // Generator modal state
  const [showGenModal, setShowGenModal] = useState(false);
  const [genSubjects, setGenSubjects] = useState('Biology, Mathematics, History');
  const [genExamDate, setGenExamDate] = useState('');
  const [genDaysPerWeek, setGenDaysPerWeek] = useState(4);
  const [genDuration, setGenDuration] = useState(45);

  // Manual Add/Edit modal state
  const [editModal, setEditModal] = useState<{
    open: boolean;
    session?: StudySession;
  }>({ open: false });
  const [editSubject, setEditSubject] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('16:00');
  const [editDuration, setEditDuration] = useState(45);
  const [editNotes, setEditNotes] = useState('');

  // Confirmation dialog
  const [confirmClear, setConfirmClear] = useState(false);

  // Automatic Study Reminder state
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({
    desktopEnabled: true,
    emailEnabled: true,
    studentEmail: 'student@example.edu',
    leadTimeMinutes: 10,
  });
  const [activeAlertSession, setActiveAlertSession] = useState<StudySession | null>(null);
  const [notifiedKeys, setNotifiedKeys] = useState<Record<string, boolean>>({});
  const [reminderToast, setReminderToast] = useState<string | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    const list = getStoredSessions();
    setSessions(list);
    setIsLoaded(true);

    // Default exam date set to 3 weeks ahead
    const threeWeeks = new Date();
    threeWeeks.setDate(threeWeeks.getDate() + 21);
    setGenExamDate(threeWeeks.toISOString().split('T')[0]);

    // Load reminder preferences
    if (typeof window !== 'undefined') {
      const savedReminders = localStorage.getItem('lobex_study_reminders_v1');
      if (savedReminders) {
        try {
          setReminderSettings(JSON.parse(savedReminders));
        } catch (e) {}
      } else {
        const demoUser = localStorage.getItem('lobex_demo_user');
        if (demoUser) {
          try {
            const parsed = JSON.parse(demoUser);
            if (parsed.email) {
              setReminderSettings((prev) => ({ ...prev, studentEmail: parsed.email }));
            }
          } catch (e) {}
        }
      }
    }
  }, []);

  const saveReminders = (newSettings: ReminderSettings) => {
    setReminderSettings(newSettings);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lobex_study_reminders_v1', JSON.stringify(newSettings));
    }
  };

  const dispatchSessionReminder = async (s: StudySession, isManual = false) => {
    setActiveAlertSession(s);

    // 1. Browser Notification
    if (reminderSettings.desktopEnabled && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(`⏰ Study Time Reminder: ${s.subject}`, {
            body: `It's time to study ${s.topic} (${s.durationMinutes} min). Scheduled at ${s.startTime}.`,
            icon: '/logo.png',
          });
        } catch (e) {
          console.warn('Notification error:', e);
        }
      } else if (isManual && Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification(`⏰ Study Time Reminder: ${s.subject}`, {
            body: `It's time to study ${s.topic} (${s.durationMinutes} min). Scheduled at ${s.startTime}.`,
            icon: '/logo.png',
          });
        }
      }
    }

    // 2. Email Notification via /api/email
    if (reminderSettings.emailEnabled && reminderSettings.studentEmail) {
      try {
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: reminderSettings.studentEmail.trim(),
            subject: `⏰ Study Reminder: ${s.subject} - ${s.topic}`,
            content: `Hello! Here is your automated study session reminder from Lobex Study.\n\n` +
              `Scheduled Revision Session:\n` +
              `• Subject: ${s.subject}\n` +
              `• Topic: ${s.topic}\n` +
              `• Scheduled Time: ${s.startTime} (${s.durationMinutes} minutes)\n` +
              `• Date: ${s.date}\n` +
              `${s.notes ? `• Objectives: ${s.notes}\n` : ''}\n` +
              `Access your active recall flashcards, practice quizzes, or concept tutor now:\n` +
              `http://localhost:3000/dashboard\n\n` +
              `Happy studying!`,
          }),
        });
      } catch (err) {
        console.warn('Email dispatch error:', err);
      }
    }

    setReminderToast(`Automatic reminder message sent for ${s.subject}!`);
    setTimeout(() => setReminderToast(null), 4500);
  };

  // Background reminder timer checking every 30 seconds
  useEffect(() => {
    const checkReminders = () => {
      if (sessions.length === 0) return;
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      sessions.forEach((s) => {
        if (s.completed || s.date !== today) return;

        const [h, m] = s.startTime.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return;
        const sessionStartMinutes = h * 60 + m;
        const diffMinutes = sessionStartMinutes - currentMinutes;

        // Trigger if within lead time or currently underway
        if (diffMinutes <= reminderSettings.leadTimeMinutes && diffMinutes >= -s.durationMinutes) {
          const key = `${s.id}_${s.date}`;
          if (!notifiedKeys[key]) {
            setNotifiedKeys((prev) => ({ ...prev, [key]: true }));
            dispatchSessionReminder(s, false);
          }
        }
      });
    };

    checkReminders();
    const timer = setInterval(checkReminders, 30000);
    return () => clearInterval(timer);
  }, [sessions, reminderSettings, notifiedKeys]);

  const updateAndSave = (updated: StudySession[]) => {
    setSessions(updated);
    saveStoredSessions(updated);
  };

  const handleToggleComplete = (id: string) => {
    const updated = sessions.map((s) => {
      if (s.id === id) {
        const nextCompleted = !s.completed;
        return {
          ...s,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : undefined,
        };
      }
      return s;
    });
    updateAndSave(updated);
  };

  const handleDeleteSession = (id: string) => {
    const updated = sessions.filter((s) => s.id !== id);
    updateAndSave(updated);
  };

  const handleGenerateTimetable = (e: React.FormEvent) => {
    e.preventDefault();
    const subjectsArray = genSubjects
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (subjectsArray.length === 0) return;

    const newTimetable = generateTimetablePlan({
      subjects: subjectsArray,
      examDate: genExamDate,
      daysPerWeek: Number(genDaysPerWeek),
      sessionDuration: Number(genDuration),
    });

    updateAndSave(newTimetable);
    setShowGenModal(false);
  };

  const openAddModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditSubject('');
    setEditTopic('');
    setEditDate(today);
    setEditTime('16:00');
    setEditDuration(45);
    setEditNotes('');
    setEditModal({ open: true });
  };

  const openEditModal = (s: StudySession) => {
    setEditSubject(s.subject);
    setEditTopic(s.topic);
    setEditDate(s.date);
    setEditTime(s.startTime);
    setEditDuration(s.durationMinutes);
    setEditNotes(s.notes || '');
    setEditModal({ open: true, session: s });
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSubject.trim() || !editTopic.trim() || !editDate) return;

    if (editModal.session) {
      // Edit existing
      const updated = sessions.map((s) =>
        s.id === editModal.session?.id
          ? {
              ...s,
              subject: editSubject.trim(),
              topic: editTopic.trim(),
              date: editDate,
              startTime: editTime,
              durationMinutes: Number(editDuration),
              notes: editNotes.trim(),
            }
          : s
      );
      updateAndSave(updated);
    } else {
      // Add new
      const newSession: StudySession = {
        id: `custom-session-${Date.now()}`,
        subject: editSubject.trim(),
        topic: editTopic.trim(),
        date: editDate,
        startTime: editTime,
        durationMinutes: Number(editDuration),
        completed: false,
        notes: editNotes.trim(),
      };
      updateAndSave([...sessions, newSession]);
    }

    setEditModal({ open: false });
  };

  const handleClearAll = () => {
    clearStoredSessions();
    setSessions([]);
    setConfirmClear(false);
  };

  const uniqueSubjects = Array.from(new Set(sessions.map((s) => s.subject)));
  const filteredSessions = subjectFilter === 'all'
    ? sessions
    : sessions.filter((s) => s.subject === subjectFilter);

  const completedCount = sessions.filter((s) => s.completed).length;
  const pendingCount = sessions.length - completedCount;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {reminderToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <BellRing className="w-5 h-5 text-amber-300" />
          <span>{reminderToast}</span>
        </div>
      )}

      {/* Active Session Reminder Banner */}
      {activeAlertSession && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-950 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-200/70 text-amber-900 flex items-center justify-center flex-shrink-0 font-bold">
              <BellRing className="w-6 h-6 text-amber-800 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-amber-700">
                Scheduled Study Time Alert
              </p>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Time to study: {activeAlertSession.subject} — {activeAlertSession.topic} ({activeAlertSession.startTime}, {activeAlertSession.durationMinutes} min)
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/flashcards"
              className="px-4 py-2 text-sm font-semibold bg-white hover:bg-slate-50 text-slate-900 border border-amber-300 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <BookOpen className="w-4 h-4" />
              Flashcards
            </Link>
            <Link
              href="/quizzes"
              className="px-4 py-2 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              Practice Quiz
            </Link>
            <button
              onClick={() => setActiveAlertSession(null)}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
              title="Dismiss alert"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Banner & Local Storage Disclaimer */}
      <AlertBanner
        type="info"
        title="Automated Study Schedule & Local Storage"
        message="Your study timetable runs locally in this browser. When active, automatic study reminders will trigger desktop alerts and notification messages for your upcoming sessions."
      />

      {/* Control Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
              <CalendarCheck className="w-6 h-6 text-slate-700" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Study Timetable & Planner</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {sessions.length} scheduled sessions • {completedCount} completed • {pendingCount} upcoming
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReminderModal(true)}
              className={`px-3.5 py-2 text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors border shadow-2xs ${
                reminderSettings.desktopEnabled || reminderSettings.emailEnabled
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title="Configure study reminders"
            >
              <Bell className="w-4 h-4 text-amber-700" />
              <span>Reminders</span>
            </button>
            <button
              onClick={() => setShowGenModal(true)}
              className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center gap-2 shadow-2xs transition-colors"
            >
              <CalendarCheck className="w-4 h-4" />
              Build Timetable Plan
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Session
            </button>
            {sessions.length > 0 && (
              <button
                onClick={() => setConfirmClear(true)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                title="Clear timetable"
                aria-label="Clear timetable"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Subject Filter Bar */}
        {uniqueSubjects.length > 1 && (
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 text-sm">
            <span className="text-slate-400 font-medium">Filter by subject:</span>
            <button
              onClick={() => setSubjectFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                subjectFilter === 'all'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({sessions.length})
            </button>
            {uniqueSubjects.map((sub) => (
              <button
                key={sub}
                onClick={() => setSubjectFilter(sub)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  subjectFilter === sub
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sessions Timetable List */}
      <div className="space-y-3">
        {filteredSessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No study sessions scheduled yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Use our AI timetable generator to organize your study week automatically, or add a custom session manually.
            </p>
            <button
              onClick={() => setShowGenModal(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              Build Study Schedule
            </button>
          </div>
        ) : (
          filteredSessions
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((s) => (
              <div
                key={s.id}
                className={`p-4 rounded-xl border bg-white shadow-xs flex flex-wrap items-center justify-between gap-3 transition-all ${
                  s.completed ? 'opacity-70 border-emerald-200 bg-emerald-50/20' : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(s.id)}
                    className="mt-0.5 text-slate-400 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
                    aria-label={s.completed ? 'Mark incomplete' : 'Mark completed'}
                  >
                    {s.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                        {s.subject}
                      </span>
                      <span className="text-sm font-medium text-slate-600 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {s.date} at {s.startTime}
                      </span>
                      <span className="text-sm text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {s.durationMinutes} min
                      </span>
                    </div>

                    <h4
                      className={`text-base sm:text-lg font-bold mt-1.5 ${
                        s.completed ? 'line-through text-slate-500' : 'text-slate-900'
                      }`}
                    >
                      {s.topic}
                    </h4>

                    {s.notes && (
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">{s.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    onClick={() => dispatchSessionReminder(s, true)}
                    className="p-2 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors"
                    title="Send study reminder message"
                    aria-label="Send study reminder message"
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(s)}
                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                    title="Edit session"
                    aria-label="Edit session"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSession(s.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Delete session"
                    aria-label="Delete session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Auto-Generate Timetable Modal */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 bg-slate-100 text-slate-800 rounded-lg">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Personalized Timetable Generator</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Enter your subjects and exam date to automatically calculate an organized study schedule.
            </p>

            <form onSubmit={handleGenerateTimetable} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Subjects <span className="text-slate-400 font-normal">(Comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={genSubjects}
                  onChange={(e) => setGenSubjects(e.target.value)}
                  placeholder="e.g. Physics, Chemistry, Calculus, World History"
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Exam or Deadline Date</label>
                <input
                  type="date"
                  value={genExamDate}
                  onChange={(e) => setGenExamDate(e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Study Days per Week</label>
                  <select
                    value={genDaysPerWeek}
                    onChange={(e) => setGenDaysPerWeek(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value={3}>3 Days (Mon / Wed / Fri)</option>
                    <option value={4}>4 Days (Mon / Tue / Thu / Sat)</option>
                    <option value={5}>5 Days (Weekdays)</option>
                    <option value={6}>6 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Session Duration</label>
                  <select
                    value={genDuration}
                    onChange={(e) => setGenDuration(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value={25}>25 Minutes (Pomodoro)</option>
                    <option value={45}>45 Minutes (Standard)</option>
                    <option value={60}>60 Minutes (Deep Work)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowGenModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                >
                  Build Timetable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Session Modal */}
      {editModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-sm">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              {editModal.session ? 'Edit Study Session' : 'Add Custom Study Session'}
            </h3>

            <form onSubmit={handleSaveModal} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder="e.g. Mathematics"
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Topic / Objective</label>
                <input
                  type="text"
                  value={editTopic}
                  onChange={(e) => setEditTopic(e.target.value)}
                  placeholder="e.g. Integral Calculus practice problems"
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Duration (Minutes)</label>
                <select
                  value={editDuration}
                  onChange={(e) => setEditDuration(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value={25}>25 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                  <option value={90}>90 min</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Checklist</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Finish textbook exercises 4 to 8..."
                  rows={2}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModal({ open: false })}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                >
                  Save Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-center">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Reset Study Timetable?</h3>
            <p className="text-xs text-slate-500 mb-4">
              This will remove all current study sessions stored in this browser. This action cannot be undone.
            </p>
            <div className="flex justify-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Keep Sessions
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-4 py-2 font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Settings & Trigger Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
                  <BellRing className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Study Reminder Settings</h3>
                  <p className="text-xs text-slate-500">Automatic notifications when it is time to study</p>
                </div>
              </div>
              <button
                onClick={() => setShowReminderModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Desktop notification toggle */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Browser Desktop Alerts</span>
                  <input
                    type="checkbox"
                    checked={reminderSettings.desktopEnabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      saveReminders({ ...reminderSettings, desktopEnabled: enabled });
                      if (enabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                        Notification.requestPermission();
                      }
                    }}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Sends system desktop popups at scheduled study session times.
                </p>
              </div>

              {/* Email reminder toggle */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Automatic Email Reminders</span>
                  <input
                    type="checkbox"
                    checked={reminderSettings.emailEnabled}
                    onChange={(e) => saveReminders({ ...reminderSettings, emailEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                  />
                </div>
                <label className="block text-sm font-semibold text-slate-700 mt-2">
                  Student Email Address
                </label>
                <input
                  type="email"
                  value={reminderSettings.studentEmail}
                  onChange={(e) => saveReminders({ ...reminderSettings, studentEmail: e.target.value })}
                  placeholder="student@example.edu"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              {/* Lead time selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 text-sm">
                  Reminder Advance Warning
                </label>
                <select
                  value={reminderSettings.leadTimeMinutes}
                  onChange={(e) => saveReminders({ ...reminderSettings, leadTimeMinutes: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value={0}>At scheduled time (0 minutes)</option>
                  <option value={5}>5 minutes before</option>
                  <option value={10}>10 minutes before (Recommended)</option>
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before</option>
                </select>
              </div>

              {/* Test button */}
              <button
                type="button"
                onClick={async () => {
                  setIsSendingTest(true);
                  const demoSession = sessions[0] || {
                    id: 'test-session',
                    subject: 'Academic Study Session',
                    topic: 'Active Recall Revision',
                    date: new Date().toISOString().split('T')[0],
                    startTime: '16:00',
                    durationMinutes: 45,
                    completed: false,
                    notes: 'Practice key definitions and take examination quiz.',
                  };
                  await dispatchSessionReminder(demoSession, true);
                  setIsSendingTest(false);
                }}
                disabled={isSendingTest}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 border border-slate-200 transition-colors"
              >
                {isSendingTest ? (
                  <span className="w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 text-slate-700" />
                    <span>Send Test Study Reminder Now</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowReminderModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-colors shadow-2xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
