import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Memory } from '../types';
import { getImageFromIndexedDB } from '../utils/indexedDb';
import {
  Search,
  Filter,
  ArrowUpDown,
  Star,
  FileText,
  Image as ImageIcon,
  FileCode,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlusCircle,
  Trash2,
  Sparkles,
  ExternalLink,
  Zap,
  X
} from 'lucide-react';

export const MemoryLibraryPage: React.FC = () => {
  const navigate = useNavigate();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'document' | 'note' | 'image'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');

  const [isTranscribingBatch, setIsTranscribingBatch] = useState(false);
  const [unindexedImagesCount, setUnindexedImagesCount] = useState(0);
  const [ghostImagesCount, setGhostImagesCount] = useState(0);
  const [isCleaningGhosts, setIsCleaningGhosts] = useState(false);
  const [dismissUnindexedBanner, setDismissUnindexedBanner] = useState(false);
  const [transcribeNotice, setTranscribeNotice] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
    actionText?: string;
    actionLink?: string;
    onAction?: () => void;
  } | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const computeUnindexed = async () => {
      const unindexed = memories.filter(
        (m) =>
          (m.type === 'image' ||
            /\.(png|jpe?g|webp|gif|bmp|tiff|heic)$/i.test(m.original_file_name || '') ||
            m.title.toLowerCase().includes('screenshot')) &&
          (!m.content ||
            m.content.length < 50 ||
            m.content.startsWith('Image uploaded:') ||
            m.content.startsWith('Uploaded file:') ||
            m.content.startsWith('Uploaded '))
      );

      let indexable = 0;
      let ghosts = 0;
      for (const m of unindexed) {
        let hasImage = false;
        if (m.storage_path && (m.storage_path.startsWith('data:') || m.storage_path.startsWith('http'))) {
          hasImage = true;
        } else {
          const inDb = (await getImageFromIndexedDB(m.id)) || (await getImageFromIndexedDB(m.storage_path || ''));
          if (inDb) hasImage = true;
        }
        if (hasImage) indexable++;
        else ghosts++;
      }

      if (isSubscribed) {
        setUnindexedImagesCount(indexable);
        setGhostImagesCount(ghosts);
      }
    };

    computeUnindexed();
    return () => {
      isSubscribed = false;
    };
  }, [memories]);

  const handleCleanGhosts = async () => {
    setIsCleaningGhosts(true);
    try {
      const removed = await api.cleanGhostMemories();
      setGhostImagesCount(0);
      setTranscribeNotice({
        type: 'success',
        message: `Removed ${removed} incomplete screenshot record${removed === 1 ? '' : 's'}. You can now upload fresh screenshots in Add Memory.`,
        actionText: 'Add Screenshots',
        actionLink: '/add',
      });
      await loadMemories();
      setTimeout(() => setTranscribeNotice(null), 8000);
    } catch (err: any) {
      setTranscribeNotice({
        type: 'warning',
        message: 'Cleanup notice: ' + (err?.message || 'Error cleaning records'),
      });
    } finally {
      setIsCleaningGhosts(false);
    }
  };

  const handleIndexAllImages = async () => {
    setIsTranscribingBatch(true);
    try {
      const res = await api.transcribeAllPendingImages();
      if (res.count > 0 && res.failed === 0) {
        setTranscribeNotice({
          type: 'success',
          message: `Successfully indexed ${res.count} screenshot${res.count === 1 ? '' : 's'} with AI Vision! Data, text & tables are now searchable.`,
        });
      } else if (res.count > 0 && res.failed > 0) {
        setTranscribeNotice({
          type: 'warning',
          message: `Indexed ${res.count} screenshot${res.count === 1 ? '' : 's'}. (${res.failed} failed: missing image binary cache).`,
          actionText: 'Re-upload in Add Memory',
          actionLink: '/add',
        });
      } else if (res.count === 0 && res.failed > 0) {
        setTranscribeNotice({
          type: 'warning',
          message: `Could not index ${res.failed} screenshot${res.failed === 1 ? '' : 's'}: Original image files were not stored in browser cache. Click "Clean Up Ghosts" to remove these empty records.`,
          actionText: 'Clean Up Ghosts',
          onAction: handleCleanGhosts,
        });
      } else {
        setTranscribeNotice({
          type: 'info',
          message: 'All screenshots are already indexed.',
        });
      }
      await loadMemories();
      setTimeout(() => setTranscribeNotice(null), 10000);
    } catch (err: any) {
      setTranscribeNotice({
        type: 'warning',
        message: 'Error indexing images: ' + (err?.message || 'Error'),
      });
    } finally {
      setIsTranscribingBatch(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const data = await api.listMemories();
      setMemories(data);
    } catch (err) {
      console.error('Error loading library:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = await api.toggleFavorite(id);
    if (updated) {
      setMemories((prev) => prev.map((m) => (m.id === id ? { ...m, is_favorite: updated.is_favorite } : m)));
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this memory? It will be removed from your store.')) {
      await api.deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
    }
  };

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    memories.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }, [memories]);

  // Filtering & Sorting (including deep search across content)
  const filteredMemories = useMemo(() => {
    return memories
      .filter((m) => {
        if (selectedType !== 'all' && m.type !== selectedType) return false;
        if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const target = `${m.title} ${m.description || ''} ${m.original_file_name || ''} ${m.content || ''} ${m.tags?.join(' ') || ''}`.toLowerCase();
          return target.includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return 0;
      });
  }, [memories, selectedType, selectedCategory, searchQuery, sortBy]);

  const getTypeIcon = (type: string) => {
    if (type === 'image') return <ImageIcon className="w-4 h-4 text-amber-400" />;
    if (type === 'note') return <FileCode className="w-4 h-4 text-emerald-400" />;
    return <FileText className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className="p-4 md:p-8 max-w-[1200px] w-full mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Memory Library</h1>
          <p className="text-xs text-text-secondary mt-1">
            Browse, search and manage all documents, notes and images indexed in your personal store.
          </p>
        </div>

        <Link
          to="/add"
          className="text-xs font-medium text-white bg-accent hover:brightness-110 active:scale-95 px-4 py-2.5 rounded-lg transition-all shadow-[0_0_16px_rgba(239,68,68,0.25)] flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Memory</span>
        </Link>
      </div>

      {/* Ghost Images Detected Banner */}
      {ghostImagesCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold text-text-primary">
                {ghostImagesCount} incomplete screenshot record{ghostImagesCount > 1 ? 's' : ''} detected
              </span>
              <p className="text-[11px] text-text-muted mt-0.5">
                These records have missing image files from earlier uploads and cannot be read by OCR.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCleanGhosts}
              disabled={isCleaningGhosts}
              className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isCleaningGhosts ? (
                <Clock className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Remove Incomplete ({ghostImagesCount})</span>
            </button>
            <button
              onClick={() => setGhostImagesCount(0)}
              className="text-text-muted hover:text-text-primary p-1"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Unindexed Screenshots Banner */}
      {unindexedImagesCount > 0 && !dismissUnindexedBanner && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <span className="font-semibold text-text-primary">
                {unindexedImagesCount} screenshot{unindexedImagesCount > 1 ? 's need' : ' needs'} AI Vision indexing
              </span>
              <p className="text-[11px] text-text-muted mt-0.5">
                Run OCR transcription across your screenshots so their text, tables, and receipts can be searched and cited by the AI.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleIndexAllImages}
              disabled={isTranscribingBatch}
              className="px-4 py-2 rounded-xl bg-accent text-white font-medium text-xs hover:brightness-110 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {isTranscribingBatch ? (
                <>
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Indexing ({unindexedImagesCount})...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Index All With AI Vision</span>
                </>
              )}
            </button>
            <button
              onClick={() => setDismissUnindexedBanner(true)}
              className="text-text-muted hover:text-text-primary p-1"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Transcribe Notice Alert */}
      {transcribeNotice && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 ${
            transcribeNotice.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : transcribeNotice.type === 'warning'
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
              : 'bg-blue-500/10 border border-blue-500/30 text-blue-300'
          }`}
        >
          <div className="flex items-center gap-2.5 flex-1 min-w-0 flex-wrap sm:flex-nowrap">
            {transcribeNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="leading-relaxed">{transcribeNotice.message}</span>
            {transcribeNotice.onAction && (
              <button
                onClick={transcribeNotice.onAction}
                className="px-2.5 py-1 rounded bg-accent text-white font-medium text-[11px] hover:brightness-110 shrink-0 whitespace-nowrap shadow-sm ml-auto sm:ml-2"
              >
                {transcribeNotice.actionText || 'Action'}
              </button>
            )}
            {transcribeNotice.actionLink && !transcribeNotice.onAction && (
              <Link
                to={transcribeNotice.actionLink}
                className="px-2.5 py-1 rounded bg-accent text-white font-medium text-[11px] hover:brightness-110 shrink-0 whitespace-nowrap shadow-sm ml-auto sm:ml-2"
              >
                {transcribeNotice.actionText || 'Open'}
              </Link>
            )}
          </div>
          <button
            onClick={() => setTranscribeNotice(null)}
            className="text-text-muted hover:text-text-primary p-1 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-bg-elevated border border-border flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles, tags, content..."
            className="w-full bg-bg-base border border-border rounded-xl pl-10 pr-4 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="bg-bg-base border border-border rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="all">All Types</option>
            <option value="document">Documents</option>
            <option value="note">Notes</option>
            <option value="image">Images</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-bg-base border border-border rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-bg-base border border-border rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Memory Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-bg-elevated animate-pulse" />
          ))}
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-bg-elevated border border-border flex flex-col items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
          <h3 className="text-sm font-bold text-text-primary">No memories found</h3>
          <p className="text-xs text-text-secondary max-w-sm">
            Try adjusting your search query or filter tags to find what you're looking for.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMemories.map((m) => (
            <div
              key={m.id}
              onClick={() => navigate(`/memories/${m.id}`)}
              className="p-5 rounded-2xl bg-bg-elevated border border-border hover:border-accent/40 hover:bg-bg-hover transition-all flex flex-col justify-between cursor-pointer group shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[9px] uppercase px-2 py-0.5 rounded bg-bg-base border border-border text-text-muted">
                      {m.category || 'General'}
                    </span>
                    {m.type === 'image' && (
                      m.content && m.content.length > 50 && !m.content.startsWith('Image uploaded:') ? (
                        <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          OCR Ready
                        </span>
                      ) : (
                        <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          OCR Pending
                        </span>
                      )
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(e, m.id)}
                      className="text-text-muted hover:text-amber-400 transition-colors"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          m.is_favorite ? 'text-amber-400 fill-amber-400' : ''
                        }`}
                      />
                    </button>
                    {getTypeIcon(m.type)}
                  </div>
                </div>

                <h3 className="text-xs font-bold text-text-primary group-hover:text-accent transition-colors line-clamp-1">
                  {m.title}
                </h3>

                <p className="text-[11px] text-text-secondary line-clamp-2 mt-1.5 leading-relaxed">
                  {m.description || m.content || 'Indexed memory file.'}
                </p>

                {m.tags && m.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {m.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-bg-base text-text-muted"
                      >
                        #{t}
                      </span>
                    ))}
                    {m.tags.length > 3 && (
                      <span className="font-mono text-[9px] text-text-muted">
                        +{m.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between font-mono text-[10px] text-text-muted">
                <span>
                  {new Date(m.created_at).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/ask?q=${encodeURIComponent(`What does ${m.title} say?`)}`);
                    }}
                    title="Ask Gemini about this"
                    className="p-1 hover:text-accent transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, m.id)}
                    title="Delete Memory"
                    className="p-1 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
