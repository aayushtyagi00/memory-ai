import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/common/Header';
import {
  UploadCloud,
  Cpu,
  HelpCircle,
  CheckCircle2,
  FileCheck2,
  ArrowRight,
  Shield,
  Image as ImageIcon,
  Sparkles,
  Zap,
  Lock,
  Search
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, isLoading, enableDemoUser } = useAuth();
  const navigate = useNavigate();

  // If user is already authenticated, redirect directly to /dashboard
  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleStartBuilding = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login?signup=true');
    }
  };

  const handleExploreDemo = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      enableDemoUser();
    }
    navigate('/ask');
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col font-sans selection:bg-accent-soft selection:text-text-primary">
      <Header />

      {/* Hero Section */}
      <main className="pt-24 flex-1 flex flex-col items-center relative overflow-hidden">
        {/* Ambient atmospheric red glow */}
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[480px] bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.1)_0%,transparent_70%)] blur-3xl"></div>

        <div className="max-w-[1100px] mx-auto px-4 md:px-8 flex flex-col items-center text-center relative z-10 pt-8 pb-16">
          {/* Top Pill Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-soft border border-accent/30 mb-6">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
            <span className="font-mono text-xs text-primary font-medium tracking-widest uppercase">
              PRIVATE · PERSONAL · GROUNDED
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-text-primary max-w-4xl mb-6">
            Never lose important <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-amber-200">
              information again.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-xl text-text-secondary max-w-2xl mb-10 leading-relaxed font-normal">
            Upload your documents, screenshots and notes. Ask questions about your own information. Get grounded answers with evidence.
          </p>

          {/* CTA Buttons Row */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
            <button
              onClick={handleStartBuilding}
              className="w-full sm:w-auto font-medium text-sm text-white bg-accent hover:brightness-110 active:scale-[0.98] px-7 py-3.5 rounded-xl transition-all shadow-[0_0_24px_rgba(239,68,68,0.3)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{user ? 'Go to Dashboard' : 'Start Building My Memory'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleExploreDemo}
              className="w-full sm:w-auto font-medium text-sm text-text-primary bg-bg-elevated hover:bg-bg-hover px-7 py-3.5 rounded-xl border border-border transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4 text-text-secondary" />
              <span>Explore Interactive Demo</span>
            </button>
          </div>

          {/* The Core Pipeline Visualization (The Architectural Truth) */}
          <div id="pipeline" className="w-full mt-4 p-6 sm:p-8 rounded-2xl bg-bg-elevated/70 border border-border backdrop-blur-xl shadow-surface relative">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
              <div className="text-left">
                <span className="font-mono text-xs text-accent font-semibold tracking-wider uppercase">
                  THE RETRIEVAL PIPELINE
                </span>
                <h3 className="text-sm font-medium text-text-primary mt-0.5">
                  How MEMORY AI Grounds Every Single Answer
                </h3>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-xs text-text-muted bg-bg-base px-2.5 py-1 rounded-md border border-border">
                <Lock className="w-3 h-3 text-success" /> Scoped Per User
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center p-4 rounded-xl bg-bg-base/70 border border-border/70 hover:border-accent/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-accent mb-3">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <span className="font-mono text-[11px] text-text-muted mb-1">01. INGEST</span>
                <h4 className="text-xs font-semibold text-text-primary">Add Memory</h4>
                <p className="text-[11px] text-text-secondary mt-1">PDF, DOCX, TXT, Notes &amp; Screenshots</p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center p-4 rounded-xl bg-bg-base/70 border border-border/70 hover:border-accent/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
                  <Cpu className="w-5 h-5" />
                </div>
                <span className="font-mono text-[11px] text-text-muted mb-1">02. INDEX</span>
                <h4 className="text-xs font-semibold text-text-primary">File Search Store</h4>
                <p className="text-[11px] text-text-secondary mt-1">Multimodal embedding-2 indexes vectors</p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center p-4 rounded-xl bg-bg-base/70 border border-border/70 hover:border-accent/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <span className="font-mono text-[11px] text-text-muted mb-1">03. QUERY</span>
                <h4 className="text-xs font-semibold text-text-primary">Ask Question</h4>
                <p className="text-[11px] text-text-secondary mt-1">Natural language queries about your data</p>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center text-center p-4 rounded-xl bg-bg-base/70 border border-border/70 hover:border-accent/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="font-mono text-[11px] text-text-muted mb-1">04. GROUND</span>
                <h4 className="text-xs font-semibold text-text-primary">Grounded Answer</h4>
                <p className="text-[11px] text-text-secondary mt-1">Gemini synthesizes ONLY from retrieved facts</p>
              </div>

              {/* Step 5 */}
              <div className="flex flex-col items-center text-center p-4 rounded-xl bg-bg-base/70 border border-border/70 hover:border-accent/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <span className="font-mono text-[11px] text-text-muted mb-1">05. VERIFY</span>
                <h4 className="text-xs font-semibold text-text-primary">Source Evidence</h4>
                <p className="text-[11px] text-text-secondary mt-1">Exact file citations &amp; verified snippets</p>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div id="features" className="w-full mt-24 text-left">
            <div className="mb-10 text-center">
              <span className="font-mono text-xs text-accent font-semibold tracking-wider uppercase">
                WHY MEMORY AI
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mt-2">
                Not Just Another Generic Chatbot
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-bg-elevated border border-border">
                <div className="w-10 h-10 rounded-xl bg-accent-soft border border-accent/20 flex items-center justify-center text-accent mb-4">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-2">Zero Hallucinations Policy</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  If your memories don't contain the answer, Memory AI explicitly replies: <span className="font-mono text-primary font-medium">"I couldn't find this information in your memories."</span> No fabricated claims.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-bg-elevated border border-border">
                <div className="w-10 h-10 rounded-xl bg-accent-soft border border-accent/20 flex items-center justify-center text-accent mb-4">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-2">Native Screenshot Search</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Powered by <span className="font-mono text-primary">models/gemini-embedding-2</span>, screenshot receipts, whiteboards, and handwritten notes are embedded natively and searchable without messy OCR.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-bg-elevated border border-border">
                <div className="w-10 h-10 rounded-xl bg-accent-soft border border-accent/20 flex items-center justify-center text-accent mb-4">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-2">Conflict Surfacing</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  When different documents have contradictory deadlines or figures, Memory AI flags the conflict and quotes both sources instead of silently picking one.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-bg-elevated/50 py-8 text-center text-xs text-text-muted font-mono">
        <p>MEMORY AI — Google AI Studio Build Specification · Grounded Personal Retrieval</p>
      </footer>
    </div>
  );
};
