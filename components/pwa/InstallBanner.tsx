'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, X, Smartphone } from 'lucide-react';
import { usePwa } from './PwaContext';

export function InstallBanner() {
  const { isInstalled, isStandalone, promptInstall } = usePwa();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // If running in standalone mode or installed, don't show
    if (isInstalled || isStandalone) {
      setIsVisible(false);
      return;
    }

    // Check if dismissed recently (within 3 days)
    const dismissedAt = localStorage.getItem('lobex_install_banner_dismissed');
    if (dismissedAt) {
      const diff = Date.now() - parseInt(dismissedAt, 10);
      if (diff < 3 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Reveal banner gently after page load
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, [isInstalled, isStandalone]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('lobex_install_banner_dismissed', Date.now().toString());
  };

  const handleInstallClick = () => {
    promptInstall();
    handleDismiss();
  };

  if (!isVisible || isInstalled || isStandalone) return null;

  return (
    <aside
      aria-label="Install App Banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl p-4 animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-center gap-3.5">
        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/90 p-1.5 flex items-center justify-center flex-shrink-0 shadow-xs">
          <Image
            src="/logo.png"
            alt="Lobex Study Logo"
            width={52}
            height={52}
            className="w-full h-full object-contain rounded-xl"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-slate-900 truncate">
              Install Lobex Study
            </h3>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700">
              Web App
            </span>
          </div>
          <p className="text-xs text-slate-500 truncate sm:whitespace-normal mt-0.5">
            Add to home screen for 1-tap offline revision
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Dismiss install banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
