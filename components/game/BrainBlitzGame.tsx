'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  BrainCircuit,
  Play,
  Pause,
  RotateCcw,
  Trophy,
  Zap,
  Timer,
  CheckCircle2,
  XCircle,
  Award,
  Flame,
  UploadCloud,
  FileText,
  FileCheck,
  ImageIcon,
  Trash2,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { BrainBlitzQuestion, BrainBlitzRecord } from '@/types';
import {
  DEFAULT_BRAIN_BLITZ_QUESTIONS,
  getStoredGameRecord,
  saveGameRecord,
} from '@/lib/storage/game';
import { extractEducationalFile, ExtractedFileResult } from '@/lib/utils/fileExtractor';
import { AlertBanner } from '@/components/ui/AlertBanner';

export function BrainBlitzGame() {
  const TOTAL_TIME = 60; // 60-second rapid-fire round

  // Game state
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'finished'>('idle');
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [questions, setQuestions] = useState<BrainBlitzQuestion[]>([]);
  const [lastAnswerStatus, setLastAnswerStatus] = useState<'correct' | 'wrong' | null>(null);
  const [record, setRecord] = useState<BrainBlitzRecord>({
    highScore: 0,
    totalGames: 0,
    bestStreak: 0,
    lastPlayed: '',
  });

  // Custom study material state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileResult, setFileResult] = useState<ExtractedFileResult | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [customTopic, setCustomTopic] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [customQuestions, setCustomQuestions] = useState<BrainBlitzQuestion[] | null>(null);
  const [activeMaterialTitle, setActiveMaterialTitle] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load record on mount
  useEffect(() => {
    setRecord(getStoredGameRecord());
    setQuestions([...DEFAULT_BRAIN_BLITZ_QUESTIONS].sort(() => Math.random() - 0.5));
  }, []);

  // Timer loop
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'playing') {
          setGameState('paused');
        } else if (gameState === 'paused') {
          setGameState('playing');
        } else if (gameState === 'idle') {
          startGame();
        }
      } else if (gameState === 'playing') {
        if (['Digit1', 'KeyA'].includes(e.code)) handleAnswer(0);
        else if (['Digit2', 'KeyB'].includes(e.code)) handleAnswer(1);
        else if (['Digit3', 'KeyC'].includes(e.code)) handleAnswer(2);
        else if (['Digit4', 'KeyD'].includes(e.code)) handleAnswer(3);
      } else if (gameState === 'finished' && e.code === 'KeyR') {
        startGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, currentQIdx, score, streak, customQuestions]);

  const handleFileUpload = async (file: File) => {
    setIsProcessingFile(true);
    setGenerationError(null);
    try {
      const res = await extractEducationalFile(file);
      if (res.error) {
        setGenerationError(res.error);
        return;
      }
      setUploadedFile(file);
      setFileResult(res);

      if (!customTopic) {
        const cleanName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
        setCustomTopic(cleanName);
      }

      if (res.extractedText) {
        setCustomNotes(res.extractedText.slice(0, 15000));
      }
    } catch (err: any) {
      setGenerationError(err.message || 'Error processing uploaded material.');
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

  const handleGenerateQuestions = async () => {
    if (!uploadedFile && !customNotes.trim() && !customTopic.trim()) {
      setGenerationError('Please upload study material or provide a topic/notes to generate questions.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const payload: any = {
        topic: customTopic.trim(),
        notes: (fileResult?.extractedText || customNotes).trim(),
        questionCount: 15,
      };

      if (fileResult?.fileData) {
        payload.fileData = fileResult.fileData;
      }

      const res = await fetch('/api/ai/brain-blitz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate questions from study material.');
      }

      const data = await res.json();
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        setCustomQuestions(data.questions);
        const title = customTopic || uploadedFile?.name || 'Custom Study Notes';
        setActiveMaterialTitle(title);
      } else {
        throw new Error('No rapid-recall questions were generated.');
      }
    } catch (err: any) {
      setGenerationError(err.message || 'Could not generate questions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetToDefault = () => {
    setCustomQuestions(null);
    setActiveMaterialTitle(null);
    setUploadedFile(null);
    setFileResult(null);
    setCustomTopic('');
    setCustomNotes('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startGame = () => {
    const pool = customQuestions && customQuestions.length > 0
      ? customQuestions
      : DEFAULT_BRAIN_BLITZ_QUESTIONS;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
    setCurrentQIdx(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setTimeLeft(TOTAL_TIME);
    setLastAnswerStatus(null);
    setGameState('playing');
  };

  const endGame = () => {
    setGameState('finished');
    if (timerRef.current) clearInterval(timerRef.current);
    const updated = saveGameRecord(score, maxStreak);
    setRecord(updated);
  };

  const handleAnswer = (optionIdx: number) => {
    if (gameState !== 'playing' || questions.length === 0) return;

    const currentQ = questions[currentQIdx % questions.length];
    const isCorrect = optionIdx === currentQ.correctIndex;

    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);

      // Scoring with streak bonus multiplier
      const points = 100 + Math.min(newStreak * 20, 200);
      setScore((s) => s + points);
      setLastAnswerStatus('correct');
    } else {
      setStreak(0);
      setLastAnswerStatus('wrong');
    }

    setTimeout(() => setLastAnswerStatus(null), 600);
    setCurrentQIdx((prev) => (prev + 1) % questions.length);
  };

  const currentQ = questions.length > 0 ? questions[currentQIdx % questions.length] : null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Top Banner */}
      <AlertBanner
        type="info"
        title="Grounded Rapid Recall"
        message="Upload your study materials (PDF, Word docs, diagrams, or notes) to generate syllabus-aligned 60-second active recall challenges. Supports full keyboard navigation (1-4 or A-D, Space to pause)."
      />

      {/* Main Game Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Game Top Bar */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Brain Blitz</h2>
              <p className="text-sm text-slate-300">
                {activeMaterialTitle ? `Material: ${activeMaterialTitle}` : '60-Second Active Recall Challenge'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeMaterialTitle && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold">
                <FileCheck className="w-3.5 h-3.5" />
                Custom Material
              </span>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Best:</span>
              <span className="font-bold text-amber-300">{record.highScore}</span>
            </div>
          </div>
        </div>

        {/* Live HUD when playing or paused */}
        {(gameState === 'playing' || gameState === 'paused') && (
          <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-sm font-semibold">
            {/* Timer */}
            <div className="flex items-center gap-2">
              <Timer className={`w-4 h-4 ${timeLeft <= 10 ? 'text-rose-600 animate-pulse' : 'text-indigo-600'}`} />
              <span className="text-slate-500">Time:</span>
              <span className={`text-base font-bold ${timeLeft <= 10 ? 'text-rose-600' : 'text-slate-800'}`}>
                {timeLeft}s
              </span>
            </div>

            {/* Streak & Multiplier */}
            <div className="flex items-center gap-1.5">
              <Flame className={`w-4 h-4 ${streak > 2 ? 'text-amber-500' : 'text-slate-400'}`} />
              <span className="text-slate-500">Streak:</span>
              <span className="text-amber-600 font-bold">{streak}</span>
              {streak >= 3 && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs uppercase font-bold">
                  2x Bonus!
                </span>
              )}
            </div>

            {/* Live Score */}
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600" />
              <span className="text-slate-500">Score:</span>
              <span className="text-lg font-black text-indigo-700">{score}</span>
            </div>

            {/* Pause / Resume Button */}
            <button
              onClick={() => setGameState(gameState === 'playing' ? 'paused' : 'playing')}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Pause or Resume (Spacebar)"
            >
              {gameState === 'playing' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{gameState === 'playing' ? 'Pause' : 'Resume'}</span>
            </button>
          </div>
        )}

        {/* Timer Bar */}
        {(gameState === 'playing' || gameState === 'paused') && (
          <div className="w-full bg-slate-100 h-1.5">
            <div
              className={`h-full transition-all duration-1000 ${
                timeLeft <= 10 ? 'bg-rose-500' : 'bg-indigo-600'
              }`}
              style={{ width: `${(timeLeft / TOTAL_TIME) * 100}%` }}
            />
          </div>
        )}

        {/* Game States Presentation */}
        <div className="p-6 sm:p-8">
          {/* 1. IDLE SCREEN */}
          {gameState === 'idle' && (
            <div className="space-y-6">
              {/* Active Custom Material Alert if already loaded */}
              {customQuestions && activeMaterialTitle ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-900">
                        Custom Study Material Loaded
                      </h4>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        &quot;{activeMaterialTitle}&quot; • {customQuestions.length} rapid-recall questions ready
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleResetToDefault}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-emerald-100/60 rounded-lg transition-colors"
                    >
                      Reset to General
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Study Material Upload Section */}
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">
                        Upload Your Study Material
                      </h3>
                      <p className="text-xs text-slate-500">
                        Ground your 60-second Blitz in textbook chapters, lecture slides, or revision notes
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                    PDF, Word (.docx), Images, Notes
                  </span>
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
                  id="brain-blitz-file-upload"
                />

                {!uploadedFile ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDropFile}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-slate-800 hover:bg-white rounded-xl p-5 text-center cursor-pointer transition-all space-y-2 bg-white/70"
                  >
                    <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                      {isProcessingFile ? (
                        <span className="w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <UploadCloud className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {isProcessingFile
                          ? 'Extracting document text...'
                          : 'Click or drag learning material here'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        PDF textbooks, Word (.docx) lecture transcripts, formula diagrams, or text files
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        {fileResult?.fileType === 'pdf' ? (
                          <FileText className="w-4 h-4 text-rose-600" />
                        ) : fileResult?.fileType === 'docx' ? (
                          <FileText className="w-4 h-4 text-blue-600" />
                        ) : fileResult?.fileType === 'image' ? (
                          <ImageIcon className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <FileCheck className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800">{uploadedFile.name}</span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-100 text-slate-700">
                            {fileResult?.fileType === 'pdf'
                              ? 'PDF'
                              : fileResult?.fileType === 'docx'
                              ? 'Word DOCX'
                              : fileResult?.fileType === 'image'
                              ? 'Image'
                              : 'Notes'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                          {fileResult?.extractedText &&
                            ` • ${fileResult.extractedText.split(/\s+/).length} words parsed`}
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

                {/* Optional Topic or Paste Notes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Subject / Topic Identifier (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNotesInput(!showNotesInput)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      {showNotesInput ? '- Hide Notes Box' : '+ Paste Extra Notes'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="e.g. Molecular Genetics, Thermodynamics, Microeconomics"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                  />

                  {showNotesInput && (
                    <div className="pt-1">
                      <textarea
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                        rows={3}
                        placeholder="Paste lecture excerpts, formula summaries, or key definitions..."
                        className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                      />
                    </div>
                  )}
                </div>

                {generationError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
                    {generationError}
                  </div>
                )}

                {(uploadedFile || customTopic.trim() || customNotes.trim()) && (
                  <button
                    type="button"
                    onClick={handleGenerateQuestions}
                    disabled={isGenerating || isProcessingFile}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold rounded-xl text-sm shadow-xs transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20"
                  >
                    {isGenerating ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generating Questions from Material...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Generate Rapid Questions from Study Material
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Start Game Action */}
              <div className="text-center py-4 max-w-md mx-auto space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                  <BrainCircuit className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    {activeMaterialTitle
                      ? `Ready for ${activeMaterialTitle} Blitz`
                      : 'Test Your Rapid Recall'}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed mt-1">
                    {activeMaterialTitle
                      ? 'Answer questions generated directly from your uploaded study document. 60 seconds on the clock!'
                      : 'Answer as many rapid recall questions as you can before the 60-second timer runs out. Build consecutive streaks for multiplier bonuses!'}
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-sm text-left text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">🎮 Keyboard Shortcuts:</p>
                  <p>
                    • <strong>1, 2, 3, 4</strong> or <strong>A, B, C, D</strong> to select answers
                  </p>
                  <p>
                    • <strong>Spacebar</strong> to Start, Pause, or Resume
                  </p>
                </div>

                <button
                  type="button"
                  onClick={startGame}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-base focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600/30"
                >
                  <Play className="w-4 h-4 fill-white" />
                  {activeMaterialTitle ? 'Start Material Blitz (Space)' : 'Start Brain Blitz (Space)'}
                </button>
              </div>
            </div>
          )}

          {/* 2. PLAYING / PAUSED SCREEN */}
          {(gameState === 'playing' || gameState === 'paused') && currentQ && (
            <div className="space-y-6 relative">
              {/* Paused Overlay */}
              {gameState === 'paused' && (
                <div className="absolute inset-0 z-20 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center rounded-2xl text-center p-6 space-y-3">
                  <Pause className="w-10 h-10 text-indigo-600" />
                  <h3 className="text-lg font-bold text-slate-800">Game Paused</h3>
                  <p className="text-sm text-slate-500">Press Spacebar or click Resume to continue.</p>
                  <button
                    onClick={() => setGameState('playing')}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-sm"
                  >
                    Resume Game
                  </button>
                </div>
              )}

              {/* Feedback indicator */}
              {lastAnswerStatus && (
                <div
                  className={`p-2 rounded-xl text-sm font-bold text-center flex items-center justify-center gap-1.5 animate-bounce ${
                    lastAnswerStatus === 'correct'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {lastAnswerStatus === 'correct' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Correct! +Points
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" /> Streak Broken!
                    </>
                  )}
                </div>
              )}

              {/* Question header */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded">
                    {currentQ.category}
                  </span>
                  {activeMaterialTitle && (
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                      Grounded in Material
                    </span>
                  )}
                </div>
                <h3 className="text-lg sm:text-2xl font-bold text-slate-900 leading-snug">
                  {currentQ.prompt}
                </h3>
              </div>

              {/* 4 Answer options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {currentQ.options.map((option, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAnswer(idx)}
                    disabled={gameState !== 'playing'}
                    className="p-4 rounded-2xl border-2 border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/50 text-left transition-all text-base font-medium text-slate-800 flex items-center gap-3 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600/30"
                  >
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1">{option}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. FINISHED SCREEN */}
          {gameState === 'finished' && (
            <div className="text-center py-6 max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
                <Award className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900">Blitz Complete!</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {activeMaterialTitle
                    ? `Great active recall session on ${activeMaterialTitle}!`
                    : 'Great mental workout!'}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 py-2">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Final Score</span>
                  <p className="text-2xl font-black text-indigo-700 mt-0.5">{score}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Max Streak</span>
                  <p className="text-2xl font-black text-amber-600 mt-0.5">{maxStreak}🔥</p>
                </div>
              </div>

              {score > record.highScore && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm font-bold flex items-center justify-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-600" />
                  New Personal Record! Saved to device storage.
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={startGame}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-sm flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Play Again (R)
                </button>
                <button
                  type="button"
                  onClick={() => setGameState('idle')}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  Upload New Material
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
