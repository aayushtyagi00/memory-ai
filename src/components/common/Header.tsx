import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, LogIn, User } from 'lucide-react';

export const Header: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-bg-base/85 backdrop-blur-xl border-b border-border">
      <div className="h-16 max-w-[1200px] mx-auto px-4 md:px-8 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
            <div className="w-8 h-8 rounded-lg bg-bg-elevated border border-border flex items-center justify-center text-accent">
              <span className="material-symbols-outlined text-[20px] text-accent">memory</span>
            </div>
            <span className="font-mono text-sm font-semibold tracking-wider text-text-primary uppercase">
              MEMORY AI
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#pipeline" className="text-text-muted hover:text-text-primary transition-colors">
              Pipeline
            </a>
            <a href="#features" className="text-text-muted hover:text-text-primary transition-colors">
              Features
            </a>
            <Link to="/memories" className="text-text-muted hover:text-text-primary transition-colors">
              Library
            </Link>
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-xs font-medium text-text-primary bg-bg-elevated hover:bg-bg-hover px-3.5 py-2 rounded-lg border border-border transition-all"
            >
              <User className="w-4 h-4 text-accent" />
              <span>Dashboard</span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-xs font-medium text-text-primary bg-bg-elevated hover:bg-bg-hover px-3.5 py-2 rounded-lg border border-border transition-all flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-text-secondary" />
                <span>Sign in</span>
              </Link>
              <button
                onClick={() => navigate('/login?signup=true')}
                className="text-xs font-medium text-white bg-accent hover:brightness-110 active:scale-95 px-3.5 py-2 rounded-lg transition-all shadow-[0_0_16px_rgba(239,68,68,0.25)] flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Start Building My Memory</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
