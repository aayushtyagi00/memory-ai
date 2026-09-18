import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, formatStorageSize, USER_STORAGE_CAP_BYTES } from '../services/api';
import { UserStats } from '../types';
import { geminiService, SUPPORTED_MODELS, DEFAULT_MODEL } from '../services/gemini';
import {
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Key,
  Eye,
  EyeOff,
  Activity,
  ExternalLink,
  Check,
  Copy,
  Lock,
  LogOut,
  HardDrive,
  FileText,
  Image as ImageIcon,
  BookOpen,
  Trash2,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<UserStats>({
    total: 0,
    documents: 0,
    notes: 0,
    images: 0,
    storageBytes: 0,
    storageLimitBytes: USER_STORAGE_CAP_BYTES,
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(false);

  // Gemini API Configuration State
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs: number; error?: string } | null>(null);
  const [saveKeySuccess, setSaveKeySuccess] = useState(false);

  useEffect(() => {
    loadStats();
    // Load existing Gemini config
    const existingKey = geminiService.getApiKey();
    if (existingKey) setApiKey(existingKey);
    setSelectedModel(geminiService.getModel());
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

  const handleCopyUserId = async () => {
    if (!user?.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      setCopiedUserId(true);
      setTimeout(() => setCopiedUserId(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleDeleteAll = async () => {
    await api.clearAllMemories();
    await loadStats();
    setDeleteConfirmOpen(false);
  };

  const hasConfiguredGemini = Boolean(geminiService.getApiKey());
  const authProvider = user?.app_metadata?.provider || (user?.email?.endsWith('@gmail.com') ? 'Google' : 'Supabase Auth');
  const userDisplayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const storageUsed = stats.storageBytes || 0;
  const storageCap = stats.storageLimitBytes || USER_STORAGE_CAP_BYTES;
  const storagePercent = (storageUsed / storageCap) * 100;
  const storageFree = Math.max(0, storageCap - storageUsed);

  return (
    <div className="p-4 md:p-8 max-w-[900px] w-full mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Settings &amp; Privacy</h1>
        <p className="text-xs text-text-secondary mt-1">
          Manage your personal account, private memory vault security, and AI model preferences.
        </p>
      </div>

      {/* 1. User Profile & Account Card */}
      <div className="p-6 rounded-2xl bg-bg-elevated border border-border shadow-surface flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-accent-soft border border-accent/30 flex items-center justify-center text-accent text-base font-bold">
              {userDisplayName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <span>{userDisplayName}</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase font-semibold">
                  {authProvider}
                </span>
              </h2>
              <p className="text-xs text-text-muted mt-0.5">{user?.email || 'No email associated'}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="px-3.5 py-1.5 rounded-lg border border-border hover:bg-bg-hover text-text-secondary hover:text-text-primary text-xs font-medium flex items-center gap-1.5 transition-all self-start sm:self-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Storage Used Box with 5 GB Cap */}
          <div className="p-3.5 rounded-xl bg-bg-base border border-border flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-text-muted uppercase flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-accent" />
                <span>Vault Storage Used</span>
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20 font-semibold">
                {storagePercent < 0.01 ? '< 0.01%' : `${storagePercent.toFixed(2)}%`} of 5 GB
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-text-primary">
                  {formatStorageSize(storageUsed)}
                </span>
                <span className="text-xs text-text-muted font-mono">
                  / {formatStorageSize(storageCap)}
                </span>
              </div>
              <span className="text-[11px] text-emerald-400 font-mono">
                {formatStorageSize(storageFree)} free
              </span>
            </div>

            {/* Storage Progress Bar */}
            <div className="w-full h-1.5 bg-bg-elevated rounded-full overflow-hidden border border-border/70">
              <div
                className="h-full bg-gradient-to-r from-accent to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(storagePercent, 0.8))}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-bg-base border border-border flex flex-col gap-1">
            <span className="text-[10px] font-mono text-text-muted uppercase">Account Status</span>
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active · Verified Private Vault</span>
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-bg-base border border-border sm:col-span-2 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[10px] font-mono text-text-muted uppercase">User Vault ID</span>
              <span className="text-xs font-mono text-text-secondary truncate">
                {user?.id || 'offline-local-user'}
              </span>
            </div>
            {user?.id && (
              <button
                type="button"
                onClick={handleCopyUserId}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors shrink-0"
                title="Copy User ID"
              >
                {copiedUserId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Privacy & Vault Security Details */}
      <div className="p-6 rounded-2xl bg-bg-elevated border border-border shadow-surface flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">Data Privacy &amp; Encryption</h2>
            <p className="text-[11px] text-text-muted">Strict privacy guarantees for your personal memory vault.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-bg-base border border-border flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Row Level Security</span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              PostgreSQL Row Level Security (RLS) is active. Only your authenticated user ID can read or modify your data.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-bg-base border border-border flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
              <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Isolated Storage</span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Uploaded PDFs, notes, and receipts are compartmentalized in isolated cloud storage under your private folder.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-bg-base border border-border flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Zero Public Sharing</span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Your indexed memories are strictly personal. They are never published publicly or shared with third parties.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Gemini AI Configuration Card */}
      <div className="p-6 rounded-2xl bg-bg-elevated border border-border shadow-surface flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-soft border border-accent/30 flex items-center justify-center text-accent">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <span>Google Gemini AI Engine</span>
                <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-accent/15 text-accent font-semibold border border-accent/30 uppercase">
                  Grounded Reasoning
                </span>
              </h2>
              <p className="text-[11px] text-text-muted mt-0.5">
                Powers conversational search, multi-source verification, note auto-tagging, and deadline detection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-[10px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                hasConfiguredGemini
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                  : 'text-amber-400 bg-amber-400/10 border-amber-400/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  hasConfiguredGemini ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {hasConfiguredGemini ? 'Gemini Active' : 'API Key Optional'}
            </span>
          </div>
        </div>

        {/* API Key Input */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-text-primary">Gemini API Key</label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-accent hover:underline inline-flex items-center gap-1"
            >
              <span>Get API Key from Google AI Studio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="relative flex items-center">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Configured via environment (or paste custom key here)"
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
            API keys are kept strictly private on your device or in server environment variables (<code className="text-text-secondary">.env</code>).
          </span>
        </div>

        {/* Model Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-text-primary">Active Model</label>
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
              <span>Save Preferences</span>
            </button>
          </div>

          {saveKeySuccess && (
            <span className="font-mono text-xs text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Preferences saved successfully!
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
                  ? `Connection Verified! Latency: ${testResult.latencyMs} ms`
                  : 'Connection Test Failed'}
              </span>
              <span className="text-[11px] opacity-90">
                {testResult.success
                  ? `Model "${selectedModel}" is active and ready for grounded memory retrieval.`
                  : testResult.error}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Vault Storage Overview */}
      <div className="p-6 rounded-2xl bg-bg-elevated border border-border shadow-surface flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-soft border border-accent/30 flex items-center justify-center text-accent">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <span>Vault Storage Overview</span>
                <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase font-semibold">
                  5 GB User Quota
                </span>
              </h2>
              <p className="text-[11px] text-text-muted mt-0.5">
                {formatStorageSize(storageUsed)} of {formatStorageSize(storageCap)} used ({stats.total} memories indexed)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-text-secondary">
              {formatStorageSize(storageFree)} available
            </span>
          </div>
        </div>

        {/* Global Quota Bar */}
        <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-bg-base border border-border">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-text-muted">Capacity</span>
            <span className="text-text-primary font-semibold">
              {storagePercent < 0.01 ? '< 0.01%' : `${storagePercent.toFixed(2)}%`} of 5.00 GB
            </span>
          </div>
          <div className="w-full h-2 bg-bg-elevated rounded-full overflow-hidden border border-border/70">
            <div
              className="h-full bg-gradient-to-r from-accent via-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(storagePercent, 0.5))}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-bg-base border border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-text-primary">{stats.documents}</span>
              <span className="text-[10px] text-text-muted block">Documents &amp; PDFs</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-bg-base border border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-text-primary">{stats.notes}</span>
              <span className="text-[10px] text-text-muted block">Notes &amp; Thoughts</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-bg-base border border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-text-primary">{stats.images}</span>
              <span className="text-[10px] text-text-muted block">Images &amp; Receipts</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Danger Zone: Delete All Vault Data */}
      <div className="p-6 rounded-2xl bg-bg-elevated border border-red-500/20 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Danger Zone</span>
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
          <div>
            <h3 className="text-xs font-semibold text-text-primary">Purge Personal Memory Vault</h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              Permanently delete all indexed documents, notes, receipts, and linked reminders from your vault.
            </p>
          </div>

          <button
            onClick={() => setDeleteConfirmOpen(true)}
            className="text-xs font-medium text-red-400 hover:text-white hover:bg-red-600 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/30 transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Vault Data</span>
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
              This will permanently delete all {stats.total} memories and reminders stored in your private vault. This action cannot be undone.
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
                Yes, Purge Vault
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
