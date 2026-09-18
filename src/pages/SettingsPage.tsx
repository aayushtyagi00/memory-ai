import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { geminiService, SUPPORTED_MODELS, DEFAULT_MODEL } from '../services/gemini';
import {
  getSupabaseConfig,
  setSupabaseConfig,
  testSupabaseConnection,
  isSupabaseConfigured,
} from '../lib/supabase';
import { SUPABASE_MIGRATION_SQL } from '../services/migrationSql';
import {
  User,
  Database,
  Trash2,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Key,
  Eye,
  EyeOff,
  Activity,
  ExternalLink,
  Check,
  RefreshCw,
  Copy,
  Server,
  Code2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, isDemoUser, isSupabaseActive } = useAuth();

  const [stats, setStats] = useState({ total: 0, documents: 0, notes: 0, images: 0 });
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoLoadedMessage, setDemoLoadedMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Gemini API Configuration State
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs: number; error?: string } | null>(null);
  const [saveKeySuccess, setSaveKeySuccess] = useState(false);

  // Supabase Configuration State
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    error?: string;
    details?: string;
  } | null>(null);
  const [saveSupabaseSuccess, setSaveSupabaseSuccess] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  useEffect(() => {
    loadStats();
    // Load existing Gemini config
    const existingKey = geminiService.getApiKey();
    if (existingKey) setApiKey(existingKey);
    setSelectedModel(geminiService.getModel());

    // Load existing Supabase config
    const supaConfig = getSupabaseConfig();
    if (supaConfig.url) setSupabaseUrl(supaConfig.url);
    if (supaConfig.anonKey) setSupabaseAnonKey(supaConfig.anonKey);
  }, []);

  const loadStats = async () => {
    try {
      const s = await api.getStats();
      setStats(s);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveApiKey = () => {
    geminiService.setApiKey(apiKey);
    geminiService.setModel(selectedModel);
    setSaveKeySuccess(true);
    setTimeout(() => setSaveKeySuccess(false), 3000);
  };

  const handleTestApiKey = async () => {
    setIsTestingKey(true);
    setTestResult(null);
    try {
      const res = await geminiService.testConnection(apiKey.trim(), selectedModel);
      setTestResult(res);
      if (res.success) {
        geminiService.setApiKey(apiKey);
        geminiService.setModel(selectedModel);
      }
    } catch (err: any) {
      setTestResult({ success: false, latencyMs: 0, error: err?.message || 'Connection test failed.' });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleSaveSupabaseConfig = () => {
    setSupabaseConfig(supabaseUrl.trim(), supabaseAnonKey.trim());
    setSaveSupabaseSuccess(true);
    setTimeout(() => setSaveSupabaseSuccess(false), 3000);
  };

  const handleTestSupabaseConfig = async () => {
    setIsTestingSupabase(true);
    setSupabaseTestResult(null);
    try {
      const res = await testSupabaseConnection(supabaseUrl.trim(), supabaseAnonKey.trim());
      setSupabaseTestResult(res);
      if (res.success) {
        setSupabaseConfig(supabaseUrl.trim(), supabaseAnonKey.trim());
      }
    } catch (err: any) {
      setSupabaseTestResult({
        success: false,
        latencyMs: 0,
        error: err?.message || 'Supabase connection test failed.',
      });
    } finally {
      setIsTestingSupabase(false);
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_MIGRATION_SQL);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy SQL:', err);
    }
  };

  const handleLoadDemoData = async () => {
    setDemoLoading(true);
    setDemoLoadedMessage(null);
    try {
      const count = await api.loadDemoData();
      await loadStats();
      setDemoLoadedMessage(
        `Loaded ${count} synthetic demo memories (exam_schedule, project_announcement, hostel_receipt, internship_offer, professor_notes, fee_receipt). Ready for grounded retrieval!`
      );
    } catch (err) {
      console.error(err);
    } finally {
      setDemoLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    await api.clearAllMemories();
    await loadStats();
    setDeleteConfirmOpen(false);
  };

  const hasConfiguredGemini = Boolean(geminiService.getApiKey());
  const hasConfiguredSupabase = isSupabaseConfigured();

  return (
    <div className="p-4 md:p-8 max-w-[950px] w-full mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-xs text-text-secondary mt-1">
          Configure real Supabase authentication &amp; database, Google Gemini AI intelligence, and memory storage.
        </p>
      </div>

      {/* 1. Supabase Backend Configuration Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-b from-bg-elevated to-surface-container-low border border-border shadow-surface flex flex-col gap-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <span>Supabase Real Authentication &amp; Database</span>
                <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30 uppercase">
                  PostgreSQL + RLS
                </span>
              </h2>
              <p className="text-[11px] text-text-muted mt-0.5">
                Enable multi-user authentication, PostgreSQL row-level security, and cloud storage bucket sync.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-[10px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                hasConfiguredSupabase
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                  : 'text-amber-400 bg-amber-400/10 border-amber-400/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  hasConfiguredSupabase ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {hasConfiguredSupabase ? 'Supabase Active & Synced' : 'Local Storage Mode'}
            </span>
          </div>
        </div>

        {/* Project URL */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-text-primary flex items-center justify-between">
            <span>Supabase Project URL</span>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Open Supabase Dashboard</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </label>
          <input
            type="text"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
            placeholder="https://your-project-id.supabase.co"
            className="w-full bg-bg-base border border-border rounded-xl px-4 py-2.5 text-xs text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Anon Key */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-text-primary">
            <span>Supabase Anon Public Key</span>
          </label>
          <div className="relative flex items-center">
            <input
              type={showSupabaseKey ? 'text' : 'password'}
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full bg-bg-base border border-border rounded-xl pl-4 pr-12 py-2.5 text-xs text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => setShowSupabaseKey(!showSupabaseKey)}
              className="absolute right-3 p-1 text-text-muted hover:text-text-primary transition-colors"
            >
              {showSupabaseKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <span className="text-[10px] text-text-muted">
            Found in your Supabase project under: <strong>Project Settings &gt; API &gt; Project API keys (anon public)</strong>
          </span>
        </div>

        {/* Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestSupabaseConfig}
              disabled={isTestingSupabase || !supabaseUrl.trim() || !supabaseAnonKey.trim()}
              className="px-4 py-2 rounded-lg bg-bg-hover hover:bg-surface-container-high border border-border text-xs font-medium text-text-primary disabled:opacity-40 flex items-center gap-2 transition-all"
            >
              <Activity className={`w-3.5 h-3.5 text-emerald-400 ${isTestingSupabase ? 'animate-spin' : ''}`} />
              <span>{isTestingSupabase ? 'Testing Connection...' : 'Test Connection'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveSupabaseConfig}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium active:scale-95 transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)] flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Supabase Configuration</span>
            </button>
          </div>

          {saveSupabaseSuccess && (
            <span className="font-mono text-xs text-emerald-400 flex items-center gap-1.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              Supabase configuration saved!
            </span>
          )}
        </div>

        {/* Test Connection Alert */}
        {supabaseTestResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              supabaseTestResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {supabaseTestResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">
                {supabaseTestResult.success
                  ? `Connection Verified! Latency: ${supabaseTestResult.latencyMs} ms`
                  : 'Supabase Connection Failed'}
              </span>
              <span className="text-[11px] opacity-90">
                {supabaseTestResult.success
                  ? supabaseTestResult.details || 'Supabase Auth & Database are reachable and responsive.'
                  : supabaseTestResult.error}
              </span>
            </div>
          </div>
        )}

        {/* SQL Migration Setup Accordion */}
        <div className="border border-border/70 rounded-xl bg-bg-base overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSqlGuide(!showSqlGuide)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-bg-hover transition-colors"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span>Database Schema Setup (1-Click SQL Migration)</span>
            </div>
            <div className="flex items-center gap-2 text-text-muted text-xs">
              <span>{showSqlGuide ? 'Hide Instructions' : 'View SQL & Instructions'}</span>
              {showSqlGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showSqlGuide && (
            <div className="p-4 border-t border-border flex flex-col gap-4 text-xs">
              <ol className="list-decimal list-inside space-y-1.5 text-text-secondary">
                <li>Create a free project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">supabase.com</a>.</li>
                <li>Go to the <strong>SQL Editor</strong> tab on the left sidebar of your Supabase dashboard.</li>
                <li>Click the button below to copy the complete schema (creates tables, RLS policies, triggers, and the <code className="text-emerald-400 font-mono">memory-files</code> storage bucket).</li>
                <li>Paste it into the SQL Editor and click <strong>Run</strong>.</li>
                <li>Copy your <strong>Project URL</strong> and <strong>anon public key</strong> into the inputs above and click <strong>Save</strong>!</li>
              </ol>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-semibold flex items-center gap-2 transition-all"
                >
                  {sqlCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{sqlCopied ? 'Copied to Clipboard!' : 'Copy Complete Migration SQL'}</span>
                </button>

                <span className="font-mono text-[10px] text-text-muted">
                  Profiles, Memories, Notes, Reminders, Conversations, Storage
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Gemini API Configuration Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-b from-bg-elevated to-surface-container-low border border-border shadow-surface flex flex-col gap-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-soft border border-accent/30 flex items-center justify-center text-accent">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <span>Google Gemini API Configuration</span>
                <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-accent/15 text-accent font-semibold border border-accent/30 uppercase">
                  Direct AI Engine
                </span>
              </h2>
              <p className="text-[11px] text-text-muted mt-0.5">
                Power grounded memory Q&amp;A, note auto-tagging, multimodal vision extraction, and reminder detection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-[10px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                hasConfiguredGemini
                  ? 'text-success bg-success/10 border-success/30'
                  : 'text-amber-400 bg-amber-400/10 border-amber-400/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  hasConfiguredGemini ? 'bg-success animate-pulse' : 'bg-amber-400'
                }`}
              />
              {hasConfiguredGemini ? 'Gemini API Active' : 'Demo Grounding Mode'}
            </span>
          </div>
        </div>

        {/* API Key Input */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-text-primary flex items-center justify-between">
            <span>Gemini API Key</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-accent hover:underline inline-flex items-center gap-1"
            >
              <span>Get Free API Key from Google AI Studio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </label>

          <div className="relative flex items-center">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-bg-base border border-border rounded-xl pl-4 pr-12 py-2.5 text-xs text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="p-1.5 text-text-muted hover:text-text-primary rounded hover:bg-bg-hover transition-colors"
                title={showApiKey ? 'Hide Key' : 'Show Key'}
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <span className="text-[10px] text-text-muted">
            Stored securely in your local browser storage. Never transmitted to unauthorized endpoints.
          </span>
        </div>

        {/* Model Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-text-primary">Generation &amp; Vision Model</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SUPPORTED_MODELS.map((m) => {
              const isSelected = selectedModel === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedModel(m.id)}
                  className={`text-left p-3 rounded-xl border transition-all flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-accent/15 border-accent text-white shadow-sm'
                      : 'bg-bg-base border-border text-text-secondary hover:border-border-strong hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-text-primary">{m.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-accent" />}
                  </div>
                  <span className="text-[10px] text-text-muted">{m.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Test Connection & Save Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestApiKey}
              disabled={isTestingKey || !apiKey.trim()}
              className="px-4 py-2 rounded-lg bg-bg-hover hover:bg-surface-container-high border border-border text-xs font-medium text-text-primary disabled:opacity-40 flex items-center gap-2 transition-all"
            >
              <Activity className={`w-3.5 h-3.5 text-accent ${isTestingKey ? 'animate-spin' : ''}`} />
              <span>{isTestingKey ? 'Testing Connection...' : 'Test Connection'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveApiKey}
              className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-medium hover:brightness-110 active:scale-95 transition-all shadow-[0_0_12px_rgba(239,68,68,0.25)] flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Configuration</span>
            </button>
          </div>

          {saveKeySuccess && (
            <span className="font-mono text-xs text-emerald-400 flex items-center gap-1.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              Configuration saved successfully!
            </span>
          )}
        </div>

        {/* Live Test Results Alert */}
        {testResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">
                {testResult.success
                  ? `Gemini API connection verified! Response latency: ${testResult.latencyMs} ms`
                  : 'Connection failed'}
              </span>
              <span className="text-[11px] opacity-90">
                {testResult.success
                  ? `Model "${selectedModel}" is ready to perform grounded memory answering and content analysis.`
                  : testResult.error}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. User Profile Card */}
      <div className="p-6 rounded-2xl bg-bg-elevated border border-border flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <User className="w-4 h-4 text-accent" />
            <span>User Profile &amp; Authentication</span>
          </h2>
          <span
            className={`font-mono text-[10px] px-2.5 py-0.5 rounded-full border ${
              isDemoUser
                ? 'text-amber-400 bg-amber-400/10 border-amber-400/30'
                : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
            }`}
          >
            {isDemoUser ? 'Demo Guest Mode' : isSupabaseActive ? 'Supabase Authenticated' : 'Local User'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl bg-bg-base border border-border">
            <span className="text-[10px] font-mono text-text-muted uppercase block">Display Name</span>
            <span className="text-xs font-medium text-text-primary block mt-0.5">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Aayush'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-bg-base border border-border">
            <span className="text-[10px] font-mono text-text-muted uppercase block">Email</span>
            <span className="text-xs font-medium text-text-primary block mt-0.5">
              {user?.email || 'aayush@memory.ai'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-bg-base border border-border sm:col-span-2">
            <span className="text-[10px] font-mono text-text-muted uppercase block">User ID</span>
            <span className="text-xs font-mono text-text-secondary block mt-0.5 break-all">
              {user?.id || 'demo-user-13506280'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Demo Data Loader (One-Click Judge Demo) */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-bg-elevated via-bg-elevated to-accent-soft/30 border border-border flex flex-col gap-3 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-bold text-text-primary">Demo Data &amp; Benchmark Loader</h2>
          </div>
          <span className="font-mono text-[10px] text-accent uppercase tracking-wider">
            BENCHMARK READY
          </span>
        </div>

        <p className="text-xs text-text-secondary leading-relaxed">
          Seed the complete synthetic test dataset including DBMS exam schedule, final project announcement, campus hostel receipt, Nova Labs internship offer, professor notes, and semester fee receipt.
        </p>

        {demoLoadedMessage && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{demoLoadedMessage}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="font-mono text-xs text-text-muted">
            Currently: {stats.total} memories ({stats.documents} documents, {stats.notes} notes, {stats.images} images)
          </span>

          <button
            onClick={handleLoadDemoData}
            disabled={demoLoading}
            className="text-xs font-medium text-white bg-accent hover:brightness-110 active:scale-95 px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-[0_0_12px_rgba(239,68,68,0.25)]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${demoLoading ? 'animate-spin' : ''}`} />
            <span>{demoLoading ? 'Loading...' : 'Reload Benchmark Dataset'}</span>
          </button>
        </div>
      </div>

      {/* 5. Danger Zone: Delete All Memories */}
      <div className="p-6 rounded-2xl bg-bg-elevated border border-red-500/20 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Danger Zone</span>
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
          <div>
            <h3 className="text-xs font-semibold text-text-primary">Delete All Stored Memories</h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              Permanently purge all documents, notes, extracted images and linked reminders.
            </p>
          </div>

          <button
            onClick={() => setDeleteConfirmOpen(true)}
            className="text-xs font-medium text-red-400 hover:text-white hover:bg-red-600 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/30 transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Data</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl bg-bg-elevated border border-border max-w-md w-full flex flex-col gap-4 shadow-surface">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-sm font-bold text-text-primary">Confirm Deletion of All Memories</h3>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              This will permanently delete all {stats.total} indexed memories and associated reminders. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary border border-border hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Yes, Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
