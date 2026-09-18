import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { geminiService } from '../services/gemini';
import { Memory, UserStats, Reminder } from '../types';
import {
  Sparkles,
  Files,
  FileText,
  Image as ImageIcon,
  FileCode,
  ArrowRight,
  Search,
  PlusCircle,
  Star,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderArchive,
  Bell,
  Calendar,
  Key
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<UserStats>({ total: 0, documents: 0, notes: 0, images: 0 });
  const [recentMemories, setRecentMemories] = useState<Memory[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(geminiService.hasApiKey());

  useEffect(() => {
    setHasApiKey(geminiService.hasApiKey());
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [s, memories, reminders] = await Promise.all([
        api.getStats(),
        api.listMemories(),
        api.listReminders(),
      ]);
      setStats(s);
      setRecentMemories(memories.slice(0, 6));
      setUpcomingReminders(reminders.filter((r) => r.status === 'pending').slice(0, 4));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuick = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/ask?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/ask');
    }
  };

  const getTypeIcon = (type: string) => {
    if (type === 'image') return <ImageIcon className="w-4 h-4 text-amber-400" />;
    if (type === 'note') return <FileCode className="w-4 h-4 text-emerald-400" />;
    return <FileText className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className="p-4 md:p-8 max-w-[1200px] w-full mx-auto flex flex-col gap-8">
      {/* Top Greeting & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
              Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
            </h1>
            {hasApiKey ? (
              <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Gemini Active
              </span>
            ) : (
              <Link
                to="/settings"
                className="font-mono text-[9px] px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 hover:bg-amber-400/20 transition-colors flex items-center gap-1"
              >
                <Key className="w-2.5 h-2.5" />
                Connect Gemini API
              </Link>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Your personal memories are indexed and ready for grounded question answering.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            to="/add"
            className="flex-1 sm:flex-none text-xs font-medium text-text-primary bg-bg-elevated hover:bg-bg-hover px-4 py-2.5 rounded-lg border border-border transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4 text-accent" />
            <span>Add Memory</span>
          </Link>
          <Link
            to="/ask"
            className="flex-1 sm:flex-none text-xs font-medium text-white bg-accent hover:brightness-110 active:scale-95 px-4 py-2.5 rounded-lg transition-all shadow-[0_0_16px_rgba(239,68,68,0.25)] flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Ask Memory</span>
          </Link>
        </div>
      </div>

      {/* Prominent "Ask Your Memory" Bar */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-bg-elevated via-bg-elevated to-accent-soft/30 border border-border shadow-surface relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <span className="font-mono text-[10px] text-accent font-semibold tracking-wider uppercase">
            {hasApiKey ? 'POWERED BY GOOGLE GEMINI 2.5 FLASH' : 'GROUNDED RETRIEVAL ENGINE'}
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-text-primary mt-1 mb-3">
            What would you like to retrieve from your memory?
          </h2>

          <form onSubmit={handleAskQuick} className="relative flex items-center">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ask anything (e.g. When is my DBMS exam? How much did I pay for hostel?)"
              className="w-full bg-bg-base border border-border rounded-xl pl-10 pr-24 py-3 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent shadow-inner"
            />
            <button
              type="submit"
              className="absolute right-2 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:brightness-110 flex items-center gap-1.5 transition-all"
            >
              <span>Ask</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="font-mono text-[10px] text-text-muted">Try asking:</span>
            {[
              'When is my DBMS exam?',
              'How much did I pay for hostel?',
              'What did professor advise?',
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => navigate(`/ask?q=${encodeURIComponent(q)}`)}
                className="text-[10px] font-mono text-text-secondary hover:text-text-primary px-2.5 py-1 rounded bg-bg-base/70 border border-border hover:border-accent/30 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-bg-elevated border border-border flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-text-muted uppercase">Total Memories</span>
            <FolderArchive className="w-4 h-4 text-text-muted" />
          </div>
          <span className="text-2xl font-bold text-text-primary">{stats.total}</span>
          <span className="text-[10px] font-mono text-success">Indexed in Store</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-elevated border border-border flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-text-muted uppercase">Documents</span>
            <FileText className="w-4 h-4 text-red-400" />
          </div>
          <span className="text-2xl font-bold text-text-primary">{stats.documents}</span>
          <span className="text-[10px] font-mono text-text-muted">PDFs &amp; Papers</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-elevated border border-border flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-text-muted uppercase">Notes</span>
            <FileCode className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-bold text-text-primary">{stats.notes}</span>
          <span className="text-[10px] font-mono text-text-muted">Meeting &amp; Guidance</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-elevated border border-border flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-text-muted uppercase">Images / Receipts</span>
            <ImageIcon className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-bold text-text-primary">{stats.images}</span>
          <span className="text-[10px] font-mono text-text-muted">Vision Extracted</span>
        </div>
      </div>

      {/* Two Column Section: Recent Memories & Upcoming Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recent Memories (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              <span>Recent Memories</span>
            </h3>
            <Link
              to="/memories"
              className="text-xs font-mono text-accent hover:underline flex items-center gap-1"
            >
              <span>View all ({stats.total})</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentMemories.map((m) => (
              <Link
                key={m.id}
                to={`/memories/${m.id}`}
                className="p-4 rounded-xl bg-bg-elevated border border-border hover:border-accent/40 hover:bg-bg-hover transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[9px] uppercase px-2 py-0.5 rounded bg-bg-base border border-border text-text-muted">
                      {m.category || 'General'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {m.is_favorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                      {getTypeIcon(m.type)}
                    </div>
                  </div>

                  <h4 className="text-xs font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-1">
                    {m.title}
                  </h4>
                  <p className="text-[11px] text-text-secondary line-clamp-2 mt-1 leading-relaxed">
                    {m.description || m.content || 'Indexed memory file'}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-border flex items-center justify-between font-mono text-[10px] text-text-muted">
                  <span>{m.original_file_name || 'Note'}</span>
                  <span>{new Date(m.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Upcoming Deadlines / Reminders (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Bell className="w-4 h-4 text-accent" />
              <span>Upcoming Reminders</span>
            </h3>
            <Link
              to="/reminders"
              className="text-xs font-mono text-accent hover:underline flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex flex-col gap-2.5">
            {upcomingReminders.length === 0 ? (
              <div className="p-6 rounded-xl bg-bg-elevated border border-border text-center text-xs text-text-muted flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-text-muted" />
                <p>No pending reminders.</p>
                <Link to="/reminders" className="text-accent underline font-mono text-[11px]">
                  Extract from Memories
                </Link>
              </div>
            ) : (
              upcomingReminders.map((rem) => (
                <div
                  key={rem.id}
                  className="p-3 rounded-xl bg-bg-elevated border border-border flex flex-col gap-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-text-primary">{rem.title}</span>
                    {rem.due_at && (
                      <span className="font-mono text-[10px] text-accent shrink-0 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(rem.due_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  {rem.description && (
                    <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
                      {rem.description}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
