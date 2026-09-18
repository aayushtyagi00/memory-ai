import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-6">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-bg-elevated border border-red-500/30 shadow-surface flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-text-primary">Something went wrong</h2>
              <p className="text-xs text-text-secondary">
                An unexpected interface error occurred. Your stored memories and data are secure in your vault.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full text-left p-3 rounded-xl bg-bg-base/70 border border-border overflow-hidden">
                <p className="text-[11px] font-mono text-red-400 break-words line-clamp-3">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2.5 w-full pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 py-2 px-3 rounded-xl bg-bg-base border border-border hover:bg-bg-hover text-xs font-medium text-text-primary transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-accent" />
                <span>Try Again</span>
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 py-2 px-3 rounded-xl bg-accent hover:brightness-110 text-xs font-medium text-white shadow-glow transition-all flex items-center justify-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Reload App</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
