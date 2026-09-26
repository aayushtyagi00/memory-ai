import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  X,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

const MEMORY_LOGO_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1VpGfiThLWaMOO76r99e6YbUWRnJEOe6YlDPypWtK-Gao8T7h_k7ZPedGLfMS2NsdL6Bo8tb1ep1vNlrOfDP9BBdqlcECMH3wUOdx02ltdkgmSv0FPzA_NQUwLh-7hDdHQapkqWKzZWPuxoytCGBCxYcdAY2kD4Bbopewb8c-j7NSmT5UQwch9CwwLJ6YlBm1umSixQ_AQ4yqTOvDOhywfMtqlMgmNKn4JtZksiMk70HbdwzZV-urmbDBEX';

export const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isSignUpInitial = searchParams.get('signup') === 'true';
  const [isSignUp, setIsSignUp] = useState(isSignUpInitial);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Statuses
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Forgot password modal
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { signIn, signUp, signInWithGoogle, user, resetPassword } = useAuth();
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
            `Account created! A confirmation link has been sent to ${email}. Check your inbox, then sign in.`
          );
          setIsSignUp(false);
        } else {
          navigate('/dashboard');
        }
      } else {
        const res = await signIn(email, password);
        if (res.error) {
          setError(res.error);
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your credentials.');
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
          text: `Password reset link sent to ${resetEmail}. Check your inbox.`,
        });
      }
    } catch (err: any) {
      setResetMessage({ type: 'error', text: err?.message || 'Failed to send reset link.' });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="bg-bg-base text-text-primary min-h-screen flex flex-col justify-between font-sans selection:bg-accent-soft selection:text-text-primary">
      {/* Fixed top header */}
      <header className="fixed top-0 w-full z-50 bg-bg-base/80 backdrop-blur-xl border-b border-border shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 max-w-[1200px] mx-auto px-4 md:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              alt="Memory AI Logo"
              className="h-8 w-auto object-contain rounded-md"
              src={MEMORY_LOGO_URL}
              onError={(e) => {
                // Inline SVG fallback if CDN image is inaccessible
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent && !parent.querySelector('.logo-fallback')) {
                  const fallback = document.createElement('div');
                  fallback.className =
                    'logo-fallback w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm';
                  fallback.textContent = 'M';
                  parent.insertBefore(fallback, e.currentTarget);
                }
              }}
            />
            <span className="text-lg font-semibold tracking-tight text-text-primary">
              Memory AI
            </span>
          </Link>

          <div className="flex items-center">
            <Link
              to="/"
              className="text-xs font-medium text-text-secondary hover:text-text-primary px-3.5 py-1.5 rounded-lg border border-border bg-bg-elevated/60 hover:bg-bg-hover transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span>Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main split container */}
      <main className="w-full flex-1 pt-16 bg-bg-base flex flex-col justify-center max-w-[1200px] mx-auto px-4 md:px-8">
        <div className="flex flex-col w-full py-8 lg:py-12">
          <div className="w-full min-h-[calc(100vh-140px)] flex flex-col lg:flex-row items-stretch justify-between gap-12 lg:gap-8">
            
            {/* Left 45% Brand Technical Panel */}
            <div className="relative w-full lg:w-[45%] flex flex-col justify-between p-6 md:p-10 bg-bg-base overflow-hidden rounded-2xl border border-border/40">
              {/* Ambient localized red radial glow */}
              <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-accent-soft blur-3xl pointer-events-none -z-0" />
              <div className="absolute bottom-1/4 right-0 w-80 h-80 rounded-full bg-accent-soft/50 blur-3xl pointer-events-none -z-0" />

              {/* Top Branding Section */}
              <div className="relative z-10 flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <img
                    alt="Memory AI Logo"
                    className="w-9 h-9 object-contain rounded-lg shadow-sm"
                    src={MEMORY_LOGO_URL}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <span className="text-lg font-bold tracking-tight text-text-primary font-mono">
                    MEMORY AI
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary leading-tight tracking-tight">
                    Your personal, <br className="hidden sm:inline" />
                    <span className="text-text-secondary">searchable memory.</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-text-secondary max-w-md leading-relaxed">
                    Upload documents, notes, and screenshots. Query them with verified citations and zero data leakage.
                  </p>
                </div>

                {/* 4-Step Technical Architecture Pipeline */}
                <div className="w-full max-w-md p-4 rounded-xl bg-bg-elevated/70 border border-border flex flex-col gap-3 backdrop-blur-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                      Grounded Indexing Architecture
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      <span className="font-mono text-[11px] text-text-secondary">ENGINE READY</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5 group">
                      <span className="font-mono text-xs text-accent font-semibold pt-0.5">01 ·</span>
                      <div>
                        <span className="font-mono text-xs text-text-primary font-medium block">
                          ADD MEMORY
                        </span>
                        <span className="text-xs text-text-secondary">
                          PDFs, notes, receipts &amp; research papers
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 group">
                      <span className="font-mono text-xs text-accent font-semibold pt-0.5">02 ·</span>
                      <div>
                        <span className="font-mono text-xs text-text-primary font-medium block">
                          AI INDEXES
                        </span>
                        <span className="text-xs text-text-secondary">
                          Gemini File Search &amp; deterministic chunking
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 group">
                      <span className="font-mono text-xs text-accent font-semibold pt-0.5">03 ·</span>
                      <div>
                        <span className="font-mono text-xs text-text-primary font-medium block">
                          ASK QUESTIONS
                        </span>
                        <span className="text-xs text-text-secondary">
                          Natural language queries with instant recall
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 group">
                      <span className="font-mono text-xs text-accent font-semibold pt-0.5">04 ·</span>
                      <div>
                        <span className="font-mono text-xs text-text-primary font-medium block">
                          GROUNDED RECALL
                        </span>
                        <span className="text-xs text-text-secondary">
                          Strict evidence citations with page-level inspection
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security / Protocol Badge at Bottom */}
              <div className="relative z-10 pt-6 mt-6 border-t border-border/60">
                <div className="flex items-center gap-2 text-text-muted">
                  <span className="material-symbols-outlined text-[16px] text-accent">verified_user</span>
                  <span className="font-mono text-[11px] tracking-wide">
                    ENCRYPTION: 256-BIT AES · ROW-LEVEL SECURITY ENFORCED
                  </span>
                </div>
              </div>
            </div>

            {/* Right 55% Form Section */}
            <div className="relative w-full lg:w-[55%] flex items-center justify-center p-4 sm:p-8 lg:p-10 bg-bg-base lg:bg-transparent">
              {/* Radial spotlight behind auth card */}
              <div className="absolute w-[460px] h-[460px] bg-accent-soft/30 blur-3xl rounded-full pointer-events-none -z-0" />

              {/* Auth Container Box */}
              <div className="relative z-10 w-full max-w-sm p-6 sm:p-8 rounded-2xl bg-bg-elevated border border-border shadow-2xl flex flex-col gap-4">
                
                {/* Segmented Toggle */}
                <div className="w-full grid grid-cols-2 p-1 bg-bg-base rounded-xl border border-border">
                  <button
                    id="tab-signin"
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setError(null);
                      setSuccessNotice(null);
                    }}
                    className={`py-1.5 px-3 rounded-lg text-xs font-medium text-center transition-all cursor-pointer ${
                      !isSignUp
                        ? 'bg-bg-hover border border-border-strong text-text-primary shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    id="tab-signup"
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setError(null);
                      setSuccessNotice(null);
                    }}
                    className={`py-1.5 px-3 rounded-lg text-xs font-medium text-center transition-all cursor-pointer ${
                      isSignUp
                        ? 'bg-bg-hover border border-border-strong text-text-primary shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                {/* Heading Group */}
                <div className="flex flex-col gap-1 mt-1">
                  <h2 className="text-xl font-bold text-text-primary" id="auth-title">
                    {isSignUp ? 'Create your vault' : 'Welcome back'}
                  </h2>
                  <p className="text-xs text-text-secondary" id="auth-subtitle">
                    {isSignUp
                      ? 'Begin indexing your personal knowledge graph securely'
                      : 'Enter your credentials to access your private memory index'}
                  </p>
                </div>

                {/* Form Elements */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-1">
                  {/* Full Name field (on Sign Up) */}
                  {isSignUp && (
                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-xs text-text-primary" htmlFor="name-input">
                        Full Name
                      </label>
                      <div className="relative flex items-center">
                        <input
                          id="name-input"
                          type="text"
                          required={isSignUp}
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Alex Chen"
                          className="w-full bg-bg-base border border-border focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 rounded-lg px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-muted transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Field 1: Email Address */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-xs text-text-primary" htmlFor="email-input">
                      Email Address
                    </label>
                    <input
                      id="email-input"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex.chen@domain.edu"
                      className="w-full bg-bg-base border border-border focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 rounded-lg px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-muted transition-all"
                    />
                  </div>

                  {/* Field 2: Password */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-mono text-xs text-text-primary" htmlFor="password-input">
                        Password
                      </label>
                      {!isSignUp && (
                        <button
                          type="button"
                          onClick={() => {
                            setResetEmail(email);
                            setForgotPasswordOpen(true);
                          }}
                          className="text-xs text-text-secondary hover:text-accent transition-colors"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <input
                        id="password-input"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-bg-base border border-border focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 rounded-lg px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-muted pr-11 transition-all"
                      />
                      <button
                        type="button"
                        id="toggle-password"
                        aria-label="Toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 p-1 text-text-muted hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]" id="eye-icon">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Inline error alert */}
                  {error && (
                    <div className="flex items-center gap-1.5 text-accent text-xs bg-accent-soft/40 px-3 py-2 rounded-lg border border-accent/20 animate-fadeIn">
                      <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Inline success alert */}
                  {successNotice && (
                    <div className="flex items-start gap-1.5 text-emerald-400 text-xs bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{successNotice}</span>
                    </div>
                  )}

                  {/* Primary Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || googleLoading}
                    className="w-full mt-1 bg-accent hover:brightness-110 active:scale-[0.98] text-white font-medium text-xs py-2.5 px-4 rounded-lg shadow-lg shadow-accent/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="font-mono">Processing...</span>
                    ) : (
                      <>
                        <span id="submit-text">
                          {isSignUp ? 'Initialize Memory Space' : 'Continue to Your Memory'}
                        </span>
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative flex items-center justify-center my-2">
                  <div className="w-full border-t border-border" />
                  <span className="absolute px-3 bg-bg-elevated font-mono text-[10px] text-text-muted uppercase">
                    OR
                  </span>
                </div>

                {/* Google OAuth Provider */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className="w-full bg-bg-hover hover:border-border-strong border border-border text-text-primary text-xs font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-3 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <svg aria-hidden="true" className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.26v3.13C3.27 21.36 7.34 24 12 24z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.61H1.26C.46 8.21 0 10.05 0 12s.46 3.79 1.26 5.39l4.02-3.13z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.64 1.26 6.61l4.02 3.13c.95-2.84 3.6-4.99 6.72-4.99z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>{googleLoading ? 'Connecting...' : 'Continue with Google'}</span>
                </button>

                {/* Dynamic Context Switch Link */}
                <p className="text-xs text-text-secondary text-center mt-1">
                  <span id="footer-helper">
                    {isSignUp ? 'Already have an index?' : "Don't have an account?"}
                  </span>
                  <button
                    type="button"
                    id="toggle-form-mode"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError(null);
                      setSuccessNotice(null);
                    }}
                    className="text-accent text-xs font-medium hover:underline ml-1 cursor-pointer"
                  >
                    {isSignUp ? 'Sign in' : 'Sign up'}
                  </button>
                </p>
              </div>

              {/* Trust Badge Below Container */}
              <div className="absolute bottom-4 sm:bottom-6 text-center">
                <span className="font-mono text-[11px] text-text-muted">
                  Protected by Supabase Auth · Zero telemetry on personal files
                </span>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl bg-bg-elevated border border-border max-w-md w-full flex flex-col gap-4 shadow-2xl relative">
            <button
              onClick={() => setForgotPasswordOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1 rounded-lg transition-colors"
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
                <label className="block text-xs font-mono text-text-secondary mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="alex.chen@domain.edu"
                  className="w-full bg-bg-base border border-border rounded-lg px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary border border-border hover:bg-bg-hover transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-accent hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full bg-bg-base py-4 border-t border-border">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-text-muted font-mono text-[11px]">
          <span>© 2025 MEMORY AI INC. ALL RIGHTS RESERVED.</span>
          <div className="flex items-center gap-4">
            <span>GROUNDED RETRIEVAL PROTOCOL</span>
            <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
            <span>ENCRYPTED LAYER</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
