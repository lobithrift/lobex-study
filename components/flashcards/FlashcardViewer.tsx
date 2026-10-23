'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  BookmarkCheck,
  Save,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Paperclip,
} from 'lucide-react';
import { Flashcard } from '@/types';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { extractEducationalFile, ExtractedFileResult } from '@/lib/utils/fileExtractor';

export function FlashcardViewer() {
  const [topic, setTopic] = useState('Cell Organelles & Respiration');
  const [notes, setNotes] = useState('');
  const [count, setCount] = useState(6);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File upload dropdown state
  const [showUploadDropdown, setShowUploadDropdown] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileResult, setFileResult] = useState<ExtractedFileResult | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deck state
  const [cards, setCards] = useState<Flashcard[]>([
    {
      id: 'demo-1',
      front: 'Mitochondria',
      back: 'The organelle responsible for aerobic cellular respiration and ATP synthesis. Often called the powerhouse of the cell.',
      position: 0,
      known: false,
    },
    {
      id: 'demo-2',
      front: 'Ribosome',
      back: 'Molecular machines that translate mRNA transcripts into polypeptide chains (protein synthesis).',
      position: 1,
      known: false,
    },
    {
      id: 'demo-3',
      front: 'Chloroplast',
      back: 'Plastid containing chlorophyll where photosynthesis occurs in plant and algal cells.',
      position: 2,
      known: false,
    },
    {
      id: 'demo-4',
      front: 'Endoplasmic Reticulum (Rough vs Smooth)',
      back: 'Rough ER is studded with ribosomes for protein folding; Smooth ER synthesizes lipids and detoxifies metabolic byproducts.',
      position: 3,
      known: false,
    },
  ]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterNeedsReview, setFilterNeedsReview] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Check transferred notes from Summarizer
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const transferredTopic = sessionStorage.getItem('lobex_flashcard_transfer_topic');
      const transferredNotes = sessionStorage.getItem('lobex_flashcard_transfer_notes');
      if (transferredTopic) {
        setTopic(transferredTopic);
        sessionStorage.removeItem('lobex_flashcard_transfer_topic');
      }
      if (transferredNotes) {
        setNotes(transferredNotes);
        sessionStorage.removeItem('lobex_flashcard_transfer_notes');
      }
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const activeCards = filterNeedsReview ? cards.filter((c) => !c.known) : cards;
  const currentCard = activeCards[currentIdx] || activeCards[0];

  const handleNext = () => {
    setIsFlipped(false);
    if (activeCards.length > 0) {
      setCurrentIdx((prev) => (prev + 1) % activeCards.length);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (activeCards.length > 0) {
      setCurrentIdx((prev) => (prev - 1 + activeCards.length) % activeCards.length);
    }
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    setCards((prev) => [...prev].sort(() => Math.random() - 0.5));
    setCurrentIdx(0);
  };

  const toggleStatus = (id: string, known: boolean) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, known } : c))
    );
    handleNext();
  };

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

      if (!topic || topic === 'Cell Organelles & Respiration') {
        const clean = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
        setTopic(clean);
      }
      if (res.extractedText) {
        setNotes(res.extractedText.slice(0, 15000));
      }
    } catch (err: any) {
      setError(err.message || 'Error processing learning material.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFileUpload(dropped);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFileResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);
    setIsFlipped(false);

    try {
      const payload: any = {
        topic: topic.trim(),
        notes: (fileResult?.extractedText || notes).trim(),
        count: Number(count),
      };

      if (fileResult?.fileData) {
        payload.fileData = fileResult.fileData;
      }

      const res = await fetch('/api/ai/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate flashcards.');
      }

      const data = await res.json();
      if (!data.flashcards || data.flashcards.length === 0) {
        throw new Error('No flashcards returned for this topic.');
      }

      setCards(data.flashcards);
      setCurrentIdx(0);
      setFilterNeedsReview(false);
    } catch (err: any) {
      setError(err.message || 'Unable to generate flashcards.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;

    const newCard: Flashcard = {
      id: `custom-${Date.now()}`,
      front: newFront.trim(),
      back: newBack.trim(),
      position: cards.length,
      known: false,
    };

    setCards((prev) => [...prev, newCard]);
    setNewFront('');
    setNewBack('');
    setShowAddModal(false);
  };

  const handleSaveToCloud = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert('Please sign in to save study sets to your cloud account.');
        return;
      }

      // 1. Insert study set
      const { data: setRecord, error: setError } = await supabase
        .from('study_sets')
        .insert({
          user_id: user.id,
          title: topic || 'Custom Flashcard Set',
          source_type: notes ? 'notes' : 'topic',
        })
        .select()
        .single();

      if (setError || !setRecord) throw setError;

      // 2. Insert flashcards
      const cardsToInsert = cards.map((c, i) => ({
        study_set_id: setRecord.id,
        front: c.front,
        back: c.back,
        position: i,
      }));

      await supabase.from('flashcards').insert(cardsToInsert);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(err);
      alert('Could not save flashcards to Supabase. Check your connection or sign-in status.');
    }
  };

  const knownCount = cards.filter((c) => c.known).length;
  const reviewCount = cards.length - knownCount;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Generator / Controls Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
              <Layers className="w-6 h-6 text-slate-700" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Flashcard Revision Deck</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {cards.length} cards total • {knownCount} mastered • {reviewCount} needing review
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Card
            </button>
            <button
              onClick={handleSaveToCloud}
              className="px-4 py-2 text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saveSuccess ? 'Saved to Account!' : 'Save Deck'}
            </button>
          </div>
        </div>

        {/* Generator Form */}
        <form onSubmit={handleGenerate} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
            <div className="md:col-span-6">
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">Topic or Subject</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. World War 2 Alliances, Organic Chemistry Functional Groups"
                required
                className="w-full px-4 py-3 text-sm sm:text-base rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Card Count
              </label>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full px-4 py-3 text-sm sm:text-base rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value={4}>4 Flashcards</option>
                <option value={6}>6 Flashcards</option>
                <option value={10}>10 Flashcards</option>
                <option value={12}>12 Flashcards</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={isLoading || !topic.trim()}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-semibold text-sm sm:text-base rounded-xl flex items-center justify-center gap-2 shadow-2xs transition-colors"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    <span>Generate Cards</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Collapsible Dropdown: Upload Learning Materials */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowUploadDropdown(!showUploadDropdown)}
              className="flex items-center justify-between w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-slate-600" />
                <span>Upload Learning Materials (PDF, Word docs, Images, Slides, Notes)</span>
                {uploadedFile && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    File Attached
                  </span>
                )}
              </div>
              {showUploadDropdown ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {showUploadDropdown && (
              <div className="mt-3 p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md,image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                  className="hidden"
                  id="flashcard-file-upload"
                />

                {!uploadedFile ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDropFile}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-slate-800 hover:bg-white rounded-xl p-5 text-center cursor-pointer transition-all space-y-1.5"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center mx-auto">
                      {isProcessingFile ? (
                        <span className="w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <UploadCloud className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {isProcessingFile ? 'Analyzing syllabus document...' : 'Click or drag learning material here'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Supports PDF textbooks, Word (.docx) lecture transcripts, formula images, or notes (up to 25MB)
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
                          <span className="px-2.5 py-0.5 rounded text-xs font-semibold uppercase bg-slate-100 text-slate-700">
                            {fileResult?.fileType === 'pdf'
                              ? 'Multimodal PDF'
                              : fileResult?.fileType === 'docx'
                              ? 'Word Doc (Extracted)'
                              : fileResult?.fileType === 'image'
                              ? 'Image'
                              : 'Notes'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                          {fileResult?.extractedText && ` • ${fileResult.extractedText.split(/\s+/).length} words ready`}
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

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Extracted or Pasted Study Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Course content extracted from uploaded files or pasted manually..."
                    rows={3}
                    maxLength={15000}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed"
                  />
                </div>
              </div>
            )}
          </div>
        </form>

        {error && (
          <div className="mt-3.5 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl">
            {error}
          </div>
        )}
      </div>

      {/* Main Flashcard Interactive Player */}
      {activeCards.length > 0 && currentCard ? (
        <div className="space-y-4">
          {/* Card Frame with 3D Flip */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            tabIndex={0}
            role="button"
            aria-label={`Flashcard: ${isFlipped ? 'Back side' : 'Front side'}. Press Space to flip.`}
            className={`cursor-pointer min-h-[320px] sm:min-h-[360px] rounded-3xl p-8 sm:p-10 flex flex-col justify-between transition-all duration-300 border shadow-md relative select-none focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20 ${
              isFlipped
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-900 border-slate-200 hover:border-slate-400'
            }`}
          >
            {/* Top card info */}
            <div className="flex items-center justify-between text-sm">
              <span
                className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider text-xs ${
                  isFlipped ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {isFlipped ? 'Precise Definition / Mechanism' : 'Concept / Cue Question'}
              </span>

              <div className="flex items-center gap-2.5">
                {currentCard.known && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-800/40">
                    <CheckCircle className="w-3.5 h-3.5" /> Mastered
                  </span>
                )}
                <span className={isFlipped ? 'text-slate-300 font-medium' : 'text-slate-500 font-medium'}>
                  Card {currentIdx + 1} of {activeCards.length}
                </span>
              </div>
            </div>

            {/* Content Text */}
            <div className="py-8 text-center my-auto">
              <p
                className={`transition-all ${
                  isFlipped
                    ? 'text-lg sm:text-xl font-normal leading-relaxed text-slate-100 max-w-2xl mx-auto'
                    : 'text-2xl sm:text-3xl font-bold text-slate-900 leading-snug tracking-tight max-w-2xl mx-auto'
                }`}
              >
                {isFlipped ? currentCard.back : currentCard.front}
              </p>
            </div>

            {/* Bottom hint */}
            <div className="flex items-center justify-center gap-2 text-sm opacity-75">
              <RotateCw className="w-4 h-4" />
              <span>Click or press Spacebar to flip</span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            {/* Left status buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleStatus(currentCard.id, false)}
                className={`px-3.5 py-2 text-sm font-semibold rounded-xl border flex items-center gap-1.5 transition-colors ${
                  !currentCard.known
                    ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-300/30'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Needs Review
              </button>

              <button
                type="button"
                onClick={() => toggleStatus(currentCard.id, true)}
                className={`px-3.5 py-2 text-sm font-semibold rounded-xl border flex items-center gap-1.5 transition-colors ${
                  currentCard.known
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-2 ring-emerald-300/30'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Mark Known
              </button>
            </div>

            {/* Navigation and Shuffle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                title="Previous card (Left Arrow)"
                aria-label="Previous card"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleShuffle}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                title="Shuffle cards"
                aria-label="Shuffle cards"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                title="Next card (Right Arrow)"
                aria-label="Next card"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Review Filter Toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFilterNeedsReview(!filterNeedsReview);
                  setCurrentIdx(0);
                  setIsFlipped(false);
                }}
                className={`px-3.5 py-2 text-sm font-semibold rounded-xl border transition-colors ${
                  filterNeedsReview
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {filterNeedsReview ? 'Showing: Needs Review Only' : 'Filter: Needs Review'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <p className="text-sm font-semibold text-slate-700">All cards are marked as known!</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Great job! You have cleared all review items in this set.
          </p>
          <button
            onClick={() => setFilterNeedsReview(false)}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg"
          >
            View All Cards
          </button>
        </div>
      )}

      {/* Manual Add Card Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Custom Flashcard</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add your own custom definition, formula, or exam cue card.
            </p>

            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Front (Question / Concept)
                </label>
                <input
                  type="text"
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  placeholder="e.g. Newton's 1st Law"
                  required
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-violet-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Back (Answer / Definition)
                </label>
                <textarea
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  placeholder="e.g. An object remains at rest or uniform velocity unless acted upon by a resultant external force."
                  rows={3}
                  required
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-violet-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg shadow-sm"
                >
                  Add Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
