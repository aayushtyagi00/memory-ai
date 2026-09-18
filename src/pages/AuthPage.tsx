import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
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
  const [googleLoading, setGoogleLoading] = useState(false);

  // Forgot password modal state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { signIn, signUp, signInWithGoogle, user, isSupabaseActive, resetPassword } = useAuth();
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

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res.error) {
        setError(res.error);
        setGoogleLoading(false);
      }
      // Browser will redirect to Google OAuth flow
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed');
      setGoogleLoading(false);
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
        <Link
          to="/"
          className="text-xs font-medium text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg hover:bg-bg-hover transition-colors"
        >
          Back to Overview
        </Link>
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
                  <span>Row Level Security (RLS) ensures strictly isolated user memories</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Encrypted session management via Supabase Auth &amp; PostgreSQL</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Real Auth Form Card */}
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

            {/* Continue with Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full font-medium text-xs text-text-primary bg-bg-base hover:bg-bg-hover hover:border-border-strong border border-border py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}</span>
            </button>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-bg-elevated px-3 text-text-muted font-mono tracking-wider">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Email / Password Form */}
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
                disabled={loading || googleLoading}
                className="w-full mt-2 font-medium text-xs text-white bg-accent hover:brightness-110 active:scale-[0.99] py-2.5 rounded-lg transition-all shadow-[0_0_16px_rgba(239,68,68,0.25)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="font-mono">Authenticating...</span>
                ) : (
                  <>
                    <span>{isSignUp ? 'Create My Account' : 'Sign In with Email'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-border text-center">
              <p className="text-[11px] text-text-muted">
                {isSignUp ? (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(false);
                        setError(null);
                      }}
                      className="text-accent hover:underline font-medium"
                    >
                      Sign In
                    </button>
                  </>
                ) : (
                  <>
                    Don't have an account yet?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(true);
                        setError(null);
                      }}
                      className="text-accent hover:underline font-medium"
                    >
                      Create Account
                    </button>
                  </>
                )}
              </p>
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
              Enter your account email address. A password recovery link will be sent to your inbox.
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
