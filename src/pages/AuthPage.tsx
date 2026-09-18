import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, ArrowRight, Lock, Mail, User, AlertCircle, ShieldCheck } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isSignUpInitial = searchParams.get('signup') === 'true';
  const [isSignUp, setIsSignUp] = useState(isSignUpInitial);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, enableDemoUser, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const res = await signUp(email, password, displayName);
        if (res.error) setError(res.error);
        else navigate('/dashboard');
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
          {/* Left: Brand showcase panel (matches screen 2) */}
          <div className="lg:col-span-6 relative p-8 md:p-12 rounded-2xl bg-bg-elevated/80 border border-border overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-accent-soft blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col gap-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-soft border border-accent/20 w-max">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping"></span>
                <span className="font-mono text-[11px] text-primary uppercase tracking-wider">
                  SECURE ACCESS
                </span>
              </div>

              <div>
                <h2 className="text-2xl sm:text-4xl font-bold text-text-primary tracking-tight leading-tight">
                  Your personal, <br />
                  <span className="text-text-secondary">searchable memory.</span>
                </h2>
                <p className="text-xs sm:text-sm text-text-muted mt-3 leading-relaxed">
                  Sign in to access your private Gemini File Search Store. Every document, image and note is indexed securely with row-level security.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-4 border-t border-border/80">
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <ShieldCheck className="w-4 h-4 text-success shrink-0" />
                  <span>Isolated FileSearchStore scoped strictly to your account</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <Lock className="w-4 h-4 text-success shrink-0" />
                  <span>Server-side secrets only — API keys never exposed to clients</span>
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
                onClick={() => { setIsSignUp(false); setError(null); }}
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
                onClick={() => { setIsSignUp(true); setError(null); }}
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
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Password
                </label>
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
                  <span className="font-mono">Processing...</span>
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
              <p className="text-[11px] text-text-muted mb-3">Hackathon evaluation or testing locally?</p>
              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full font-mono text-xs text-text-primary bg-bg-base hover:bg-bg-hover border border-border py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Sign In as Demo User (Pre-seeded)</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-[11px] font-mono text-text-muted border-t border-border">
        <span>MEMORY AI · Grounded Information Retrieval</span>
      </footer>
    </div>
  );
};
