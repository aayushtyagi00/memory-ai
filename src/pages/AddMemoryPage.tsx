import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { geminiService, GeminiAnalysisResult } from '../services/gemini';
import {
  UploadCloud,
  FileText,
  FileCode,
  Tag,
  Folder,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
  Eye,
  Calendar,
  Zap,
  Activity,
  Check
} from 'lucide-react';

const CATEGORIES = ['Academic', 'Financial', 'Career', 'Personal', 'Meeting', 'General'];

export const AddMemoryPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'upload' | 'note'>('upload');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileTitle, setFileTitle] = useState('');
  const [fileCategory, setFileCategory] = useState('General');
  const [fileTags, setFileTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'ready' | 'failed'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [visionExtracting, setVisionExtracting] = useState(false);
  const [visionExtractedText, setVisionExtractedText] = useState<string | null>(null);

  // Batch Upload State (for multi-file / multi-screenshot uploads)
  const [batchQueue, setBatchQueue] = useState<
    {
      id: string;
      file: File;
      title: string;
      category: string;
      tags: string[];
      status: 'pending' | 'extracting' | 'uploading' | 'done' | 'failed';
      extractedText?: string;
      error?: string;
    }[]
  >([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchIndex, setBatchIndex] = useState(0);

  // Note State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteCategory, setNoteCategory] = useState('Personal');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [noteTagInput, setNoteTagInput] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // AI Auto-Analyze State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedReminder, setDetectedReminder] = useState<GeminiAnalysisResult['detectedReminder'] | null>(null);
  const [createReminderChecked, setCreateReminderChecked] = useState(true);

  const hasApiKey = geminiService.hasApiKey();

  // Clean up Object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.md', '.png', '.jpg', '.jpeg', '.webp', '.doc', '.docx', '.csv', '.json', '.xlsx'];

  // Single File Selection
  const handleSingleFileChange = async (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setErrorMessage(`Unsupported file format (${ext}). Supported formats: PDF, Word (DOCX), Text, Markdown, CSV, JSON, and Images (PNG, JPG, WEBP).`);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage('File size exceeds 20 MB limit');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setFileTitle(file.name.replace(/\.[^/.]+$/, ''));
    setErrorMessage(null);
    setVisionExtractedText(null);

    // If image, create preview
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // If Gemini is active, run automatic vision analysis
      if (hasApiKey) {
        handleVisionExtract(file);
      }
    } else {
      setPreviewUrl(null);
    }
  };

  // Multiple / Batch File Selection
  const handleFilesSelected = (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    if (fileList.length === 1) {
      setBatchQueue([]);
      handleSingleFileChange(fileList[0]);
    } else {
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setVisionExtractedText(null);
      setErrorMessage(null);

      const queue = fileList.map((f, i) => ({
        id: `batch-${Date.now()}-${i}`,
        file: f,
        title: f.name.replace(/\.[^/.]+$/, ''),
        category: 'General',
        tags: f.type.startsWith('image/') ? ['screenshot', 'image'] : ['document'],
        status: 'pending' as const,
      }));
      setBatchQueue(queue);
    }
  };

  const handleVisionExtract = async (file: File) => {
    setVisionExtracting(true);
    try {
      const res = await geminiService.extractTextFromImage(file);
      if (res.title && !fileTitle) setFileTitle(res.title);
      if (res.category && CATEGORIES.includes(res.category)) setFileCategory(res.category);
      if (res.tags && res.tags.length > 0) {
        setFileTags((prev) => Array.from(new Set([...prev, ...res.tags])));
      }
      if (res.extractedText) {
        setVisionExtractedText(res.extractedText);
      }
    } catch (e: any) {
      console.warn('Vision extraction error:', e);
    } finally {
      setVisionExtracting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleAddTag = (isNote: boolean = false) => {
    const input = isNote ? noteTagInput.trim() : tagInput.trim();
    if (!input) return;
    if (isNote) {
      if (!noteTags.includes(input)) setNoteTags([...noteTags, input]);
      setNoteTagInput('');
    } else {
      if (!fileTags.includes(input)) setFileTags([...fileTags, input]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string, isNote: boolean = false) => {
    if (isNote) {
      setNoteTags(noteTags.filter((t) => t !== tag));
    } else {
      setFileTags(fileTags.filter((t) => t !== tag));
    }
  };

  // AI Auto-Analyze Note
  const handleAutoAnalyzeNote = async () => {
    if (!noteContent.trim()) {
      setErrorMessage('Please write some note content first before running AI analysis.');
      return;
    }

    if (!hasApiKey) {
      setErrorMessage('Please configure your Gemini API Key in Settings to enable AI auto-tagging.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const res = await geminiService.analyzeMemoryContent(noteContent, noteTitle);
      if (res.title && (!noteTitle.trim() || noteTitle === 'Untitled')) {
        setNoteTitle(res.title);
      }
      if (res.category && CATEGORIES.includes(res.category)) {
        setNoteCategory(res.category);
      }
      if (res.tags && res.tags.length > 0) {
        setNoteTags((prev) => Array.from(new Set([...prev, ...res.tags])));
      }
      if (res.detectedReminder && res.detectedReminder.title) {
        setDetectedReminder(res.detectedReminder);
        setCreateReminderChecked(true);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'AI analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submit Single File Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploadStatus('uploading');
    setUploadProgress(30);
    setErrorMessage(null);

    try {
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 85) {
            clearInterval(progressTimer);
            return 85;
          }
          return prev + 15;
        });
      }, 250);

      setTimeout(() => {
        setUploadStatus('processing');
      }, 600);

      let textToUse = visionExtractedText || undefined;
      // If user submitted while OCR was in-flight, await brief completion
      if (!textToUse && selectedFile.type.startsWith('image/') && hasApiKey && visionExtracting) {
        let attempts = 0;
        while (visionExtracting && attempts < 8) {
          await new Promise((r) => setTimeout(r, 400));
          attempts++;
        }
        textToUse = visionExtractedText || undefined;
      }

      const mem = await api.uploadMemory(
        selectedFile,
        fileTitle,
        fileCategory,
        fileTags,
        textToUse
      );

      clearInterval(progressTimer);
      setUploadProgress(100);
      setUploadStatus('ready');

      // If user detected reminder, save it
      if (detectedReminder && createReminderChecked) {
        await api.createReminder(
          detectedReminder.title,
          detectedReminder.description,
          detectedReminder.due_at,
          mem.id
        );
      }

      setTimeout(() => {
        navigate(`/memories/${mem.id}`);
      }, 900);
    } catch (err: any) {
      setUploadStatus('failed');
      setErrorMessage(err?.message || 'Upload and indexing failed');
    }
  };

  // Submit Batch Upload (Multi-screenshot / Multi-file)
  const handleBatchUpload = async () => {
    if (batchQueue.length === 0 || isBatchProcessing) return;
    setIsBatchProcessing(true);
    setErrorMessage(null);

    for (let i = 0; i < batchQueue.length; i++) {
      setBatchIndex(i);
      const item = batchQueue[i];

      setBatchQueue((prev) =>
        prev.map((q, idx) => (idx === i ? { ...q, status: 'uploading' } : q))
      );

      try {
        let extractedText: string | undefined = undefined;
        let title = item.title;
        let category = item.category;
        let tags = item.tags;

        if (item.file.type.startsWith('image/') && hasApiKey) {
          try {
            setBatchQueue((prev) =>
              prev.map((q, idx) => (idx === i ? { ...q, status: 'extracting' } : q))
            );
            const visionResult = await geminiService.extractTextFromImage(item.file);
            extractedText = visionResult.extractedText;
            if (visionResult.title) title = visionResult.title;
            if (visionResult.category) category = visionResult.category;
            if (visionResult.tags && visionResult.tags.length > 0) {
              tags = Array.from(new Set([...tags, ...visionResult.tags]));
            }
          } catch (vErr) {
            console.warn('Batch OCR extraction skipped for', item.file.name, vErr);
          }
        }

        await api.uploadMemory(item.file, title, category, tags, extractedText);
        setBatchQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, status: 'done', title } : q))
        );
      } catch (err: any) {
        setBatchQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, status: 'failed', error: err?.message || 'Failed' } : q))
        );
      }
    }

    setIsBatchProcessing(false);
    setTimeout(() => {
      navigate('/memories');
    }, 1200);
  };

  // Submit Note
  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;

    setNoteSubmitting(true);
    setErrorMessage(null);

    try {
      const mem = await api.createNote(noteTitle, noteContent, noteCategory, noteTags);

      // Create detected reminder if checked
      if (detectedReminder && createReminderChecked) {
        await api.createReminder(
          detectedReminder.title,
          detectedReminder.description,
          detectedReminder.due_at,
          mem.id
        );
      }

      navigate(`/memories/${mem.id}`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save note');
      setNoteSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[950px] w-full mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Add Memory</h1>
        <p className="text-xs text-text-secondary mt-1">
          Store documents, screenshots or notes into your grounded Gemini personal memory library.
        </p>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl bg-bg-elevated p-1 border border-border w-max">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'upload'
              ? 'bg-accent text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload File or Screenshot</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('note')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'note'
              ? 'bg-accent text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Write Note</span>
        </button>
      </div>

      {/* Tab 1: File Upload */}
      {activeTab === 'upload' && (
        <form onSubmit={handleUploadSubmit} className="flex flex-col gap-6">
          {/* Missing API Key Warning */}
          {!hasApiKey && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Tip:</strong> Gemini API Key is not configured. Visual OCR reading from screenshots requires an API key in Settings to be searchable.
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-medium border border-amber-500/30 transition-all shrink-0"
              >
                Go to Settings
              </button>
            </div>
          )}

          {/* Multi-file Batch Queue Mode */}
          {batchQueue.length > 0 ? (
            <div className="flex flex-col gap-4">
              <div className="p-5 rounded-2xl bg-bg-elevated border border-border flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-accent" />
                    <h2 className="text-xs font-bold text-text-primary font-mono uppercase tracking-wider">
                      Batch Upload Queue ({batchQueue.length} Files)
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBatchQueue([])}
                    disabled={isBatchProcessing}
                    className="text-xs text-text-muted hover:text-text-primary"
                  >
                    Clear Queue
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                  {batchQueue.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-bg-base border border-border/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                          {item.file.type.startsWith('image/') ? (
                            <Sparkles className="w-4 h-4 text-accent" />
                          ) : (
                            <FileText className="w-4 h-4 text-text-secondary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-text-primary truncate max-w-xs">{item.file.name}</p>
                          <p className="font-mono text-[10px] text-text-muted">
                            {Math.round(item.file.size / 1024)} KB · {item.file.type.startsWith('image/') ? 'Image / Screenshot' : 'Document'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === 'pending' && (
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-bg-elevated border border-border text-text-muted">
                            Queued
                          </span>
                        )}
                        {item.status === 'extracting' && (
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-accent/10 border border-accent/30 text-accent flex items-center gap-1">
                            <Activity className="w-3 h-3 animate-spin" />
                            AI OCR...
                          </span>
                        )}
                        {item.status === 'uploading' && (
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center gap-1">
                            <Activity className="w-3 h-3 animate-spin" />
                            Indexing...
                          </span>
                        )}
                        {item.status === 'done' && (
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Ready
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400">
                            Failed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isBatchProcessing}
                    className="px-4 py-2 rounded-xl border border-border text-xs text-text-secondary hover:text-text-primary"
                  >
                    Add More Files
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchUpload}
                    disabled={isBatchProcessing}
                    className="px-6 py-2 rounded-xl bg-accent text-white text-xs font-medium hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all flex items-center gap-2 shadow-[0_0_14px_rgba(239,68,68,0.25)]"
                  >
                    {isBatchProcessing ? (
                      <>
                        <Activity className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing {batchIndex + 1} of {batchQueue.length}...</span>
                      </>
                    ) : (
                      <>
                        <span>Upload &amp; Index All ({batchQueue.length})</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Drag and drop zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  selectedFile
                    ? 'border-accent/40 bg-accent/5'
                    : 'border-border hover:border-accent/30 bg-bg-elevated/50 hover:bg-bg-elevated'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
                  accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.doc,.docx"
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center gap-3">
                    {previewUrl ? (
                      <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-border shadow-md">
                        <img src={previewUrl} alt="Upload preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-accent-soft border border-accent/30 flex items-center justify-center text-accent">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-xs font-semibold text-text-primary">{selectedFile.name}</h3>
                      <p className="font-mono text-[10px] text-text-muted mt-0.5">
                        {Math.round(selectedFile.size / 1024)} KB · Click or drag to replace
                      </p>
                    </div>
                    {visionExtracting && (
                      <div className="flex items-center gap-1.5 text-xs text-accent font-mono animate-pulse">
                        <Activity className="w-3.5 h-3.5 animate-spin" />
                        <span>Gemini Vision reading and transcribing visual text...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 max-w-sm">
                    <div className="w-12 h-12 rounded-2xl bg-accent-soft border border-accent/20 flex items-center justify-center text-accent shadow-glow">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">Choose files or drag &amp; drop here</h3>
                      <p className="text-xs text-text-secondary mt-1">
                        Select one or multiple Screenshots (PNG, JPG), PDF, DOCX, or Text files.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Vision Extracted Text preview if available */}
              {visionExtractedText && (
                <div className="p-4 rounded-xl bg-bg-elevated border border-border flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
                    <span className="flex items-center gap-1.5 text-accent">
                      <Sparkles className="w-3.5 h-3.5" />
                      Transcribed by Gemini Vision:
                    </span>
                    <span className="font-mono text-[10px] text-text-muted">Indexed for Search</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed bg-bg-base p-3 rounded-lg font-mono max-h-36 overflow-y-auto whitespace-pre-wrap">
                    {visionExtractedText}
                  </p>
                </div>
              )}

              {/* Form Fields */}
              <div className="p-6 rounded-2xl bg-bg-elevated border border-border flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-text-secondary block mb-1">Title</label>
                    <input
                      type="text"
                      value={fileTitle}
                      onChange={(e) => setFileTitle(e.target.value)}
                      placeholder="e.g. DBMS Exam Schedule"
                      className="w-full bg-bg-base border border-border rounded-xl px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-text-secondary block mb-1">Category</label>
                    <select
                      value={fileCategory}
                      onChange={(e) => setFileCategory(e.target.value)}
                      className="w-full bg-bg-base border border-border rounded-xl px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tags Input */}
                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1">Tags</label>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {fileTags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-bg-base border border-border text-[11px] font-mono text-text-secondary"
                      >
                        #{t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t, false)}
                          className="hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
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
                          handleAddTag(false);
                        }
                      }}
                      placeholder="Add a tag and press Enter"
                      className="flex-1 bg-bg-base border border-border rounded-xl px-3.5 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTag(false)}
                      className="px-3 py-2 rounded-xl bg-bg-base border border-border hover:bg-bg-hover text-xs text-text-secondary hover:text-text-primary"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Bar during upload */}
              {uploadStatus !== 'idle' && (
                <div className="p-4 rounded-xl bg-bg-elevated border border-border flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-text-primary flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-accent animate-spin" />
                      {uploadStatus === 'uploading' && 'Uploading file to personal store...'}
                      {uploadStatus === 'processing' && 'Indexing into Gemini Retrieval Store...'}
                      {uploadStatus === 'ready' && 'Indexing complete! Ready to retrieve.'}
                    </span>
                    <span className="font-mono text-text-muted">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-bg-base rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!selectedFile || uploadStatus === 'uploading' || uploadStatus === 'processing'}
                  className="px-6 py-3 rounded-xl bg-accent text-white text-xs font-medium hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all shadow-[0_0_16px_rgba(239,68,68,0.25)] flex items-center gap-2"
                >
                  <span>{uploadStatus === 'processing' ? 'Indexing Memory...' : 'Index Memory'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {/* Tab 2: Note Creation */}
      {activeTab === 'note' && (
        <form onSubmit={handleNoteSubmit} className="flex flex-col gap-6">
          <div className="p-6 rounded-2xl bg-bg-elevated border border-border flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-xs font-bold text-text-primary font-mono uppercase tracking-wider">
                Note Details
              </h2>
              {hasApiKey && (
                <button
                  type="button"
                  onClick={handleAutoAnalyzeNote}
                  disabled={isAnalyzing || !noteContent.trim()}
                  className="text-xs font-medium text-accent hover:text-red-400 bg-accent-soft px-3 py-1.5 rounded-lg border border-accent/20 transition-all flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzing ? 'Analyzing with Gemini...' : '✨ Auto-Fill with Gemini'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Title</label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="e.g. Guidance Notes from Professor"
                  className="w-full bg-bg-base border border-border rounded-xl px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Category</label>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value)}
                  className="w-full bg-bg-base border border-border rounded-xl px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Note Content */}
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Content</label>
              <textarea
                rows={8}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write your personal notes, meeting guidance, instructions or notes here..."
                className="w-full bg-bg-base border border-border rounded-xl p-3.5 text-xs text-text-primary focus:outline-none focus:border-accent leading-relaxed resize-y font-mono"
              />
            </div>

            {/* Tags Input */}
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Tags</label>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {noteTags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-bg-base border border-border text-[11px] font-mono text-text-secondary"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t, true)}
                      className="hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={noteTagInput}
                  onChange={(e) => setNoteTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(true);
                    }
                  }}
                  placeholder="Add a tag and press Enter"
                  className="flex-1 bg-bg-base border border-border rounded-xl px-3.5 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(true)}
                  className="px-3 py-2 rounded-xl bg-bg-base border border-border hover:bg-bg-hover text-xs text-text-secondary hover:text-text-primary"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Detected Deadline / Reminder Card */}
            {detectedReminder && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start justify-between gap-3 text-xs text-amber-200">
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-amber-300">
                      Detected Upcoming Deadline: {detectedReminder.title}
                    </span>
                    <span className="text-[11px] opacity-90 block mt-0.5">
                      {detectedReminder.due_at ? `Due Date: ${detectedReminder.due_at}` : ''} {detectedReminder.description}
                    </span>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer shrink-0 font-mono text-[11px] text-text-primary">
                  <input
                    type="checkbox"
                    checked={createReminderChecked}
                    onChange={(e) => setCreateReminderChecked(e.target.checked)}
                    className="rounded border-border text-accent focus:ring-0"
                  />
                  <span>Add Reminder</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!noteTitle.trim() || !noteContent.trim() || noteSubmitting}
              className="px-6 py-3 rounded-xl bg-accent text-white text-xs font-medium hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all shadow-[0_0_16px_rgba(239,68,68,0.25)] flex items-center gap-2"
            >
              <span>{noteSubmitting ? 'Saving...' : 'Save Note to Memory'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
