'use client';

import React from 'react';
import Image from 'next/image';
import {
  Download,
  Share,
  PlusSquare,
  Smartphone,
  Laptop,
  CheckCircle2,
  X,
  Sparkles,
  Zap,
} from 'lucide-react';
import { usePwa } from './PwaContext';

export function InstallModal() {
  const { isInstalled, isIos, canInstall, showInstallModal, setShowInstallModal, promptInstall } =
    usePwa();

  if (!showInstallModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        {/* Close Button */}
        <button
          onClick={() => setShowInstallModal(false)}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header with App Logo */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-white border border-slate-200/90 p-2 flex items-center justify-center flex-shrink-0 shadow-md">
            <Image
              src="/logo.png"
              alt="Lobex Study Logo"
              width={72}
              height={72}
              className="w-full h-full object-contain rounded-2xl"
            />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Install Lobex Study
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Add to your home screen for quick, distraction-free studying
            </p>
          </div>
        </div>

        {/* Value Proposition Highlights */}
        <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-slate-700 font-medium">
            <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>Instant 1-Tap Access</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-slate-700 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Offline Active Recall</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-slate-700 font-medium">
            <Smartphone className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span>Full-Screen Study UI</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-slate-700 font-medium">
            <Sparkles className="w-4 h-4 text-sky-600 flex-shrink-0" />
            <span>Zero App Store Hassle</span>
          </div>
        </div>

        {/* Primary Action Button (if browser triggers native prompt) */}
        {canInstall && (
          <button
            type="button"
            onClick={promptInstall}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-base focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20"
          >
            <Download className="w-5 h-5" />
            Add to Home Screen
          </button>
        )}

        {/* Platform Specific Step-by-Step Guidance */}
        <div className="space-y-3 pt-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Installation Guide by Device
          </h3>

          {/* iOS Instructions */}
          <div className={`p-4 rounded-2xl border transition-all ${isIos ? 'bg-indigo-50/70 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 mb-2">
              <Smartphone className="w-4 h-4 text-indigo-600" />
              <span>Apple iPhone & iPad (Safari)</span>
              {isIos && (
                <span className="ml-auto px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-700">
                  Your Device
                </span>
              )}
            </div>
            <ol className="text-xs sm:text-sm text-slate-600 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>
                Tap the <strong className="text-slate-800 font-semibold">Share</strong> button <Share className="w-3.5 h-3.5 inline text-indigo-600 mx-0.5" /> in the bottom bar of Safari.
              </li>
              <li>
                Scroll down and select <strong className="text-slate-800 font-semibold">Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline text-indigo-600 mx-0.5" />.
              </li>
              <li>
                Tap <strong className="text-slate-800 font-semibold">Add</strong> in the top-right corner to finish.
              </li>
            </ol>
          </div>

          {/* Android / Chrome Instructions */}
          <div className={`p-4 rounded-2xl border transition-all ${!isIos ? 'bg-indigo-50/70 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 mb-2">
              <Smartphone className="w-4 h-4 text-slate-700" />
              <span>Android & Chrome / Edge / Opera</span>
              {!isIos && (
                <span className="ml-auto px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-700">
                  Recommended
                </span>
              )}
            </div>
            <ol className="text-xs sm:text-sm text-slate-600 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>
                Tap the <strong className="text-slate-800 font-semibold">Install</strong> button above or the browser menu (⋮).
              </li>
              <li>
                Select <strong className="text-slate-800 font-semibold">&quot;Install App&quot;</strong> or <strong className="text-slate-800 font-semibold">&quot;Add to Home Screen&quot;</strong>.
              </li>
              <li>Confirm the prompt to place the icon on your device launcher.</li>
            </ol>
          </div>

          {/* Desktop PC Instructions */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-600 flex items-start gap-2.5">
            <Laptop className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800 font-semibold">Desktop (Mac, Windows, ChromeOS):</strong> Look for the install icon (<Download className="w-3.5 h-3.5 inline mx-0.5" />) on the right side of the browser URL address bar to install as a standalone desktop app.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setShowInstallModal(false)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
