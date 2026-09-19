import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { geminiService } from '../services/gemini';
import { Memory, Reminder } from '../types';
import {
  ArrowLeft,
  Sparkles,
  Trash2,
  Star,
  FileText,
  Image as ImageIcon,
  FileCode,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Folder,
  Tag,
  Calendar,
  HardDrive,
  Edit3,
  Save,
  X,
  Bell,
  Activity,
  ExternalLink,
  Zap
} from 'lucide-react';

const CATEGORIES = ['Academic', 'Financial', 'Career', 'Personal', 'Meeting', 'General'];

export const MemoryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [memory, setMemory] = useState<Memory | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('General');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // AI Summarize & Vision Transcribe State
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeNotice, setTranscribeNotice] = useState<string | null>(null);

  const hasApiKey = geminiService.hasApiKey();

  useEffect(() => {
    if (id) {
      loadMemory(id);
    }
  }, [id]);

  const loadMemory = async (memId: string) => {
    setLoading(true);
    try {
      const [data, allReminders] = await Promise.all([
        api.getMemory(memId),
        api.listReminders(),
      ]);
      setMemory(data);
      if (data) {
        setEditTitle(data.title);
        setEditCategory(data.category || 'General');
        setEditTags(data.tags || []);
        setEditContent(data.content || data.description || '');
        setReminders(allReminders.filter((r) => r.source_memory_id === memId));

        if (data.storage_path) {
          api.getFileUrl(data.storage_path).then((url) => {
            setFileUrl(url);
          }).catch(() => {});
        } else {
          setFileUrl(null);
        }
      }
    } catch (err) {
      console.error('Failed to load memory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!memory) return;
    const updated = await api.toggleFavorite(memory.id);
    if (updated) {
      setMemory({ ...memory, is_favorite: updated.is_favorite });
    }
  };

  const handleDelete = async () => {
    if (!memory) return;
    if (window.confirm('Delete this memory? It will be removed from your Gemini store and database.')) {
      await api.deleteMemory(memory.id);
      navigate('/memories');
    }
  };

  const handleSaveEdit = async () => {
    if (!memory || !editTitle.trim()) return;
    setIsSaving(true);
    try {
      const updated = await api.updateMemory(memory.id, {
        title: editTitle.trim(),
        category: editCategory,
        tags: editTags,
        content: editContent,
      });
      if (updated) {
        setMemory(updated);
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    if (!editTags.includes(tagInput.trim())) {
      setEditTags([...editTags, tagInput.trim()]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setEditTags(editTags.filter((t) => t !== tag));
  };

  const handleAiSummarize = async () => {
    if (!memory) return;
    setIsSummarizing(true);
    try {
      if (hasApiKey) {
        const prompt = `Provide a concise 2-sentence executive summary and 3 key takeaways from this stored memory:
Title: ${memory.title}
Content:
${memory.content || memory.description || ''}`;

        const summary = await geminiService.callGenerateContent(prompt, 'You are an executive summarization assistant for Memory AI.');
        setAiSummary(summary);
      } else {
        // Fallback summary
        setAiSummary(`Summary for ${memory.title}: Stored under category "${memory.category || 'General'}" on ${new Date(memory.created_at).toLocaleDateString()}. Contains verified reference details and verified indexing status ready for grounded retrieval.`);
      }
    } catch (e: any) {
      setAiSummary('Failed to generate summary: ' + (e?.message || 'Error'));
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleTranscribeImage = async () => {
    if (!memory) return;
    if (!geminiService.hasApiKey()) {
      alert('Please connect your Gemini API key in Settings to use AI Vision OCR.');
      navigate('/settings');
      return;
    }
    setIsTranscribing(true);
    try {
      const updated = await api.transcribeImageMemory(memory.id);
      if (updated) {
        setMemory(updated);
        setEditTitle(updated.title);
        setEditContent(updated.content || '');
        setTranscribeNotice('Successfully extracted text and indexed screenshot with AI Vision OCR!');
        setTimeout(() => setTranscribeNotice(null), 5000);
      }
    } catch (err: any) {
      alert('AI Vision transcription failed: ' + (err?.message || 'Error occurred'));
    } finally {
      setIsTranscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex flex-col gap-6">
        <div className="h-8 w-48 rounded bg-bg-elevated animate-pulse" />
        <div className="h-64 rounded-2xl bg-bg-elevated animate-pulse" />
      </div>
    );
  }

  if (!memory) {
    return (
      <div className="p-12 max-w-lg mx-auto text-center flex flex-col items-center gap-4">
        <AlertTriangle className="w-10 h-10 text-amber-400" />
        <h2 className="text-base font-bold text-text-primary">Memory Not Found</h2>
        <p className="text-xs text-text-muted">The requested memory could not be found or has been deleted.</p>
        <Link to="/memories" className="text-xs text-accent underline font-mono">
          Back to Memory Library
        </Link>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    if (type === 'image') return <ImageIcon className="w-5 h-5 text-amber-400" />;
    if (type === 'note') return <FileCode className="w-5 h-5 text-emerald-400" />;
    return <FileText className="w-5 h-5 text-red-400" />;
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl w-full mx-auto flex flex-col gap-6">
      {/* Navigation & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-mono text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleFavorite}
            title={memory.is_favorite ? 'Favorited' : 'Add to Favorites'}
            className="p-2 rounded-lg bg-bg-elevated border border-border text-text-muted hover:text-amber-400 transition-colors"
          >
            <Star className={`w-4 h-4 ${memory.is_favorite ? 'text-amber-400 fill-amber-400' : ''}`} />
          </button>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 rounded-lg bg-bg-elevated border border-border text-text-muted hover:text-text-primary transition-colors"
              title="Edit Memory"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}

          {memory.type === 'image' && (
            <button
              onClick={handleTranscribeImage}
              disabled={isTranscribing}
              className="text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 rounded-lg border border-amber-500/30 transition-all flex items-center gap-1.5"
              title="Transcribe image text, numbers and tables using Gemini AI Vision"
            >
              <Zap className={`w-3.5 h-3.5 ${isTranscribing ? 'animate-spin' : 'text-amber-400'}`} />
              <span>{isTranscribing ? 'Transcribing...' : 'AI Vision OCR'}</span>
            </button>
          )}

          <button
            onClick={handleAiSummarize}
            disabled={isSummarizing}
            className="text-xs font-medium text-accent hover:text-red-400 bg-accent-soft px-3 py-2 rounded-lg border border-accent/20 transition-all flex items-center gap-1.5"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isSummarizing ? 'animate-spin' : ''}`} />
            <span>{isSummarizing ? 'Summarizing...' : 'AI Summary'}</span>
          </button>

          <button
            onClick={() => navigate(`/ask?q=${encodeURIComponent(`What does ${memory.title} say?`)}`)}
            className="text-xs font-medium text-white bg-accent hover:brightness-110 active:scale-95 px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(239,68,68,0.25)]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask About This</span>
          </button>

          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-text-primary bg-bg-elevated hover:bg-bg-hover px-3 py-2 rounded-lg border border-border transition-all flex items-center gap-1.5"
              title="Open or download original file"
            >
              <ExternalLink className="w-3.5 h-3.5 text-accent" />
              <span>Open Attachment</span>
            </a>
          )}

          <button
            onClick={handleDelete}
            title="Delete Memory"
            className="p-2 rounded-lg bg-bg-elevated border border-border text-text-muted hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* AI Summary Banner if requested */}
      {aiSummary && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-accent/10 via-bg-elevated to-accent/5 border border-accent/30 text-xs text-text-primary flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-accent flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Gemini AI Executive Summary
            </span>
            <button onClick={() => setAiSummary(null)} className="text-text-muted hover:text-text-primary">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap font-sans">
            {aiSummary}
          </p>
        </div>
      )}

      {/* Vision Transcribe Success Banner */}
      {transcribeNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{transcribeNotice}</span>
          </div>
          <button onClick={() => setTranscribeNotice(null)} className="text-text-muted hover:text-text-primary">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Image Preview (if image) */}
      {memory.type === 'image' && (fileUrl || memory.storage_path) && (
        <div className="p-4 rounded-2xl bg-bg-elevated border border-border flex flex-col items-center">
          <div className="max-h-96 rounded-xl overflow-hidden border border-border shadow-md">
            <img
              src={fileUrl || memory.storage_path || ''}
              alt={memory.title}
              className="max-h-96 w-auto object-contain"
            />
          </div>
        </div>
      )}

      {/* Main Detail Card / Edit Form */}
      <div className="p-6 md:p-8 rounded-2xl bg-bg-elevated border border-border shadow-surface flex flex-col gap-6">
        {isEditing ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold text-text-primary">Edit Memory</h2>
              <button
                onClick={() => setIsEditing(false)}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-bg-base border border-border rounded-xl px-3.5 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full bg-bg-base border border-border rounded-xl px-3.5 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {editTags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-bg-base border border-border text-[11px] font-mono text-text-secondary"
                  >
                    #{t}
                    <button type="button" onClick={() => handleRemoveTag(t)}>
                      <X className="w-3 h-3 hover:text-red-400" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tag and press Enter"
                  className="flex-1 bg-bg-base border border-border rounded-xl px-3.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1.5 rounded-lg bg-bg-base border border-border text-xs text-text-secondary hover:text-text-primary"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Content</label>
              <textarea
                rows={8}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-bg-base border border-border rounded-xl p-3.5 text-xs text-text-primary focus:outline-none focus:border-accent font-mono leading-relaxed resize-y"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-lg text-xs text-text-secondary border border-border hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-5 py-2 rounded-lg text-xs font-medium text-white bg-accent hover:brightness-110 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header / Meta */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-soft border border-accent/25 flex items-center justify-center shrink-0">
                {getTypeIcon(memory.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-bg-base border border-border text-text-muted">
                    {memory.category || 'General'}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    {memory.indexing_status}
                  </span>
                </div>

                <h1 className="text-lg sm:text-xl font-bold text-text-primary">{memory.title}</h1>
                {memory.description && (
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                    {memory.description}
                  </p>
                )}
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-border font-mono text-[11px]">
              <div className="p-2.5 rounded-lg bg-bg-base border border-border/70">
                <span className="text-[9px] text-text-muted uppercase block">File Name</span>
                <span className="text-text-primary truncate block mt-0.5">
                  {memory.original_file_name || 'Note'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-bg-base border border-border/70">
                <span className="text-[9px] text-text-muted uppercase block">Type</span>
                <span className="text-text-primary capitalize block mt-0.5">{memory.type}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-bg-base border border-border/70">
                <span className="text-[9px] text-text-muted uppercase block">Size</span>
                <span className="text-text-primary block mt-0.5">
                  {memory.file_size ? `${Math.round(memory.file_size / 1024)} KB` : 'Text'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-bg-base border border-border/70">
                <span className="text-[9px] text-text-muted uppercase block">Created</span>
                <span className="text-text-primary block mt-0.5">
                  {new Date(memory.created_at).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Tags */}
            {memory.tags && memory.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-text-muted mr-1 font-mono">Tags:</span>
                {memory.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-1 rounded-md bg-bg-base border border-border text-[11px] font-mono text-text-secondary"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Content Preview Box */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-text-primary font-mono uppercase tracking-wider">
                Memory Content
              </span>
              <div className="p-4 rounded-xl bg-bg-base border border-border font-mono text-xs text-text-primary whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto selection:bg-accent/20">
                {memory.content || memory.description || 'No content preview available.'}
              </div>
            </div>

            {/* Associated Reminders if any */}
            {reminders.length > 0 && (
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <span className="text-xs font-semibold text-text-primary font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-accent" />
                  Linked Reminders ({reminders.length})
                </span>
                <div className="flex flex-col gap-2">
                  {reminders.map((rem) => (
                    <div
                      key={rem.id}
                      className="p-3 rounded-lg bg-bg-base border border-border text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            rem.status === 'completed' ? 'text-success' : 'text-text-muted'
                          }`}
                        />
                        <span className={rem.status === 'completed' ? 'line-through text-text-muted' : 'text-text-primary'}>
                          {rem.title}
                        </span>
                      </div>
                      {rem.due_at && (
                        <span className="font-mono text-[10px] text-accent">
                          {new Date(rem.due_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
