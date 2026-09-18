import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Memory } from '../types';
import {
  CalendarDays,
  FileText,
  Image as ImageIcon,
  FileCode,
  Sparkles,
  ArrowRight,
  Filter
} from 'lucide-react';

export const TimelinePage: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const data = await api.listMemories();
      setMemories(data);
    } catch (err) {
      console.error('Error loading timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set<string>();
    memories.forEach((m) => {
      if (m.category) cats.add(m.category);
    });
    return Array.from(cats);
  }, [memories]);

  // Group memories chronologically by Month & Year
  const groupedMemories = useMemo(() => {
    const filtered = memories.filter(
      (m) => selectedCategory === 'all' || m.category === selectedCategory
    );

    const sorted = [...filtered].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const groups: { [key: string]: Memory[] } = {};
    sorted.forEach((m) => {
      const date = new Date(m.created_at);
      const key = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });

    return groups;
  }, [memories, selectedCategory]);

  const getTypeIcon = (type: string) => {
    if (type === 'image') return <ImageIcon className="w-3.5 h-3.5 text-amber-400" />;
    if (type === 'note') return <FileCode className="w-3.5 h-3.5 text-emerald-400" />;
    return <FileText className="w-3.5 h-3.5 text-red-400" />;
  };

  return (
    <div className="p-4 md:p-8 max-w-[900px] w-full mx-auto flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Timeline</h1>
        <p className="text-xs text-text-secondary mt-1">
          Chronological journey of memories indexed into your personal retrieval store.
        </p>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            selectedCategory === 'all'
              ? 'bg-accent/15 text-white border border-accent/30'
              : 'bg-bg-elevated text-text-muted hover:text-text-primary border border-border'
          }`}
        >
          All Categories
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setSelectedCategory(c)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedCategory === c
                ? 'bg-accent/15 text-white border border-accent/30'
                : 'bg-bg-elevated text-text-muted hover:text-text-primary border border-border'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Timeline Stream */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 rounded-2xl bg-bg-elevated border border-border animate-pulse" />
          ))}
        </div>
      ) : Object.keys(groupedMemories).length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-bg-elevated border border-border flex flex-col items-center gap-3">
          <CalendarDays className="w-10 h-10 text-text-muted" />
          <p className="text-xs text-text-muted">No timeline entries found in this category.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8 relative pl-6 border-l border-border/80 ml-4">
          {Object.entries(groupedMemories).map(([monthYear, items]) => (
            <div key={monthYear} className="flex flex-col gap-4 relative">
              {/* Group node dot */}
              <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-accent border-4 border-bg-base shadow-glow" />

              <h2 className="font-mono text-xs font-bold text-accent uppercase tracking-wider">
                {monthYear}
              </h2>

              <div className="flex flex-col gap-3">
                {items.map((mem) => (
                  <Link
                    key={mem.id}
                    to={`/memories/${mem.id}`}
                    className="p-4 rounded-xl bg-bg-elevated border border-border hover:border-border-strong transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-bg-base border border-border flex items-center justify-center shrink-0 mt-0.5">
                        {getTypeIcon(mem.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-text-muted">
                            {new Date(mem.created_at).toLocaleDateString(undefined, {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                          <span className="text-text-muted text-[10px]">·</span>
                          <span className="font-mono text-[10px] text-accent uppercase">
                            {mem.category || 'General'}
                          </span>
                        </div>
                        <h3 className="text-xs font-semibold text-text-primary group-hover:text-accent transition-colors mt-0.5">
                          {mem.title}
                        </h3>
                        <p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">
                          {mem.description || mem.content}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <span className="font-mono text-[10px] text-text-muted">
                        {mem.original_file_name}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-accent transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
