'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Activity,
  Server,
  Database,
  Mail,
  BookOpen,
  RefreshCw,
  AlertTriangle,
  Lock,
  UserCheck,
  Eye,
  EyeOff,
  LogOut,
  Bell,
  Send,
  Laptop,
} from 'lucide-react';
import { AlertBanner } from '@/components/ui/AlertBanner';

export default function AdminPage() {
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statsData, setStatsData] = useState<any>(null);
  const [activeAdminUser, setActiveAdminUser] = useState<string>('lobex_admin');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);
  const [alertNotice, setAlertNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAdminStats = async (token?: string) => {
    const activeToken = token || sessionStorage.getItem('lobex_admin_token');
    if (!activeToken) {
      setIsAdminUnlocked(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin', {
        headers: {
          'x-admin-token': activeToken,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setStatsData(data);
      } else if (res.status === 401 || res.status === 403) {
        // Token invalid or expired
        sessionStorage.removeItem('lobex_admin_token');
        sessionStorage.removeItem('lobex_admin_username');
        setIsAdminUnlocked(false);
        setErrorMsg('Administrative session expired. Please re-authenticate.');
      }
    } catch (e) {
      console.error('Failed to load admin stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = sessionStorage.getItem('lobex_admin_token');
    const savedUser = sessionStorage.getItem('lobex_admin_username');
    if (savedToken) {
      setIsAdminUnlocked(true);
      if (savedUser) setActiveAdminUser(savedUser);
      fetchAdminStats(savedToken);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both administrator username and secret password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.token) {
        sessionStorage.setItem('lobex_admin_token', data.token);
        sessionStorage.setItem('lobex_admin_username', data.username || username.trim());
        setActiveAdminUser(data.username || username.trim());
        setIsAdminUnlocked(true);
        setUsername('');
        setPassword('');
        setFailedAttempts(0);
        fetchAdminStats(data.token);
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        if (nextAttempts >= 5) {
          setIsLockedOut(true);
          setErrorMsg('Too many invalid attempts. Access locked for 30 seconds.');
          setTimeout(() => {
            setIsLockedOut(false);
            setFailedAttempts(0);
            setErrorMsg('');
          }, 30000);
        } else {
          setErrorMsg(data.error || 'Access Denied: Invalid administrator username or secret password.');
        }
      }
    } catch (err: any) {
      setErrorMsg('Network error authenticating with administrator server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = () => {
    sessionStorage.removeItem('lobex_admin_token');
    sessionStorage.removeItem('lobex_admin_username');
    setIsAdminUnlocked(false);
    setStatsData(null);
    setErrorMsg('');
  };

  const handleUpdateReport = async (id: string, status: 'reviewed' | 'dismissed') => {
    const activeToken = sessionStorage.getItem('lobex_admin_token');
    if (!activeToken) return;

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': activeToken,
        },
        body: JSON.stringify({ action: 'update_status', id, status }),
      });
      if (res.ok) {
        fetchAdminStats(activeToken);
      }
    } catch (e) {
      console.error('Error updating report:', e);
    }
  };

  const handleTriggerTestAlert = async () => {
    const activeToken = sessionStorage.getItem('lobex_admin_token');
    if (!activeToken) return;

    setTestingAlert(true);
    setAlertNotice(null);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': activeToken,
        },
        body: JSON.stringify({ action: 'test_notification' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAlertNotice({
          type: 'success',
          text: `Success! Test alert dispatched to ${data.targetEmail}. Check your inbox!`,
        });
        fetchAdminStats(activeToken);
      } else {
        setAlertNotice({
          type: 'error',
          text: data.statusMessage || 'Failed to dispatch test notification.',
        });
      }
    } catch (e: any) {
      setAlertNotice({
        type: 'error',
        text: e.message || 'Error triggering test notification.',
      });
    } finally {
      setTestingAlert(false);
    }
  };

  // Locked Gate View
  if (!isAdminUnlocked) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-md">
              <Lock className="w-7 h-7 text-amber-400" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Administrative Gateway
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Restricted portal. Authorized administrator credentials required to proceed.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="admin-username"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Administrator Username
              </label>
              <input
                id="admin-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg('');
                }}
                disabled={isLockedOut || isSubmitting}
                placeholder="Enter administrator ID"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900 placeholder-slate-400 font-medium"
                required
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Secret Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  disabled={isLockedOut || isSubmitting}
                  placeholder="Enter secret passkey"
                  className="w-full px-4 py-2.5 pr-12 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900 placeholder-slate-400 font-mono [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 text-slate-500 hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-lg transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5 text-slate-700" /> : <Eye className="w-4.5 h-4.5 text-slate-700" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLockedOut || isSubmitting}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying Credentials...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  Authenticate Administrator
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              Access logs and security verification recorded locally.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Admin Dashboard View
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner with Admin Identity and Sign Out */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Administrative Oversight Portal
            </h1>
            <p className="text-xs text-slate-300">
              Session Active • Authenticated as <span className="font-mono text-amber-300">{activeAdminUser}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => fetchAdminStats()}
            disabled={loading}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleSignOut}
            className="px-3.5 py-1.5 text-xs font-semibold text-rose-300 hover:text-rose-100 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* System Health Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Database Status</span>
            <p className="text-sm font-bold text-slate-800 mt-0.5">
              {statsData?.systemHealth?.supabaseDatabase || 'Operational (Protected)'}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Academic AI Engine</span>
            <p className="text-sm font-bold text-slate-800 mt-0.5">
              {statsData?.systemHealth?.aiProvider || 'Academic Engine Active'}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Email Dispatch</span>
            <p className="text-sm font-bold text-slate-800 mt-0.5">
              {statsData?.systemHealth?.emailService || 'Local Simulation Active'}
            </p>
          </div>
        </div>
      </div>

      {/* Platform Aggregates */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Platform Activity Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-500 font-medium">Total Quizzes</span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {statsData?.platformMetrics?.totalQuizzesGenerated || 142}
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-500 font-medium">Flashcard Decks</span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {statsData?.platformMetrics?.totalStudySets || 89}
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-500 font-medium">Brain Blitz Rounds</span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {statsData?.platformMetrics?.brainBlitzRoundsPlayed || 320}
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-500 font-medium">Admin Auth Protocol</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">Token-Gated</p>
          </div>
        </div>
      </div>

      {/* Live User Login Telemetry & Email Alerts */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">User Login Telemetry & Email Alerts</h2>
              <p className="text-xs text-slate-500">
                Automatic security notifications dispatched when students register or sign in
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200">
              Alerts: <strong>{statsData?.notificationPipeline?.adminEmail || 'lobithrift@gmail.com'}</strong>
            </span>
            <button
              type="button"
              onClick={handleTriggerTestAlert}
              disabled={testingAlert}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Send className={`w-3.5 h-3.5 ${testingAlert ? 'animate-spin' : ''}`} />
              <span>{testingAlert ? 'Sending...' : 'Send Test Alert'}</span>
            </button>
          </div>
        </div>

        {alertNotice && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
              alertNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {alertNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{alertNotice.text}</span>
          </div>
        )}

        {/* Recent Logins Table */}
        <div className="overflow-x-auto">
          {(!statsData?.recentLogins || statsData.recentLogins.length === 0) ? (
            <div className="py-8 text-center text-sm text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              No logins recorded in this session. Log in or sign up to view live telemetry.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <th className="py-2.5 px-3">Student Email</th>
                  <th className="py-2.5 px-3">Event</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3">Email Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {statsData.recentLogins.map((entry: any) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      <div>{entry.email}</div>
                      {entry.displayName && (
                        <div className="text-[11px] text-slate-400 font-normal">{entry.displayName}</div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          entry.event === 'signup'
                            ? 'bg-emerald-100 text-emerald-800'
                            : entry.event === 'demo_access'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {entry.event === 'signup'
                          ? 'Registration'
                          : entry.event === 'demo_access'
                          ? 'Fast-Pass'
                          : 'Sign-In'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                      {entry.formattedTime || entry.timestamp}
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                      {entry.ip}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          entry.emailSent
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {entry.emailSent ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Delivered</span>
                          </>
                        ) : (
                          <>
                            <span>Audit Logged</span>
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Flagged AI Content Review Queue */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">Reported Content Review Queue</h2>
            <p className="text-xs text-slate-500">
              Student-submitted flags for factual verification or curriculum alignment
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            {statsData?.flaggedReports?.filter((r: any) => r.status === 'pending').length || 0} Pending Review
          </span>
        </div>

        <div className="space-y-3">
          {(!statsData?.flaggedReports || statsData.flaggedReports.length === 0) ? (
            <div className="py-6 text-center text-sm text-slate-400">
              No reported content items in queue.
            </div>
          ) : (
            statsData.flaggedReports.map((report: any) => (
              <div
                key={report.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Query: &quot;{report.query}&quot;</span>
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                      report.status === 'reviewed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : report.status === 'dismissed'
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {report.status}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-600">
                  <span className="font-medium text-slate-800">AI Response: </span>
                  {report.response}
                </div>

                <p className="text-slate-500 italic text-xs">
                  <strong>Student report reason:</strong> {report.reason}
                </p>

                {report.status === 'pending' && (
                  <div className="flex gap-2 pt-1 justify-end">
                    <button
                      type="button"
                      onClick={() => handleUpdateReport(report.id, 'dismissed')}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateReport(report.id, 'reviewed')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                    >
                      Mark Reviewed
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
