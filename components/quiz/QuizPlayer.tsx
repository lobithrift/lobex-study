'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  CheckSquare,
  XCircle,
  HelpCircle,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Trophy,
  Sliders,
  Send,
  Save,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileCheck,
  Trash2,
  Paperclip,
} from 'lucide-react';
import { DifficultyLevel, QuizQuestion } from '@/types';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { extractEducationalFile, ExtractedFileResult } from '@/lib/utils/fileExtractor';

export function QuizPlayer() {
  // Generator form state
  const [topic, setTopic] = useState('Cell Biology & Photosynthesis');
  const [notes, setNotes] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File upload state for educational material (PDF, docx, images, notes)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileResult, setFileResult] = useState<ExtractedFileResult | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check transferred notes from Summarizer
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const transferredTopic = sessionStorage.getItem('lobex_quiz_transfer_topic');
      const transferredNotes = sessionStorage.getItem('lobex_quiz_transfer_notes');
      if (transferredTopic) {
        setTopic(transferredTopic);
        sessionStorage.removeItem('lobex_quiz_transfer_topic');
      }
      if (transferredNotes) {
        setNotes(transferredNotes);
        sessionStorage.removeItem('lobex_quiz_transfer_notes');
      }
    }
  }, []);

  // Active quiz state
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [savedToDb, setSavedToDb] = useState(false);

  const handleFileUpload = async (file: File) => {
    setIsProcessingFile(true);
    setError(null);
    try {
      const res = await extractEducationalFile(file);
      if (res.error) {
        setError(res.error);
        return;
      }
      setUploadedFile(file);
      setFileResult(res);

      // Auto-set topic if generic or default
      if (!topic || topic === 'Cell Biology & Photosynthesis') {
        const cleanName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
        setTopic(cleanName);
      }

      // If text was extracted from docx or text file, populate notes
      if (res.extractedText) {
        setNotes(res.extractedText.slice(0, 15000));
      }
    } catch (err: any) {
      setError(err.message || 'Error processing uploaded material.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      handleFileUpload(dropped);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFileResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);
    setQuestions(null);
    setSelectedAnswers({});
    setIsSubmitted(false);
    setCurrentIdx(0);
    setSavedToDb(false);

    try {
      const payload: any = {
        topic: topic.trim(),
        notes: (fileResult?.extractedText || notes).trim(),
        questionCount: Number(questionCount),
        difficulty,
      };

      if (fileResult?.fileData) {
        payload.fileData = fileResult.fileData;
      }

      const res = await fetch('/api/ai/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate quiz. Please check options.');
      }

      const data = await res.json();
      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('Received empty question set from generator.');
      }

      setQuestions(data.questions);
    } catch (err: any) {
      setError(err.message || 'Unable to generate quiz. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectOption = (qIdx: number, optIdx: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const calculateScore = () => {
    if (!questions) return 0;
    let score = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) {
        score++;
      }
    });
    return score;
  };

  const handleSubmit = async () => {
    if (!questions) return;
    setIsSubmitted(true);

    // Record quiz attempt to Supabase if authenticated
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const finalScore = calculateScore();
        await supabase.from('quiz_attempts').insert({
          user_id: user.id,
          topic,
          difficulty,
          question_count: questions.length,
          score: finalScore,
        });
        setSavedToDb(true);
      } else {
        // Save to local storage for guests
        const localAttempts = JSON.parse(localStorage.getItem('lobex_guest_quizzes') || '[]');
        localAttempts.unshift({
          topic,
          difficulty,
          question_count: questions.length,
          score: calculateScore(),
          completed_at: new Date().toISOString(),
        });
        localStorage.setItem('lobex_guest_quizzes', JSON.stringify(localAttempts.slice(0, 10)));
      }
    } catch (err) {
      console.warn('Could not record quiz attempt:', err);
    }
  };

  const score = calculateScore();
  const total = questions?.length || 0;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Quiz Generator Setup Card */}
      {!questions && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 max-w-3xl mx-auto">
          <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-100">
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
              <Sliders className="w-6 h-6 text-slate-700" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Generate Practice Examination</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Upload learning materials, PDFs, Word docs, images or paste course notes for grounded exam questions
              </p>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label htmlFor="quiz-topic" className="block text-sm font-semibold text-slate-800 mb-1.5">
                Topic or Subject <span className="text-rose-500">*</span>
              </label>
              <input
                id="quiz-topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Cellular Respiration, Calculus Derivatives, WW1 Causes"
                required
                maxLength={200}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Reading Material & Document Upload Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-800">
                  Upload Reading Material & Educational Documents
                </label>
                <span className="text-xs text-slate-400 font-medium">PDF, Word (.docx), Images, Notes (up to 25MB)</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md,image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
                className="hidden"
                id="quiz-file-upload"
              />

              {!uploadedFile ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDropFile}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-slate-800 hover:bg-slate-50/50 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                    {isProcessingFile ? (
                      <span className="w-5 h-5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <UploadCloud className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {isProcessingFile ? 'Analyzing & extracting content...' : 'Click or drag educational files here'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Accepts PDF textbooks, Word (.docx) lecture transcripts, formula diagrams/images, or markdown notes
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                      {fileResult?.fileType === 'pdf' ? (
                        <FileText className="w-5 h-5 text-rose-600" />
                      ) : fileResult?.fileType === 'docx' ? (
                        <FileText className="w-5 h-5 text-blue-600" />
                      ) : fileResult?.fileType === 'image' ? (
                        <ImageIcon className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <FileCheck className="w-5 h-5 text-slate-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{uploadedFile.name}</span>
                        <span className="px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-slate-200 text-slate-700">
                          {fileResult?.fileType === 'pdf'
                            ? 'Multimodal PDF'
                            : fileResult?.fileType === 'docx'
                            ? 'Word Document (Extracted)'
                            : fileResult?.fileType === 'image'
                            ? 'Visual Diagram / Image'
                            : 'Text Document'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                        {fileResult?.extractedText && ` • ${fileResult.extractedText.split(/\s+/).length} words parsed`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="quiz-notes" className="block text-sm font-semibold text-slate-800">
                  Pasted Course Notes <span className="text-slate-400 font-normal">(Optional or Extracted)</span>
                </label>
                <span className="text-xs text-slate-400">{notes.length}/15000 chars</span>
              </div>
              <textarea
                id="quiz-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste revision notes or lecture summaries, or upload a file above to base questions strictly on your course syllabus..."
                rows={4}
                maxLength={15000}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono text-sm sm:text-base leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Question Count
                </label>
                <div className="flex gap-2">
                  {[3, 5, 10].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setQuestionCount(cnt)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                        questionCount === cnt
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {cnt} Questions
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Difficulty Level
                </label>
                <div className="flex gap-2">
                  {(['easy', 'medium', 'difficult'] as DifficultyLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDifficulty(lvl)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize border transition-all ${
                        difficulty === lvl
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <AlertBanner
              type="ai"
              message="Practice questions are synthesized directly from your topic and uploaded materials to test active recall."
            />

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !topic.trim()}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-semibold rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing Exam Questions...</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4" />
                  <span>Generate Examination Quiz</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Active Quiz Card */}
      {questions && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
          {/* Quiz Header Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                  {difficulty}
                </span>
                <span className="text-sm text-slate-500">• {questions.length} Questions</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">{topic}</h2>
            </div>

            <button
              onClick={() => {
                setQuestions(null);
                setSelectedAnswers({});
                setIsSubmitted(false);
              }}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              New Quiz
            </button>
          </div>

          {/* Submitted Score Summary Card */}
          {isSubmitted && (
            <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 text-white shadow-md text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-white/10 mb-1">
                <Trophy className="w-8 h-8 text-amber-300" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                You scored {score} / {total} ({percentage}%)
              </h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                {percentage >= 80
                  ? 'Outstanding mastery of this topic! Keep practicing to retain your edge.'
                  : percentage >= 50
                  ? 'Good foundation! Review the explanations below to patch weak spots.'
                  : 'Needs revision. Review each concept and explanation carefully below.'}
              </p>
              {savedToDb ? (
                <div className="text-xs bg-white/20 inline-block px-3 py-1 rounded-full text-slate-100 font-medium">
                  ✓ Recorded to your profile history
                </div>
              ) : (
                <div className="text-xs bg-white/20 inline-block px-3 py-1 rounded-full text-slate-100 font-medium">
                  Saved to local session
                </div>
              )}
            </div>
          )}

          {/* Question List or Step-by-Step Viewer */}
          <div className="space-y-8">
            {questions.map((q, qIndex) => {
              const userAnswer = selectedAnswers[qIndex];
              const isAnswered = userAnswer !== undefined;
              const isCorrect = userAnswer === q.correctAnswer;

              return (
                <div
                  key={q.id || qIndex}
                  className={`p-6 rounded-2xl border transition-all ${
                    isSubmitted
                      ? isCorrect
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : 'border-rose-200 bg-rose-50/30'
                      : 'border-slate-200 bg-slate-50/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Question {qIndex + 1} of {questions.length}
                    </span>
                    {isSubmitted && (
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                          isCorrect
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isCorrect ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" /> Correct
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" /> Incorrect
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4">{q.question}</h3>

                  {/* 4 Choices */}
                  <div className="grid grid-cols-1 gap-3">
                    {q.options.map((option, optIdx) => {
                      const isOptionSelected = userAnswer === optIdx;
                      const isOptionCorrect = q.correctAnswer === optIdx;

                      let btnStyle = 'border-slate-200 bg-white hover:border-slate-400 text-slate-800';

                      if (isSubmitted) {
                        if (isOptionCorrect) {
                          btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold';
                        } else if (isOptionSelected && !isOptionCorrect) {
                          btnStyle = 'border-rose-500 bg-rose-50 text-rose-900 line-through';
                        } else {
                          btnStyle = 'border-slate-200 bg-slate-50 text-slate-400 opacity-60';
                        }
                      } else if (isOptionSelected) {
                        btnStyle = 'border-slate-900 bg-slate-100 text-slate-900 font-bold ring-2 ring-slate-900/10';
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => selectOption(qIndex, optIdx)}
                          disabled={isSubmitted}
                          className={`w-full text-left p-4 rounded-xl border text-sm sm:text-base flex items-center justify-between transition-all ${btnStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                                isOptionSelected
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{option}</span>
                          </div>
                          {isSubmitted && isOptionCorrect && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation after submission */}
                  {isSubmitted && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200 text-sm text-slate-700 space-y-1.5">
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-slate-700" />
                        Explanation:
                      </p>
                      <p className="leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
            {!isSubmitted ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={Object.keys(selectedAnswers).length === 0}
                className="w-full sm:w-auto px-8 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold rounded-xl text-base transition-colors shadow-2xs ml-auto"
              >
                Submit Answers ({Object.keys(selectedAnswers).length}/{questions.length} answered)
              </button>
            ) : (
              <div className="w-full flex justify-between items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAnswers({});
                    setIsSubmitted(false);
                  }}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry Same Quiz
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuestions(null);
                    setSelectedAnswers({});
                    setIsSubmitted(false);
                  }}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center gap-2 shadow-2xs transition-colors"
                >
                  <CheckSquare className="w-4 h-4" />
                  Generate Different Quiz
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
