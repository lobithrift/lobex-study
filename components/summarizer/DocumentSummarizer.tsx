'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  UploadCloud,
  FileCheck,
  CheckCircle2,
  Copy,
  Check,
  CheckSquare,
  Layers,
  CalendarCheck,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Trash2,
} from 'lucide-react';
import { DocumentSummary } from '@/types';
import { getStoredSessions, saveStoredSessions } from '@/lib/storage/planner';

export function DocumentSummarizer() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const [plannerSaved, setPlannerSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 15 * 1024 * 1024) {
        setError('File size exceeds 15MB limit. Please upload a smaller excerpt.');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      if (dropped.size > 15 * 1024 * 1024) {
        setError('File size exceeds 15MB limit.');
        return;
      }
      setFile(dropped);
      setError(null);
    }
  };

  const handleSummarize = async () => {
    setIsLoading(true);
    setError(null);
    setSummary(null);

    try {
      let pdfBase64: string | undefined;
      let textContent = rawText.trim();

      if (file) {
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          const buffer = await file.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          pdfBase64 = btoa(binary);
        } else {
          textContent = await file.text();
        }
      }

      if (!pdfBase64 && !textContent) {
        throw new Error('Please select a PDF document or enter text notes to summarize.');
      }

      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textContent,
          pdfBase64,
          fileName: file?.name || 'Lecture Notes',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to summarize document.');
      }

      const data = await res.json();
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message || 'Error processing document summary.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySummary = () => {
    if (!summary) return;
    const text = `${summary.title}\n\nExecutive Synthesis:\n${summary.executiveSummary}\n\nKey Concepts:\n${summary.keyConcepts.map((k) => `• ${k.term}: ${k.definition}`).join('\n')}\n\nExam Takeaways:\n${summary.examTakeaways.map((t) => `• ${t}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToQuiz = () => {
    if (!summary) return;
    const notesPayload = `${summary.executiveSummary}\n\nKey Concepts:\n${summary.keyConcepts.map((k) => `${k.term}: ${k.definition}`).join('\n')}`;
    sessionStorage.setItem('lobex_quiz_transfer_topic', summary.title);
    sessionStorage.setItem('lobex_quiz_transfer_notes', notesPayload);
    router.push('/quizzes');
  };

  const handleSendToFlashcards = () => {
    if (!summary) return;
    const notesPayload = summary.keyConcepts.map((k) => `${k.term}: ${k.definition}`).join('\n');
    sessionStorage.setItem('lobex_flashcard_transfer_topic', summary.title);
    sessionStorage.setItem('lobex_flashcard_transfer_notes', notesPayload);
    router.push('/flashcards');
  };

  const handleAddToPlanner = () => {
    if (!summary) return;
    const sessions = getStoredSessions();
    const today = new Date().toISOString().split('T')[0];
    sessions.push({
      id: `session-sum-${Date.now()}`,
      subject: summary.title.slice(0, 30),
      topic: `Review Document Summary & High-Yield Points`,
      date: today,
      startTime: '17:00',
      durationMinutes: 45,
      completed: false,
      notes: summary.examTakeaways.slice(0, 2).join('; '),
    });
    saveStoredSessions(sessions);
    setPlannerSaved(true);
    setTimeout(() => setPlannerSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Upload & Input Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Academic Material & PDF Summarizer</h2>
              <p className="text-sm text-slate-500">
                Upload syllabus readings, lecture slides, or lecture notes for rigorous academic synthesis
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-lg text-sm font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-3.5 py-1.5 rounded-md transition-all ${
                activeTab === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Upload PDF / Document
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`px-3.5 py-1.5 rounded-md transition-all ${
                activeTab === 'paste' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Paste Notes
            </button>
          </div>
        </div>

        {activeTab === 'upload' ? (
          <div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                file
                  ? 'border-emerald-300 bg-emerald-50/20'
                  : 'border-slate-200 hover:border-slate-400 bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
              />

              {file ? (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <p className="text-base font-bold text-slate-800">{file.name}</p>
                  <p className="text-sm text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB • Ready for academic analysis
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="inline-flex items-center gap-1 text-sm text-rose-600 hover:text-rose-800 pt-1 font-semibold"
                  >
                    <Trash2 className="w-4 h-4" /> Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-base font-semibold text-slate-800">
                    Drag and drop your PDF or reading material here
                  </p>
                  <p className="text-sm text-slate-500">
                    Supports PDF, TXT, or Markdown documents (up to 15MB)
                  </p>
                  <span className="inline-block px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 shadow-xs mt-2">
                    Browse Files
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste reading material, textbook passages, or lecture transcript here..."
              rows={6}
              maxLength={40000}
              className="w-full p-4 text-sm font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed"
            />
            <div className="text-right text-xs text-slate-500 mt-1">
              {rawText.length}/40,000 characters
            </div>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSummarize}
            disabled={isLoading || (!file && !rawText.trim())}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-semibold rounded-xl text-sm transition-colors flex items-center gap-2 shadow-xs"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Extracting & Synthesizing Material...</span>
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4" />
                <span>Summarize Learning Material</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Structured Output Card */}
      {summary && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-8">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                Academic Executive Summary
              </span>
              <h2 className="text-2xl font-bold text-slate-900 mt-2">{summary.title}</h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySummary}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy Summary'}
              </button>
            </div>
          </div>

          {/* Section 1: Executive Synthesis */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
              1. Executive Academic Synthesis
            </h3>
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-base leading-relaxed whitespace-pre-line font-normal">
              {summary.executiveSummary}
            </div>
          </div>

          {/* Section 2: Key Concepts & Definitions */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
              2. Key Theoretical Concepts & Glossary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {summary.keyConcepts.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-1.5">
                  <span className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    {item.term}
                  </span>
                  <p className="text-sm text-slate-600 leading-relaxed pl-6">
                    {item.definition}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: High-Yield Exam Takeaways */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
              3. High-Yield Examination Points & Pitfalls
            </h3>
            <div className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2.5 text-sm text-slate-700">
              {summary.examTakeaways.map((point, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="leading-relaxed flex-1 text-sm">{point}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Convert Actions Toolbar */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-500">Apply this material:</span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSendToQuiz}
                className="px-4 py-2 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <span>Generate Practice Quiz</span>
              </button>

              <button
                type="button"
                onClick={handleSendToFlashcards}
                className="px-4 py-2 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Layers className="w-4 h-4 text-violet-600" />
                <span>Create Flashcards</span>
              </button>

              <button
                type="button"
                onClick={handleAddToPlanner}
                className="px-4 py-2 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <CalendarCheck className="w-4 h-4 text-blue-600" />
                <span>{plannerSaved ? 'Added to Timetable!' : 'Add to Timetable'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
