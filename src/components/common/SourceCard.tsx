import React, { useState } from 'react';
import { Source } from '../../types';
import { FileText, Image as ImageIcon, FileCode, ChevronDown, ChevronUp, ExternalLink, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SourceCardProps {
  source: Source;
  index: number;
}

export const SourceCard: React.FC<SourceCardProps> = ({ source, index }) => {
  const [expanded, setExpanded] = useState(false);

  const getIcon = () => {
    if (source.type === 'image' || source.fileName?.match(/\.(png|jpg|jpeg)$/i)) {
      return <ImageIcon className="w-4 h-4 text-amber-400" />;
    }
    if (source.type === 'note' || source.fileName?.endsWith('.txt')) {
      return <FileCode className="w-4 h-4 text-emerald-400" />;
    }
    return <FileText className="w-4 h-4 text-red-400" />;
  };

  const targetId = source.memoryId || (source.id && !source.id.startsWith('src-') ? source.id : undefined);

  return (
    <div className="bg-surface-container-low border border-border rounded-xl p-3.5 hover:border-border-strong transition-all duration-200 group">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-bg-elevated border border-border flex items-center justify-center shrink-0">
            {getIcon()}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-medium text-text-primary truncate">
              {source.title || source.fileName}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[10px] text-text-muted truncate max-w-[120px]">
                {source.fileName}
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5 rounded bg-surface border border-border text-text-secondary">
                <ShieldCheck className="w-2.5 h-2.5 text-success" />
                Grounded [{index + 1}]
              </span>
            </div>
          </div>
        </div>

        {targetId && (
          <Link
            to={`/memories/${targetId}`}
            title="Open memory file"
            className="text-text-muted hover:text-text-primary p-1 rounded-md hover:bg-bg-hover transition-colors shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {source.snippet && (
        <div className="mt-2.5 pt-2.5 border-t border-border/70">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-[11px] text-text-secondary hover:text-text-primary transition-colors font-mono"
          >
            <span>Verified Evidence Snippet</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {expanded && (
            <div className="mt-2 p-2.5 rounded-lg bg-bg-base border border-border/80 font-mono text-[11px] text-text-primary leading-relaxed whitespace-pre-wrap selection:bg-accent/20">
              {source.snippet}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
