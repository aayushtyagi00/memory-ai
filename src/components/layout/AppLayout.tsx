import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  PlusCircle,
  MessageSquareText,
  FolderArchive,
  CalendarDays,
  Bell,
  Settings,
  LogOut,
  WifiOff,
  Database,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Add Memory', path: '/add', icon: PlusCircle },
    { label: 'Ask Memory', path: '/ask', icon: MessageSquareText, highlight: true },
    { label: 'Memory Library', path: '/memories', icon: FolderArchive },
    { label: 'Timeline', path: '/timeline', icon: CalendarDays },
    { label: 'Reminders', path: '/reminders', icon: Bell },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col md:flex-row font-sans">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 w-full z-[100] bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-center text-xs text-amber-300 flex items-center justify-center gap-2 backdrop-blur-md">
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          <span>You are offline. Your saved memories will sync when you reconnect. (AI querying requires network).</span>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col justify-between w-64 border-r border-border bg-bg-elevated p-4 shrink-0 h-screen sticky top-0">
        <div className="flex flex-col gap-6">
          {/* Logo & Brand */}
          <Link to="/dashboard" className="flex items-center gap-3 px-2 py-1.5 group">
            <div className="w-9 h-9 rounded-xl bg-accent-soft border border-accent/30 flex items-center justify-center text-accent group-hover:shadow-glow transition-all">
              <span className="material-symbols-outlined text-[20px] text-accent">memory</span>
            </div>
            <div>
              <h1 className="font-mono text-sm font-bold tracking-wider text-text-primary uppercase flex items-center gap-1.5">
                MEMORY AI
              </h1>
              <p className="font-mono text-[10px] text-text-muted">Personal Retrieval</p>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-accent/15 text-white border border-accent/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                      : item.highlight
                      ? 'bg-bg-hover/80 text-text-primary hover:bg-bg-hover hover:text-white border border-border'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive || item.highlight ? 'text-accent' : 'text-text-secondary'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.highlight && !isActive && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent/20 text-accent font-semibold">
                      AI
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-accent" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: User status & Sign Out */}
        <div className="flex flex-col gap-3 pt-4 border-t border-border">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-surface-container-high border border-border flex items-center justify-center font-mono text-xs text-accent font-bold">
                {user?.email?.[0].toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="font-mono text-[10px] text-text-muted truncate">
                  {user?.email || 'authenticated'}
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                await signOut();
                navigate('/', { replace: true });
              }}
              title="Sign Out"
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="px-2 py-1.5 rounded-lg bg-bg-base/60 border border-border text-[10px] font-mono text-text-muted flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3 text-accent" />
              Gemini File Search
            </span>
            <span className="text-success font-semibold">Connected</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0 overflow-y-auto">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-bg-elevated/95 backdrop-blur-xl border-t border-border px-3 py-2 flex items-center justify-around">
        <Link
          to="/dashboard"
          className={`flex flex-col items-center gap-1 text-[10px] ${
            location.pathname === '/dashboard' ? 'text-accent' : 'text-text-muted'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Home</span>
        </Link>

        <Link
          to="/memories"
          className={`flex flex-col items-center gap-1 text-[10px] ${
            location.pathname === '/memories' ? 'text-accent' : 'text-text-muted'
          }`}
        >
          <FolderArchive className="w-4 h-4" />
          <span>Library</span>
        </Link>

        {/* Central prominent "Ask" button */}
        <Link
          to="/ask"
          className="flex flex-col items-center justify-center -mt-5 w-12 h-12 rounded-full bg-accent text-white shadow-glow hover:scale-105 active:scale-95 transition-transform"
        >
          <Sparkles className="w-5 h-5" />
        </Link>

        <Link
          to="/timeline"
          className={`flex flex-col items-center gap-1 text-[10px] ${
            location.pathname === '/timeline' ? 'text-accent' : 'text-text-muted'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Timeline</span>
        </Link>

        <Link
          to="/settings"
          className={`flex flex-col items-center gap-1 text-[10px] ${
            location.pathname === '/settings' ? 'text-accent' : 'text-text-muted'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Link>
      </nav>
    </div>
  );
};
