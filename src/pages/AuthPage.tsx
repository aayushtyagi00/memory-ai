import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  User,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Database,
  KeyRound,
  X,
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isSignUpInitial = searchParams.get('signup') === 'true';
  const [isSignUp, setIsSignUp] = useState(isSignUpInitial);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { signIn, signUp, enableDemoUser, user, isSupabaseActive, resetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const res = await signUp(email, password, displayName);
        if (res.error) {
          setError(res.error);
        } else if (res.requiresEmailVerification) {
          setSuccessNotice(
            `Account created! A confirmation link has been sent to ${email}. Please check your inbox to confirm your account, then sign in.`
          );
          setIsSignUp(false);
        } else {
          navigate('/dashboard');
        }
      } else {
        const res = await signIn(email, password);
        if (res.error) setError(res.error);
        else navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    setResetMessage(null);
    try {
      const res = await resetPassword(resetEmail.trim());
      if (res.error) {
        setResetMessage({ type: 'error', text: res.error });
      } else {
        setResetMessage({
          type: 'success',
          text: `Password reset instructions sent to ${resetEmail}. Check your email.`,
        });
      }
    } catch (err: any) {
      setResetMessage({ type: 'error', text: err?.message || 'Failed to send reset link.' });
    } finally {
      setResetLoading(false);
    }
  };

  const handleDemoLogin = () => {
    enableDemoUser();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col justify-between font-sans">
      {/* Top minimal header */}
      <header className="h-16 max-w-[1200px] w-full mx-auto px-4 md:px-8 flex items-center justify-between border-b border-border">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent-soft border border-accent/30 flex items-center justify-center text-accent">
            <span className="material-symbols-outlined text-[18px]">memory</span>
          </div>
          <span className="font-mono text-sm font-semibold tracking-wider text-text-primary">
            MEMORY AI
          </span>
        </Link>
        <button
          onClick={handleDemoLogin}
          className="text-xs font-mono font-medium text-accent hover:text-red-400 bg-accent-soft px-3 py-1.5 rounded-lg border border-accent/20 transition-all flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Quick 1-Click Judge Demo</span>
        </button>
      </header>

      {/* Main split container */}
      <main className="w-full flex-1 max-w-[1200px] mx-auto px-4 md:px-8 py-8 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Brand showcase panel */}
          <div className="lg:col-span-6 relative p-8 md:p-12 rounded-2xl bg-bg-elevated/80 border border-border overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-accent-soft blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-soft border border-accent/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping"></span>
                  <span className="font-mono text-[11px] text-primary uppercase tracking-wider">
                    SECURE ACCESS
                  </span>
                </div>

                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono ${
                    isSupabaseActive
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-400/10 border-amber-400/30 text-amber-400'
                  }`}
                >
                  <Database className="w-3 h-3" />
                  <span>{isSupabaseActive ? 'Supabase Auth & DB Active' : 'Local Storage Mode'}</span>
                </div>
              </div>

              <div>
                <h2 className="text-2xl sm:text-4xl font-bold text-text-primary tracking-tight leading-tight">
                  Your personal, <br />
                  <span className="text-text-secondary">searchable memory.</span>
                </h2>
                <p className="text-xs sm:text-sm text-text-muted mt-3 leading-relaxed">
                  Sign in to access your personal memory vault. Every document, screenshot, receipt, and note is indexed securely with row-level security.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-4 border-t border-border/80">
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Row Level Security (RLS) ensures isolated memory storage</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Secure JWT authentication via Supabase Auth &amp; PostgreSQL</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Auth form card */}
          <div className="lg:col-span-6 max-w-md w-full mx-auto p-6 sm:p-8 rounded-2xl bg-bg-elevated border border-border shadow-surface">
            {/* Tab switch */}
            <div className="flex rounded-xl bg-bg-base p-1 border border-border mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setError(null);
                  setSuccessNotice(null);
                }}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                  !isSignUp
                    ? 'bg-surface-container-high text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setError(null);
                  setSuccessNotice(null);
                }}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                  isSignUp
                    ? 'bg-surface-container-high text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successNotice && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successNotice}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Display Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required={isSignUp}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your Name"
                      className="w-full bg-bg-base border border-border rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-bg-base border border-border rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-text-secondary">Password</label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email);
                        setForgotPasswordOpen(true);
                      }}
                      className="text-[11px] text-accent hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-bg-base border border-border rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 font-medium text-xs text-white bg-accent hover:brightness-110 active:scale-[0.99] py-2.5 rounded-lg transition-all shadow-[0_0_16px_rgba(239,68,68,0.25)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="font-mono">Authenticating...</span>
                ) : (
                  <>
                    <span>{isSignUp ? 'Create My Account' : 'Sign In'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Bypass */}
            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-[11px] text-text-muted mb-3">Testing or evaluating locally without credentials?</p>
              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full font-mono text-xs text-text-primary bg-bg-base hover:bg-bg-hover border border-border py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Sign In as Demo User (Instant)</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl bg-bg-elevated border border-border max-w-md w-full flex flex-col gap-4 shadow-surface relative">
            <button
              onClick={() => setForgotPasswordOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 text-accent">
              <KeyRound className="w-5 h-5" />
              <h3 className="text-sm font-bold text-text-primary">Reset Your Password</h3>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Enter your account email address. If connected to Supabase, a password recovery link will be sent to your inbox.
            </p>

            {resetMessage && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  resetMessage.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border border-red-500/30 text-red-300'
                }`}
              >
                {resetMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{resetMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-bg-base border border-border rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary border border-border hover:bg-bg-hover"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-accent hover:brightness-110 disabled:opacity-50"
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="py-4 text-center text-[11px] font-mono text-text-muted border-t border-border">
        <span>MEMORY AI · Grounded Information Retrieval &amp; Row Level Security</span>
      </footer>
    </div>
  );
};
