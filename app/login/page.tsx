'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  UserPlus,
  LogIn,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { triggerLoginNotification } from '@/lib/utils/notifyLogin';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const getInitialTab = (): 'signin' | 'signup' | 'forgot' | 'reset' => {
    const mode = searchParams.get('mode');
    if (mode === 'signup') return 'signup';
    if (mode === 'forgot') return 'forgot';
    if (mode === 'reset') return 'reset';
    return 'signin';
  };

  const [tab, setTab] = useState<'signin' | 'signup' | 'forgot' | 'reset'>(getInitialTab());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'signup' || mode === 'signin' || mode === 'forgot' || mode === 'reset') {
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

        await triggerLoginNotification({
          email: email.trim(),
          displayName: displayName.trim() || undefined,
          event: 'signup',
        });

        if (data.session) {
          router.push('/dashboard');
        } else {
          setMessage({
            type: 'success',
            text: 'Account created! If email confirmation is enabled on your Supabase project, check your inbox. Otherwise, you can sign in directly.',
          });
          setTab('signin');
        }
      } else if (tab === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        await triggerLoginNotification({
          email: email.trim(),
          event: 'login',
        });

        router.push('/dashboard');
      } else if (tab === 'forgot') {
        if (!email.trim()) {
          setMessage({
            type: 'error',
            text: 'Please enter your registered email address to receive password recovery instructions.',
          });
          setIsLoading(false);
          return;
        }

        const redirectUrl =
          typeof window !== 'undefined' ? `${window.location.origin}/login?mode=reset` : undefined;

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: redirectUrl,
        });

        if (error) throw error;

        setMessage({
          type: 'success',
          text: `Password recovery instructions have been dispatched to ${email.trim()}. Please check your email inbox (and spam folder) for the secure reset link.`,
        });
      } else if (tab === 'reset') {
        if (password.length < 6) {
          setMessage({
            type: 'error',
            text: 'Your new password must be at least 6 characters long.',
          });
          setIsLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setMessage({
            type: 'error',
            text: 'Passwords do not match. Please ensure both passwords match.',
          });
          setIsLoading(false);
          return;
        }

        const { error } = await supabase.auth.updateUser({
          password,
        });

        if (error) throw error;

        setMessage({
          type: 'success',
          text: 'Password updated successfully! Redirecting you to your dashboard...',
        });

        setTimeout(() => {
          router.push('/dashboard');
        }, 1200);
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Authentication error. Please check your inputs and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantDemoLogin = async () => {
    const demoEmail = email.trim() || 'student@lobex-study.internal';
    const demoName = displayName.trim() || 'Alex Rivera';

    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'lobex_demo_user',
        JSON.stringify({
          id: 'demo-student-uuid',
          email: demoEmail,
          display_name: demoName,
          role: 'student',
        })
      );
    }

    await triggerLoginNotification({
      email: demoEmail,
      displayName: demoName,
      event: 'demo_access',
    });

    router.push('/dashboard');
  };

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          {tab === 'forgot' ? (
            <div className="w-20 h-20 rounded-3xl bg-blue-50 border border-blue-200 shadow-xs flex items-center justify-center mx-auto text-blue-600">
              <KeyRound className="w-10 h-10" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden flex items-center justify-center mx-auto p-2.5">
              <img src="/logo.png" alt="Lobex Study Logo" className="w-full h-full object-contain" />
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {tab === 'signin' && 'Sign In to Lobex Study'}
            {tab === 'signup' && 'Create Student Account'}
            {tab === 'forgot' && 'Recover Login Details'}
            {tab === 'reset' && 'Set New Password'}
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            {tab === 'signin' && 'Access your saved study sets, quiz attempts, and learning streak.'}
            {tab === 'signup' && 'Join to synchronize study sets and track your progress across devices.'}
            {tab === 'forgot' && 'Enter your registered email address and we will dispatch a recovery link.'}
            {tab === 'reset' && 'Choose a strong new password to regain access to your account.'}
          </p>
        </div>

        {/* Auth Tabs Navigation */}
        {tab === 'signin' || tab === 'signup' ? (
          <div className="flex p-1.5 bg-slate-100 rounded-xl text-sm font-semibold">
            <button
              type="button"
              onClick={() => {
                setTab('signin');
                setMessage(null);
              }}
              className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                tab === 'signin'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
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
              className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                tab === 'signup'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Sign Up</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => {
                setTab('signin');
                setMessage(null);
              }}
              className="inline-flex items-center gap-1.5 font-bold text-slate-700 hover:text-slate-950 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Sign In</span>
            </button>
            <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              {tab === 'forgot' ? 'Account Recovery' : 'Reset Password'}
            </span>
          </div>
        )}

        {/* Message Banner */}
        {message && (
          <div
            className={`p-3.5 rounded-xl text-sm font-medium leading-relaxed flex items-start gap-2.5 ${
              message.type === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            ) : (
              <HelpCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">{message.text}</div>
          </div>
        )}

        {/* Authentication & Recovery Form */}
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

          {tab !== 'reset' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5 text-sm">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
          )}

          {/* Password field for Sign In & Sign Up */}
          {(tab === 'signin' || tab === 'signup') && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-semibold text-slate-700 text-sm">Password</label>
                <div className="flex items-center gap-2">
                  {/* Password Visibility Quick Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowPassword((prev) => !prev);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1 focus:outline-none cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                        <span>Hide password</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>Show password</span>
                      </>
                    )}
                  </button>

                  {/* Forgot Password Link with Icon in Sign In mode */}
                  {tab === 'signin' && (
                    <>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTab('forgot');
                          setMessage(null);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-1 focus:outline-none cursor-pointer"
                        aria-label="Forgot password? Recover login details"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                        <span>Forgot password?</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Password Input with In-Field Visibility Toggle */}
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={showPassword ? 'Enter your password' : '••••••••'}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-300 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900 bg-white placeholder-slate-400 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowPassword((prev) => !prev);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-slate-700" />
                  ) : (
                    <Eye className="w-5 h-5 text-slate-700" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Reset Password Fields */}
          {tab === 'reset' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-semibold text-slate-700 text-sm">New Password</label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowPassword((prev) => !prev);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-300 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-slate-900 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowPassword((prev) => !prev);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5 text-slate-700" /> : <Eye className="w-5 h-5 text-slate-700" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-semibold text-slate-700 text-sm">Confirm New Password</label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowConfirmPassword((prev) => !prev);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showConfirmPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-300 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-slate-900 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowConfirmPassword((prev) => !prev);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5 text-slate-700" /> : <Eye className="w-5 h-5 text-slate-700" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Forgot Password Details / Submit */}
          {tab === 'forgot' && (
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 leading-relaxed">
              We will send a secure password recovery link to your email. Clicking the link will allow you to set a new password and recover your login credentials immediately.
            </div>
          )}

          {/* Main Action Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-semibold rounded-xl text-sm sm:text-base transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : tab === 'signup' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Student Account</span>
              </>
            ) : tab === 'forgot' ? (
              <>
                <KeyRound className="w-4 h-4 text-blue-300" />
                <span>Send Password Recovery Link</span>
              </>
            ) : tab === 'reset' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Save New Password</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Helpful Recovery Footer link if in Sign-in mode */}
        {tab === 'signin' && (
          <div className="text-center pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setTab('forgot');
                setMessage(null);
              }}
              className="text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors inline-flex items-center gap-1.5 cursor-pointer p-1"
            >
              <KeyRound className="w-3.5 h-3.5 text-blue-500" />
              <span>Forgot or lost your login password? Click here to recover.</span>
            </button>
          </div>
        )}

        {/* Instant Access Option */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleInstantDemoLogin}
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
