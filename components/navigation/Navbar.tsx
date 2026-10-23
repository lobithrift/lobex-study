'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  CalendarCheck,
  CheckSquare,
  FileText,
  Layers,
  LayoutDashboard,
  LogIn,
  Menu,
  Settings,
  Shield,
  UserPlus,
  X,
  Zap,
  Download,
} from 'lucide-react';
import { usePwa } from '@/components/pwa/PwaContext';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isInstalled, promptInstall } = usePwa();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Summarizer', href: '/summarizer', icon: FileText },
    { name: 'Concept Tutor', href: '/tutor', icon: BookOpen },
    { name: 'Quizzes', href: '/quizzes', icon: CheckSquare },
    { name: 'Flashcards', href: '/flashcards', icon: Layers },
    { name: 'Study Timetable', href: '/planner', icon: CalendarCheck },
    { name: 'Brain Blitz', href: '/brain-blitz', icon: Zap },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Official Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded-xl group p-1"
            aria-label="Lobex Study Home"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white border border-slate-200/90 shadow-xs overflow-hidden flex items-center justify-center p-1 group-hover:scale-105 transition-transform flex-shrink-0">
              <img src="/logo.png" alt="Lobex Study Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-black text-2xl tracking-tight text-slate-900">
              Lobex Study
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                    active
                      ? 'bg-slate-100 text-slate-950 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-slate-900' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Right Actions with Install App, Admin, Settings, and Auth */}
          <div className="hidden sm:flex items-center gap-2">
            {!isInstalled && (
              <button
                type="button"
                onClick={promptInstall}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                title="Install Lobex Study App"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Install App</span>
              </button>
            )}

            <Link
              href="/admin"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              title="Admin Portal"
              aria-label="Admin Portal"
            >
              <Shield className="w-4 h-4" />
            </Link>
            <Link
              href="/settings"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>

            <div className="h-4 w-px bg-slate-200 mx-1" />

            <Link
              href="/login?mode=signin"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <LogIn className="w-4 h-4 text-slate-500" />
              <span>Sign In</span>
            </Link>

            <Link
              href="/login?mode=signup"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
            >
              <UserPlus className="w-4 h-4 text-slate-200" />
              <span>Sign Up</span>
            </Link>
          </div>

          {/* Mobile Menu Button & Install Trigger */}
          <div className="flex lg:hidden items-center gap-2">
            {!isInstalled && (
              <button
                type="button"
                onClick={promptInstall}
                className="p-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 rounded-lg border border-indigo-200"
                title="Install App"
                aria-label="Install App"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            <Link
              href="/login?mode=signin"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              title="Sign In"
              aria-label="Sign In"
            >
              <LogIn className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-6 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-150">
          {!isInstalled && (
            <div className="pb-2 mb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  promptInstall();
                }}
                className="w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-sm flex items-center justify-center gap-2 border border-indigo-200"
              >
                <Download className="w-4 h-4" />
                <span>Install Lobex Study App</span>
              </button>
            </div>
          )}

          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-slate-100 text-slate-950 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-slate-900' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between px-3 text-xs text-slate-600">
            <Link
              href="/login?mode=signin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-1.5 py-1 text-slate-700 font-semibold"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </Link>
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-1 py-1 text-slate-600 hover:text-slate-900"
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </Link>
            <Link
              href="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-1 py-1 text-slate-600 hover:text-slate-900"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
