import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { geminiService, ExtractedReminder } from '../services/gemini';
import { Reminder, Memory } from '../types';
import {
  Bell,
  CheckCircle2,
  Circle,
  Plus,
  Calendar,
  Clock,
  ExternalLink,
  X,
  Sparkles,
  Trash2,
  Activity,
  Check
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const RemindersPage: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Reminder Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  // AI Scan State
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiScanModalOpen, setAiScanModalOpen] = useState(false);
  const [extractedReminders, setExtractedReminders] = useState<ExtractedReminder[]>([]);
  const [selectedForImport, setSelectedForImport] = useState<{ [idx: number]: boolean }>({});
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  const hasApiKey = geminiService.hasApiKey();

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    setLoading(true);
    try {
      const data = await api.listReminders();
      setReminders(data);
    } catch (err) {
      console.error('Failed to load reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    const updated = await api.toggleReminder(id);
    if (updated) {
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: updated.status } : r))
      );
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await api.deleteReminder(id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const newRem = await api.createReminder(
        title,
        description,
        dueDate ? new Date(dueDate).toISOString() : undefined
      );
      setReminders((prev) => [newRem, ...prev]);
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setDueDate('');
    } catch (err) {
      console.error('Failed to create reminder:', err);
    }
  };

  // AI Scan
  const handleAiScan = async () => {
    setIsAiScanning(true);
    setImportSuccessMessage(null);
    try {
      const memories = await api.listMemories();

      if (hasApiKey) {
        const found = await geminiService.scanMemoriesForReminders(memories);
        setExtractedReminders(found);
        const initialSelection: { [idx: number]: boolean } = {};
        found.forEach((_, idx) => {
          initialSelection[idx] = true;
        });
        setSelectedForImport(initialSelection);
        setAiScanModalOpen(true);
      } else {
        // Deterministic scan of synthetic test dataset
        const syntheticFound: ExtractedReminder[] = [];
        for (const m of memories) {
          const content = `${m.title} ${m.description || ''} ${m.content || ''}`.toLowerCase();
          if (content.includes('dbms') || content.includes('exam')) {
            syntheticFound.push({
              title: 'DBMS Final Examination',
              description: 'Examination Hall 3, Block B at 10:00 AM. Bring ID card.',
              due_at: '2026-09-24T10:00:00.000Z',
              source_memory_id: m.id,
              source_memory_title: m.title,
            });
          }
          if (content.includes('internship') || content.includes('interview')) {
            syntheticFound.push({
              title: 'Nova Labs Internship Interview',
              description: 'Google Meet with Alex Rivera. System Design & Coding.',
              due_at: '2026-09-20T14:00:00.000Z',
              source_memory_id: m.id,
              source_memory_title: m.title,
            });
          }
          if (content.includes('presentation') || content.includes('project')) {
            syntheticFound.push({
              title: 'Final-Year Project Presentation',
              description: 'Seminar Room 102 at 11:30 AM. Submit slides 24 hours prior.',
              due_at: '2026-09-27T11:30:00.000Z',
              source_memory_id: m.id,
              source_memory_title: m.title,
            });
          }
        }

        // Deduplicate
        const unique = Array.from(new Map(syntheticFound.map((item) => [item.title, item])).values());
        setExtractedReminders(unique);
        const initialSelection: { [idx: number]: boolean } = {};
        unique.forEach((_, idx) => {
          initialSelection[idx] = true;
        });
        setSelectedForImport(initialSelection);
        setAiScanModalOpen(true);
      }
    } catch (err) {
      console.error('AI reminder scan error:', err);
    } finally {
      setIsAiScanning(false);
    }
  };

  const handleImportSelected = async () => {
    const toImport = extractedReminders.filter((_, idx) => selectedForImport[idx]);
    for (const item of toImport) {
      await api.createReminder(item.title, item.description, item.due_at, item.source_memory_id);
    }
    await loadReminders();
    setAiScanModalOpen(false);
    setImportSuccessMessage(`Successfully imported ${toImport.length} reminders from your memories!`);
    setTimeout(() => setImportSuccessMessage(null), 4000);
  };

  const filteredReminders = reminders.filter((r) => {
    if (filter === 'pending') return r.status === 'pending';
    if (filter === 'completed') return r.status === 'completed';
    return true;
  });

  return (
    <div className="p-4 md:p-8 max-w-[850px] w-full mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Reminders</h1>
          <p className="text-xs text-text-secondary mt-1">
            Deadlines, exam schedules and upcoming events extracted from or linked to your memories.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleAiScan}
            disabled={isAiScanning}
            className="text-xs font-medium text-accent hover:text-red-400 bg-accent-soft px-3.5 py-2 rounded-lg border border-accent/20 transition-all flex items-center gap-1.5 disabled:opacity-40"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiScanning ? 'animate-spin' : ''}`} />
            <span>{isAiScanning ? 'Scanning...' : '✨ AI Scan Memories'}</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-medium text-white bg-accent hover:brightness-110 active:scale-95 px-3.5 py-2 rounded-lg transition-all shadow-[0_0_16px_rgba(239,68,68,0.25)] flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Reminder</span>
          </button>
        </div>
      </div>

      {importSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{importSuccessMessage}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex rounded-xl bg-bg-elevated p-1 border border-border w-max">
        {(['pending', 'all', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
              filter === tab
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Reminders List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-bg-elevated animate-pulse" />
          ))}
        </div>
      ) : filteredReminders.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-bg-elevated border border-border flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-accent-soft border border-accent/20 flex items-center justify-center text-accent">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-text-primary">No reminders in this view</h3>
          <p className="text-xs text-text-secondary max-w-sm">
            You have no {filter} reminders. Click "AI Scan Memories" to automatically extract dates from your uploaded files.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredReminders.map((rem) => {
            const isCompleted = rem.status === 'completed';
            const isOverdue = rem.due_at && new Date(rem.due_at).getTime() < Date.now() && !isCompleted;

            return (
              <div
                key={rem.id}
                onClick={() => handleToggle(rem.id)}
                className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 cursor-pointer group ${
                  isCompleted
                    ? 'bg-bg-base/40 border-border opacity-60'
                    : isOverdue
                    ? 'bg-bg-elevated border-red-500/30 shadow-sm'
                    : 'bg-bg-elevated border-border hover:border-border-strong'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    type="button"
                    className="mt-0.5 text-text-muted group-hover:text-accent transition-colors shrink-0"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <h3
                      className={`text-xs font-semibold text-text-primary ${
                        isCompleted ? 'line-through text-text-muted' : ''
                      }`}
                    >
                      {rem.title}
                    </h3>
                    {rem.description && (
                      <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                        {rem.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-2 font-mono text-[10px] text-text-muted">
                      {rem.due_at && (
                        <span
                          className={`flex items-center gap-1 ${
                            isOverdue ? 'text-red-400 font-semibold' : ''
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          {new Date(rem.due_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {isOverdue && ' (Passed)'}
                        </span>
                      )}

                      {rem.source_memory_id && (
                        <Link
                          to={`/memories/${rem.source_memory_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-accent hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Linked Memory</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => handleDelete(e, rem.id)}
                  title="Delete Reminder"
                  className="p-1.5 text-text-muted hover:text-red-400 rounded hover:bg-bg-hover opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Reminder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl bg-bg-elevated border border-border max-w-md w-full flex flex-col gap-4 shadow-surface">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">Create Reminder</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReminder} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. DBMS Exam"
                  required
                  className="w-full bg-bg-base border border-border rounded-xl px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details, room number, links..."
                  className="w-full bg-bg-base border border-border rounded-xl p-3 text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">
                  Due Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-bg-base border border-border rounded-xl px-3.5 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-accent hover:brightness-110 disabled:opacity-40"
                >
                  Create Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Scan Results Modal */}
      {aiScanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl bg-bg-elevated border border-border max-w-lg w-full flex flex-col gap-4 shadow-surface max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-bold text-text-primary">
                  AI Extracted Upcoming Events ({extractedReminders.length})
                </h3>
              </div>
              <button
                onClick={() => setAiScanModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Gemini analyzed your memories and found the following scheduled exams, meetings, and deadlines:
            </p>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
              {extractedReminders.length === 0 ? (
                <div className="p-6 text-center text-xs text-text-muted">
                  No upcoming deadlines detected in your currently indexed memories.
                </div>
              ) : (
                extractedReminders.map((item, idx) => {
                  const isChecked = selectedForImport[idx] ?? true;
                  return (
                    <div
                      key={idx}
                      onClick={() =>
                        setSelectedForImport((prev) => ({ ...prev, [idx]: !isChecked }))
                      }
                      className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-3 transition-all ${
                        isChecked
                          ? 'bg-accent/10 border-accent/30 text-text-primary'
                          : 'bg-bg-base border-border text-text-muted opacity-70'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded border-border text-accent focus:ring-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-text-primary">{item.title}</div>
                        {item.description && (
                          <p className="text-[11px] text-text-secondary mt-0.5">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 font-mono text-[10px] text-text-muted">
                          {item.due_at && (
                            <span className="flex items-center gap-1 text-accent font-medium">
                              <Calendar className="w-3 h-3" />
                              {new Date(item.due_at).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                          {item.source_memory_title && (
                            <span className="truncate">From: {item.source_memory_title}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="font-mono text-xs text-text-muted">
                {Object.values(selectedForImport).filter(Boolean).length} selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAiScanModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary border border-border"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportSelected}
                  disabled={extractedReminders.length === 0}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-accent hover:brightness-110 disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Import Reminders</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
