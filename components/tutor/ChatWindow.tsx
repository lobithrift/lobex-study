'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  User,
  Send,
  RotateCcw,
  Flag,
  Copy,
  Check,
  AlertTriangle,
  Lightbulb,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { ChatMessage, ExplanationLevel } from '@/types';

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [level, setLevel] = useState<ExplanationLevel>('standard');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [reportModal, setReportModal] = useState<{ query: string; response: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const starterPrompts = [
    'Explain the biochemical mechanisms of Photosynthesis',
    "How does Newton's Third Law apply to rocket propulsion momentum?",
    'Derive the difference between Mitosis and Meiosis phases',
    'Explain the fundamental theorem of calculus with examples',
  ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          level,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'The tutor service encountered an error. Please retry.');
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        explanationLevel: level,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err.message || 'Network error connecting to tutor service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const submitReport = async () => {
    if (!reportModal || !reportReason.trim()) return;

    try {
      await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'report',
          query: reportModal.query,
          response: reportModal.response,
          reason: reportReason,
        }),
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setReportModal(null);
        setReportReason('');
      }, 1500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-[750px] max-h-[85vh] bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Header with Depth Controls */}
      <div className="p-4 border-b border-slate-200/80 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Academic Concept Tutor</h2>
            <p className="text-sm text-slate-500">Curriculum-aligned explanations without fluff or jargon</p>
          </div>
        </div>

        {/* Explanation Depth Toggle */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-sm shadow-2xs">
          <span className="text-slate-400 px-2 font-medium">Depth:</span>
          {(['simple', 'standard', 'detailed'] as ExplanationLevel[]).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setLevel(lvl)}
              className={`px-3 py-1 rounded-md font-semibold capitalize transition-all ${
                level === lvl
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Reference Notice & Link to Summarizer */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span>Need to study lecture materials or a textbook PDF first?</span>
          <Link href="/summarizer" className="text-slate-900 underline font-semibold hover:text-blue-600">
            Open Material Summarizer
          </Link>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-sm text-slate-400 hover:text-slate-700 underline font-medium ml-2"
          >
            Clear conversation
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center mb-3">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">What academic concept are you studying?</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Ask any specific question or request a step-by-step breakdown. The tutor provides precise mathematical and theoretical explanations.
            </p>

            <div className="w-full space-y-2 text-left">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Curriculum topics:</p>
              {starterPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  className="w-full p-3 text-sm text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg text-left transition-colors flex items-center justify-between"
                >
                  <span>{prompt}</span>
                  <BookOpen className="w-3.5 h-3.5 text-slate-400 ml-2 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden p-1 shadow-2xs">
                  <img src="/logo.png" alt="Lobex Study" className="w-full h-full object-contain" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 sm:p-5 text-sm sm:text-base leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-slate-900 text-white rounded-br-xs'
                    : 'bg-slate-50 text-slate-900 rounded-bl-xs border border-slate-200/90 shadow-2xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {m.role === 'assistant' && (
                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                    <span className="text-xs capitalize text-slate-500 font-medium">
                      Depth: {m.explanationLevel || 'standard'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(m.id, m.content)}
                        className="hover:text-slate-800 p-1 rounded"
                        title="Copy text"
                        aria-label="Copy text"
                      >
                        {copiedId === m.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          const lastUser = [...messages].reverse().find((x) => x.role === 'user');
                          setReportModal({
                            query: lastUser?.content || 'User question',
                            response: m.content,
                          });
                        }}
                        className="hover:text-rose-600 p-1 rounded"
                        title="Flag inaccurate output for review"
                        aria-label="Report response"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden p-1 shadow-2xs">
              <img src="/logo.png" alt="Lobex Study" className="w-full h-full object-contain" />
            </div>
            <div className="bg-slate-50 rounded-2xl rounded-bl-xs p-3.5 text-xs text-slate-600 border border-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse delay-150" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse delay-300" />
              <span className="text-slate-500 ml-1">Consulting curriculum model...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => handleSend()}
              className="inline-flex items-center gap-1 font-semibold text-rose-700 hover:text-rose-900 underline ml-2"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-slate-200/80 bg-white"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your academic inquiry or ask for a derivation..."
            disabled={isLoading}
            maxLength={2000}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm sm:text-base placeholder:text-slate-400 disabled:opacity-60"
            aria-label="Academic inquiry input"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 shadow-2xs"
          >
            <span>Send</span>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Report Modal */}
      {reportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-sm">
            <h3 className="text-base font-bold text-slate-900 mb-1">Flag Academic Inaccuracy</h3>
            <p className="text-sm text-slate-500 mb-4">
              Help maintain curriculum rigor by flagging factual or formula errors.
            </p>

            {reportSuccess ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-center font-medium">
                Submitted to verification queue.
              </div>
            ) : (
              <>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description of error:
                </label>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="e.g. Factual inconsistency, incorrect equation, or flawed boundary condition..."
                  rows={3}
                  className="w-full p-3 rounded-lg border border-slate-300 mb-3 focus:ring-2 focus:ring-slate-900 focus:outline-none text-sm"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReportModal(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitReport}
                    disabled={!reportReason.trim()}
                    className="px-4 py-2 font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm"
                  >
                    Submit Report
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
