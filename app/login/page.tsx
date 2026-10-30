'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail,
  Lock,
  ArrowRight,
  UserCheck,
  UserPlus,
  LogIn,
  Eye,
  EyeOff,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';

  const [tab, setTab] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'signup' || mode === 'signin') {
      setTab(mode);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const supabase = getSupabaseBrowserClient();

    try {
      if (tab === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: displayName.trim() || email.split('@')[0],
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          router.push('/dashboard');
        } else {
          setMessage({
            type: 'success',
            text: 'Account created! If email confirmation is enabled on your Supabase project, check your inbox. Otherwise, you can sign in directly.',
          });
          setTab('signin');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        router.push('/dashboard');
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Authentication error. Please check your credentials.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantDemoLogin = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'lobex_demo_user',
        JSON.stringify({
          id: 'demo-student-uuid',
          email: 'student@lobex-study.internal',
          display_name: 'Alex Rivera',
          role: 'student',
        })
      );
    }
    router.push('/dashboard');
  };

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-24 h-24 rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden flex items-center justify-center mx-auto p-2.5">
            <img src="/logo.png" alt="Lobex Study Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {tab === 'signin' ? 'Sign In to Lobex Study' : 'Create Student Account'}
          </h1>
          <p className="text-sm text-slate-500">
            {tab === 'signin'
              ? 'Access your saved study sets, quiz attempts, and learning streak'
              : 'Join to synchronize study sets and track your progress across devices'}
          </p>
        </div>

        {/* Auth Tabs */}
        <div className="flex p-1.5 bg-slate-100 rounded-xl text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setMessage(null);
            }}
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all ${
              tab === 'signin' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setMessage(null);
            }}
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all ${
              tab === 'signup' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Sign Up</span>
          </button>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`p-3.5 rounded-xl text-sm font-medium leading-relaxed ${
              message.type === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {tab === 'signup' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5 text-sm">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 text-sm">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.edu"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-semibold text-slate-700 text-sm">Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1 focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide password</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Show password</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={showPassword ? 'Enter your password' : '••••••••'}
                required
                minLength={6}
                className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-300 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-semibold rounded-xl text-sm sm:text-base transition-colors shadow-2xs flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : tab === 'signup' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Student Account</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleInstantDemoLogin}
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            <UserCheck className="w-4 h-4 text-slate-600" />
            <span>Fast-Pass (Instant Student Access)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-xs text-slate-400">Loading authentication...</div>}>
      <LoginForm />
    </Suspense>
  );
}
