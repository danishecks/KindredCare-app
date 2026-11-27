import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  FileSearch,
  FolderArchive,
  Loader2,
  Lock,
  Scale,
} from 'lucide-react';
import type { AuthSessionResponse } from '../types';

interface AuthViewProps {
  initialMode?: 'signin' | 'register';
  noticeMessage?: string | null;
  onAuthenticated: (session: AuthSessionResponse) => void;
  onBackToWebsite: () => void;
}

const DEMO_SIBLINGS: Array<{
  memberId: 'maya' | 'david' | 'elena';
  name: string;
  role: string;
  location: string;
  email: string;
  avatarUrl: string;
}> = [
  {
    memberId: 'maya',
    name: 'Maya Chen',
    role: 'Local Coordinator',
    location: 'Evanston, IL · 20% cash share',
    email: 'maya.chen@vancecare.demo',
    avatarUrl: '/src/assets/images/avatar_maya_coordinator_1795393417998.jpg',
  },
  {
    memberId: 'david',
    name: 'David Chen',
    role: 'Out-of-State Sibling',
    location: 'Seattle, WA · 55% cash share',
    email: 'david.chen@vancecare.demo',
    avatarUrl: '/src/assets/images/avatar_david_sibling_1795393419536.jpg',
  },
  {
    memberId: 'elena',
    name: 'Elena Chen',
    role: 'Sandwich-Gen Sibling',
    location: 'Denver, CO · 25% cash share',
    email: 'elena.chen@vancecare.demo',
    avatarUrl: '/src/assets/images/avatar_elena_sibling_1795393419260.jpg',
  },
];

const ROLE_OPTIONS = [
  'Local Coordinator',
  'Out-of-State Sibling',
  'Sandwich-Gen Sibling',
  'Family Care Member',
];

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = 'signin',
  noticeMessage,
  onAuthenticated,
  onBackToWebsite,
}) => {
  const [mode, setMode] = useState<'signin' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleLabel, setRoleLabel] = useState('Family Care Member');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoLoadingId, setDemoLoadingId] = useState<'maya' | 'david' | 'elena' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const switchMode = (next: 'signin' | 'register') => {
    setMode(next);
    setErrorMsg(null);
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to sign in. Please check your credentials.');
      }
      onAuthenticated(data as AuthSessionResponse);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (trimmedName.length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          password,
          roleLabel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to create your account.');
      }
      onAuthenticated(data as AuthSessionResponse);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Account creation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoSignIn = async (memberId: 'maya' | 'david' | 'elena') => {
    setErrorMsg(null);
    setDemoLoadingId(memberId);
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to start demo session.');
      }
      onAuthenticated(data as AuthSessionResponse);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to start demo session.');
    } finally {
      setDemoLoadingId(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7F4] text-[#1C2421]">
      {/* Top Bar */}
      <header className="border-b border-[#E5E2DC] bg-[#F8F7F4]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 lg:px-8">
          <button
            type="button"
            onClick={onBackToWebsite}
            className="text-lg font-bold tracking-tight text-[#1C2421] whitespace-nowrap shrink-0 hover:text-[#2D5A4C]"
          >
            KindredCare
          </button>
          <button
            type="button"
            onClick={onBackToWebsite}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 text-xs font-medium text-[#5A6662] transition-colors hover:text-[#1C2421]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Website
          </button>
        </div>
      </header>

      {/* Main Centered Split Layout */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-10 lg:px-8 lg:py-16">
        <div className="grid w-full grid-cols-1 items-start gap-10 lg:grid-cols-12">
          {/* Left Column: Family Context & Demo Quick Sign-In */}
          <div className="space-y-6 lg:col-span-6">
            <div>
              <p className="text-xs font-medium text-[#2D5A4C]">KindredCare Family Care Hub</p>
              <h1
                className="mt-2 font-serif font-semibold tracking-tight text-[#1C2421]"
                style={{ fontSize: 'clamp(1.85rem, 3vw, 2.5rem)', lineHeight: 1.15 }}
              >
                Sign in to access your family’s medical appeals and care ledger.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[#5A6662]">
                Protect EOB audits, drafted insurance appeal letters, sibling reimbursement balances, and IRS or Medicaid documentation behind your family account.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 border-t border-[#E5E2DC] pt-5 sm:grid-cols-3">
              <div className="text-xs">
                <FileSearch className="h-4 w-4 text-[#2D5A4C]" />
                <div className="mt-1.5 font-semibold text-[#1C2421]">EOB Auditor</div>
                <div className="mt-0.5 text-[#5A6662]">Billing error & appeal tracking</div>
              </div>
              <div className="text-xs">
                <Scale className="h-4 w-4 text-[#2D5A4C]" />
                <div className="mt-1.5 font-semibold text-[#1C2421]">Split Ledger</div>
                <div className="mt-0.5 text-[#5A6662]">Care-hour adjusted balances</div>
              </div>
              <div className="text-xs">
                <FolderArchive className="h-4 w-4 text-[#2D5A4C]" />
                <div className="mt-1.5 font-semibold text-[#1C2421]">Tax & Medicaid</div>
                <div className="mt-0.5 text-[#5A6662]">60-month spend-down packet</div>
              </div>
            </div>

            {/* One-Click Demo Sibling Quick Sign-In */}
            <div className="rounded-xl border border-[#E5E2DC] bg-white p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-[#1C2421]">Demo Sibling Quick Sign-In</h2>
                  <p className="mt-0.5 text-xs text-[#5A6662]">
                    Explore the pre-loaded Eleanor Vance Care Hub instantly from any sibling’s perspective.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {DEMO_SIBLINGS.map((sib) => {
                  const isLoading = demoLoadingId === sib.memberId;
                  return (
                    <button
                      key={sib.memberId}
                      type="button"
                      disabled={demoLoadingId !== null || isSubmitting}
                      onClick={() => void handleDemoSignIn(sib.memberId)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-[#E5E2DC] bg-[#F8F7F4] px-3.5 py-2.5 text-left transition-colors hover:border-[#2D5A4C] hover:bg-[#EEF4F1] disabled:opacity-60"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={sib.avatarUrl}
                          alt={sib.name}
                          referrerPolicy="no-referrer"
                          className="h-9 w-9 shrink-0 rounded-full border border-[#E5E2DC] object-cover"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-[#1C2421]">
                            {sib.name} · <span className="font-normal text-[#2D5A4C]">{sib.role}</span>
                          </div>
                          <div className="truncate text-[11px] text-[#5A6662]">{sib.location}</div>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#2D5A4C]">
                        {isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            Enter
                            <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Tabbed Email & Password Card */}
          <div className="lg:col-span-6">
            <div className="rounded-xl border border-[#E5E2DC] bg-white p-6 sm:p-8">
              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#F1EFEA] p-1">
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className={`rounded-md py-2 text-xs font-semibold transition-colors ${
                    mode === 'signin'
                      ? 'bg-white text-[#1C2421] shadow-xs'
                      : 'text-[#5A6662] hover:text-[#1C2421]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className={`rounded-md py-2 text-xs font-semibold transition-colors ${
                    mode === 'register'
                      ? 'bg-white text-[#1C2421] shadow-xs'
                      : 'text-[#5A6662] hover:text-[#1C2421]'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {noticeMessage && !errorMsg && (
                <div className="mt-5 rounded-lg border border-[#E5E2DC] bg-[#F8F7F4] px-4 py-3 text-xs text-[#1C2421]">
                  {noticeMessage}
                </div>
              )}

              {errorMsg && (
                <div
                  role="alert"
                  className="mt-5 rounded-lg border border-[#DC2626]/30 bg-red-50 px-4 py-3 text-xs font-medium text-[#DC2626]"
                >
                  {errorMsg}
                </div>
              )}

              {mode === 'signin' ? (
                <form onSubmit={handleSignInSubmit} className="mt-6 space-y-4">
                  <div>
                    <h2 className="font-serif text-xl font-semibold text-[#1C2421]">Welcome back</h2>
                    <p className="mt-1 text-xs text-[#5A6662]">
                      Sign in with your registered KindredCare email and password.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="signin-email" className="mb-1.5 block text-xs font-medium text-[#1C2421]">
                      Email Address
                    </label>
                    <input
                      id="signin-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-[#E5E2DC] bg-white px-3.5 py-2.5 text-sm text-[#1C2421] focus:border-[#2D5A4C] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="signin-password" className="mb-1.5 block text-xs font-medium text-[#1C2421]">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="signin-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full rounded-lg border border-[#E5E2DC] bg-white py-2.5 pr-10 pl-3.5 text-sm text-[#1C2421] focus:border-[#2D5A4C] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-[#5A6662] hover:text-[#1C2421]"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || demoLoadingId !== null}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2D5A4C] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#23473C] disabled:opacity-60"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Signing In...' : 'Sign In to Workspace'}
                  </button>

                  <p className="pt-2 text-center text-xs text-[#5A6662]">
                    New to KindredCare?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className="font-semibold text-[#2D5A4C] hover:underline"
                    >
                      Create your own account
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-4">
                  <div>
                    <h2 className="font-serif text-xl font-semibold text-[#1C2421]">Create your account</h2>
                    <p className="mt-1 text-xs text-[#5A6662]">
                      Set up your personal caregiver login to access and update the Care Hub.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="register-name" className="mb-1.5 block text-xs font-medium text-[#1C2421]">
                      Full Name
                    </label>
                    <input
                      id="register-name"
                      type="text"
                      autoComplete="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jordan Vance"
                      className="w-full rounded-lg border border-[#E5E2DC] bg-white px-3.5 py-2.5 text-sm text-[#1C2421] focus:border-[#2D5A4C] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="register-email" className="mb-1.5 block text-xs font-medium text-[#1C2421]">
                      Email Address
                    </label>
                    <input
                      id="register-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jordan@familymail.com"
                      className="w-full rounded-lg border border-[#E5E2DC] bg-white px-3.5 py-2.5 text-sm text-[#1C2421] focus:border-[#2D5A4C] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="register-role" className="mb-1.5 block text-xs font-medium text-[#1C2421]">
                      Caregiver Role
                    </label>
                    <select
                      id="register-role"
                      value={roleLabel}
                      onChange={(e) => setRoleLabel(e.target.value)}
                      className="w-full rounded-lg border border-[#E5E2DC] bg-white px-3.5 py-2.5 text-sm text-[#1C2421] focus:border-[#2D5A4C] focus:outline-none"
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="register-password" className="mb-1.5 block text-xs font-medium text-[#1C2421]">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        className="w-full rounded-lg border border-[#E5E2DC] bg-white py-2.5 pr-10 pl-3.5 text-sm text-[#1C2421] focus:border-[#2D5A4C] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-[#5A6662] hover:text-[#1C2421]"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-[#5A6662]">
                      At least 8 characters. Stored with per-user salted hashing on the server.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || demoLoadingId !== null}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2D5A4C] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#23473C] disabled:opacity-60"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Creating Account...' : 'Create Account & Open Workspace'}
                  </button>

                  <p className="pt-2 text-center text-xs text-[#5A6662]">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('signin')}
                      className="font-semibold text-[#2D5A4C] hover:underline"
                    >
                      Sign in instead
                    </button>
                  </p>
                </form>
              )}

              <div className="mt-6 flex items-center gap-2 border-t border-[#E5E2DC] pt-4 text-[11px] text-[#5A6662]">
                <Lock className="h-3.5 w-3.5 shrink-0 text-[#2D5A4C]" />
                <span>Authenticated sessions protect all EOB audits, appeals, and family ledger records.</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
