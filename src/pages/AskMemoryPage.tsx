import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { geminiService } from '../services/gemini';
import { Source, ChatMessage, ChatConversation } from '../types';
import { SourceCard } from '../components/common/SourceCard';
import {
  Send,
  Sparkles,
  Plus,
  Bot,
  User,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  ChevronRight,
  Clock,
  Layers,
  Key,
  ExternalLink,
  Zap,
  Info,
  History,
  MessageSquare,
  Trash2,
  X
} from 'lucide-react';

const SUGGESTIONS = [
  'When is my DBMS exam?',
  'How much did I pay for hostel?',
  'What should I prepare for the project presentation?',
  'What did my professor say?',
  'Is there any date conflict for the presentation?',
  'What is my favorite food?', // Tests exact required not-found handling
];

export const AskMemoryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  // Conversation history state
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Chat UI state
  const [inputQuery, setInputQuery] = useState(initialQuery);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeSources, setActiveSources] = useState<Source[]>([]);
  const [activeConflict, setActiveConflict] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'searching' | 'reading' | 'idle'>('idle');
  const [mobileSourceDrawerOpen, setMobileSourceDrawerOpen] = useState(false);
  const [mobileHistoryDrawerOpen, setMobileHistoryDrawerOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(geminiService.hasApiKey());
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [modalKeyInput, setModalKeyInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations on mount
  useEffect(() => {
    setHasApiKey(geminiService.hasApiKey());
    loadConversationsList();
  }, []);

  const loadConversationsList = () => {
    const list = api.listConversations();
    setConversations(list);

    // If initial query provided via URL, prepare new chat
    if (initialQuery) {
      setCurrentConversationId(null);
      setMessages([]);
      setActiveSources([]);
      setActiveConflict(false);
    } else if (list.length > 0 && !currentConversationId) {
      // Load the most recent conversation by default
      const latest = list[0];
      setCurrentConversationId(latest.id);
      setMessages(latest.messages);
      setActiveSources(latest.activeSources || []);
      setActiveConflict(Boolean(latest.conflictDetected));
    }
  };

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingStage]);

  // If query in URL, automatically trigger
  useEffect(() => {
    if (initialQuery && messages.length === 0) {
      handleSend(initialQuery);
    }
  }, [initialQuery]);

  const selectConversation = (convId: string) => {
    const conv = api.getConversation(convId);
    if (!conv) return;
    setCurrentConversationId(conv.id);
    setMessages(conv.messages);
    setActiveSources(conv.activeSources || []);
    setActiveConflict(Boolean(conv.conflictDetected));
    setMobileHistoryDrawerOpen(false);
  };

  const startNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setActiveSources([]);
    setActiveConflict(false);
    setInputQuery('');
    setMobileHistoryDrawerOpen(false);
  };

  const handleDeleteConversation = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    api.deleteConversation(convId);
    const updated = api.listConversations();
    setConversations(updated);

    if (currentConversationId === convId) {
      if (updated.length > 0) {
        selectConversation(updated[0].id);
      } else {
        startNewChat();
      }
    }
  };

  const handleClearAllHistory = () => {
    if (window.confirm('Are you sure you want to clear all chat history?')) {
      api.clearAllConversations();
      setConversations([]);
      startNewChat();
    }
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputQuery('');
    setIsLoading(true);
    setLoadingStage('searching');

    try {
      setTimeout(() => {
        setLoadingStage('reading');
      }, 600);

      const res = await api.askMemory(query, currentConversationId || undefined);

      const assistantMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        conflictDetected: res.conflictDetected,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      setActiveSources(res.sources || []);
      setActiveConflict(Boolean(res.conflictDetected));

      // Persist conversation
      let convId = currentConversationId;
      let convTitle = '';
      if (!convId) {
        convId = 'conv-' + Date.now();
        convTitle = query.slice(0, 36) + (query.length > 36 ? '...' : '');
        setCurrentConversationId(convId);
      } else {
        const existing = api.getConversation(convId);
        convTitle = existing?.title || query.slice(0, 36);
      }

      const updatedConv: ChatConversation = {
        id: convId,
        title: convTitle,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messages: finalMessages,
        activeSources: res.sources || [],
        conflictDetected: Boolean(res.conflictDetected),
      };

      api.saveConversation(updatedConv);
      setConversations(api.listConversations());

      if (res.sources && res.sources.length > 0 && window.innerWidth < 1024) {
        setMobileSourceDrawerOpen(true);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        role: 'assistant',
        content: 'I encountered an error retrieving answers from your memories. Please verify your settings or try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setLoadingStage('idle');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveModalKey = () => {
    if (modalKeyInput.trim()) {
      geminiService.setApiKey(modalKeyInput.trim());
      setHasApiKey(true);
      setShowKeyModal(false);
    }
  };

  const formatMessageText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-semibold text-text-primary">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <li key={idx} className="ml-4 list-disc my-0.5">
            {formattedParts}
          </li>
        );
      }

      return (
        <span key={idx} className="block min-h-[1.25rem]">
          {formattedParts}
        </span>
      );
    });
  };

  return (
    <div className="flex h-[calc(100vh-80px)] md:h-screen w-full overflow-hidden bg-bg-base">
      {/* 1. Left Sidebar: Chat History & New Conversation (Desktop) */}
      <div className="hidden xl:flex flex-col justify-between w-68 border-r border-border bg-bg-elevated p-4 shrink-0 overflow-hidden">
        <div className="flex flex-col gap-4 overflow-hidden flex-1">
          {/* New Chat Button */}
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-accent text-white text-xs font-medium hover:brightness-110 active:scale-95 transition-all shadow-[0_0_12px_rgba(239,68,68,0.25)] shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Conversation</span>
          </button>

          {/* Chat History Section */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3 h-3 text-accent" />
                Chat History ({conversations.length})
              </span>
              {conversations.length > 0 && (
                <button
                  onClick={handleClearAllHistory}
                  title="Clear All Chat History"
                  className="text-[10px] font-mono text-text-muted hover:text-red-400 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Conversation List */}
            <div className="flex flex-col gap-1 overflow-y-auto flex-1 pr-1">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-xs text-text-muted font-mono">
                  No saved conversations yet.
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = currentConversationId === conv.id;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv.id)}
                      className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all border ${
                        isActive
                          ? 'bg-accent/15 border-accent/40 text-text-primary shadow-sm'
                          : 'bg-bg-base/40 border-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <MessageSquare
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{conv.title}</span>
                          <span className="block font-mono text-[9px] text-text-muted truncate mt-0.5">
                            {new Date(conv.updated_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })} · {conv.messages.length} msgs
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                        title="Delete chat"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-bg-base text-text-muted hover:text-red-400 transition-opacity shrink-0 ml-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Suggested Prompts Section */}
          <div className="border-t border-border pt-3 shrink-0">
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider px-2 block mb-1.5">
              Suggested Prompts
            </span>
            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
              {SUGGESTIONS.slice(0, 3).map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="text-left text-[11px] text-text-secondary hover:text-text-primary p-2 rounded-lg hover:bg-bg-hover transition-colors truncate border border-transparent"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Model Indicator */}
        <div className="pt-3 border-t border-border shrink-0">
          <div className="p-2.5 rounded-xl bg-bg-base border border-border text-[11px] font-mono text-text-muted">
            <div className="flex items-center gap-1.5 text-accent font-semibold mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{hasApiKey ? 'Gemini AI Active' : 'Demo Mode Active'}</span>
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed">
              {hasApiKey
                ? `Using ${geminiService.getModel()} with grounded citations.`
                : 'Using verified synthetic grounding dataset.'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Center Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-bg-base relative">
        {/* Chat Header */}
        <div className="h-14 border-b border-border px-4 md:px-6 flex items-center justify-between shrink-0 bg-bg-base/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileHistoryDrawerOpen(true)}
              className="xl:hidden p-1.5 rounded-lg bg-bg-elevated border border-border text-text-secondary hover:text-text-primary"
              title="Open Chat History"
            >
              <History className="w-4 h-4 text-accent" />
            </button>

            <div className="w-7 h-7 rounded-lg bg-accent-soft border border-accent/30 flex items-center justify-center text-accent">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold text-text-primary">
                  {currentConversationId
                    ? conversations.find((c) => c.id === currentConversationId)?.title || 'Ask Memory'
                    : 'New Conversation'}
                </h2>
                {hasApiKey ? (
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Gemini Live
                  </span>
                ) : (
                  <button
                    onClick={() => setShowKeyModal(true)}
                    className="font-mono text-[9px] px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 hover:bg-amber-400/20 transition-colors flex items-center gap-1"
                  >
                    <Key className="w-2.5 h-2.5" />
                    Connect Key
                  </button>
                )}
              </div>
              <p className="text-[10px] font-mono text-text-muted">Grounded RAG Retrieval</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={startNewChat}
              className="text-xs font-mono text-text-secondary hover:text-text-primary px-2.5 py-1 rounded-md border border-border hover:bg-bg-hover"
            >
              New Chat
            </button>
            {activeSources.length > 0 && (
              <button
                onClick={() => setMobileSourceDrawerOpen(!mobileSourceDrawerOpen)}
                className="lg:hidden flex items-center gap-1.5 text-xs font-mono text-accent px-2.5 py-1 rounded-md bg-accent-soft border border-accent/30"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Sources ({activeSources.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* API Key Suggestion Pill if not set */}
        {!hasApiKey && (
          <div className="px-6 py-2 bg-amber-500/5 border-b border-amber-500/15 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px]">
                Tip: Add your Gemini API key for dynamic AI comprehension across any memory.
              </span>
            </div>
            <Link
              to="/settings"
              className="font-mono text-[10px] text-accent hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Settings</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-accent-soft border border-accent/20 flex items-center justify-center text-accent mb-4 shadow-glow">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-text-primary">
                Ask anything about your personal memories
              </h3>
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                Questions are answered strictly using grounded information retrieved from your stored documents, notes, receipts and screenshots.
              </p>

              {/* Suggestions Pill Grid */}
              <div className="flex flex-col w-full gap-2 mt-6 text-left">
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="p-3 rounded-xl bg-bg-elevated border border-border hover:border-accent/40 text-xs text-text-secondary hover:text-text-primary transition-all flex items-center justify-between group"
                  >
                    <span>{q}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-accent transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-2xl ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-mono font-bold ${
                    msg.role === 'user'
                      ? 'bg-surface-container-high border border-border text-text-secondary'
                      : 'bg-accent text-white shadow-glow'
                  }`}
                >
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className="flex flex-col gap-1.5 max-w-[85vw] sm:max-w-xl">
                  <div
                    className={`p-4 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-accent/15 text-text-primary border border-accent/30 rounded-tr-none'
                        : 'bg-bg-elevated border border-border text-text-primary rounded-tl-none shadow-sm'
                    }`}
                  >
                    <div className="leading-relaxed">{formatMessageText(msg.content)}</div>

                    {/* Conflict notification inside bubble */}
                    {msg.conflictDetected && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold block">Conflicting Evidence Detected:</span>
                          Differing claims were found across your stored memories. Both sources have been cited side-by-side without guessing.
                        </div>
                      </div>
                    )}

                    {/* Sources trigger badge for assistant messages */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                        <span className="font-mono text-[10px] text-text-muted flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-success" />
                          Grounded in {msg.sources.length} {msg.sources.length === 1 ? 'source' : 'sources'}
                        </span>
                        <button
                          onClick={() => {
                            setActiveSources(msg.sources || []);
                            setActiveConflict(Boolean(msg.conflictDetected));
                            setMobileSourceDrawerOpen(true);
                          }}
                          className="font-mono text-[10px] text-accent hover:underline flex items-center gap-1"
                        >
                          <span>View Evidence</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <span
                    className={`font-mono text-[9px] text-text-muted px-1 ${
                      msg.role === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))
          )}

          {/* Loading stages indicator */}
          {isLoading && (
            <div className="flex gap-3 max-w-xl mr-auto">
              <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-bg-elevated border border-border text-xs text-text-secondary flex items-center gap-3">
                <Clock className="w-4 h-4 text-accent animate-spin" />
                <span className="font-mono text-xs">
                  {loadingStage === 'searching' && 'Searching indexed personal memories...'}
                  {loadingStage === 'reading' &&
                    (hasApiKey
                      ? 'Gemini synthesizing grounded response with verified citations...'
                      : 'Reading relevant sources & synthesizing grounded answer...')}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-border bg-bg-base">
          <div className="relative flex items-center max-w-4xl mx-auto">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents, notes or receipts... (Enter to send)"
              className="w-full bg-bg-elevated border border-border rounded-xl pl-4 pr-24 py-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent shadow-sm resize-none"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputQuery.trim() || isLoading}
              className="absolute right-2 px-3.5 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:brightness-110 active:scale-95 disabled:opacity-40 flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(239,68,68,0.25)]"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="max-w-4xl mx-auto flex items-center justify-between text-[10px] font-mono text-text-muted mt-2 px-1">
            <span>Shift + Enter for new line</span>
            <span>{hasApiKey ? '⚡ Gemini Grounding Active' : 'Demo Mode Active'}</span>
          </div>
        </div>
      </div>

      {/* 3. Right: Grounding Sources Panel */}
      <div
        className={`fixed lg:static inset-y-0 right-0 z-40 w-80 lg:w-88 border-l border-border bg-bg-elevated p-4 shrink-0 flex flex-col justify-between transition-transform duration-300 ${
          mobileSourceDrawerOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-accent" />
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                Source Evidence
              </h3>
            </div>
            <button
              onClick={() => setMobileSourceDrawerOpen(false)}
              className="lg:hidden text-xs font-mono text-text-muted hover:text-text-primary px-2 py-1 rounded bg-bg-base border border-border"
            >
              Close
            </button>
          </div>

          {activeConflict && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Conflicting Sources</span>
                These files present differing claims. Memory AI surfaces the discrepancy without guessing.
              </div>
            </div>
          )}

          {activeSources.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-bg-base/60 border border-border/70 flex flex-col items-center gap-2.5">
              <ShieldCheck className="w-8 h-8 text-text-muted" />
              <p className="text-xs font-medium text-text-secondary">No sources retrieved yet</p>
              <p className="text-[11px] text-text-muted leading-relaxed">
                When you ask a question, the retrieved file chunks, citations and verified evidence will be listed here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <span className="font-mono text-[10px] text-text-muted">
                {activeSources.length} verified {activeSources.length === 1 ? 'citation' : 'citations'}:
              </span>
              {activeSources.map((source, idx) => (
                <SourceCard key={source.id || idx} source={source} index={idx} />
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-border text-[10px] font-mono text-text-muted flex items-center justify-between">
          <span>{hasApiKey ? 'Gemini 2.5 Flash' : 'Synthetic Dataset'}</span>
          <span className="text-success">Verified Grounded</span>
        </div>
      </div>

      {/* Mobile Chat History Drawer */}
      {mobileHistoryDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-start">
          <div className="w-72 max-w-[85vw] h-full bg-bg-elevated border-r border-border p-4 flex flex-col justify-between animate-slide-in">
            <div className="flex flex-col gap-4 overflow-hidden flex-1">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="font-mono text-xs font-bold text-text-primary flex items-center gap-2">
                  <History className="w-4 h-4 text-accent" />
                  Chat History
                </span>
                <button
                  onClick={() => setMobileHistoryDrawerOpen(false)}
                  className="p-1 text-text-muted hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-accent text-white text-xs font-medium shadow-[0_0_12px_rgba(239,68,68,0.25)]"
              >
                <Plus className="w-4 h-4" />
                <span>New Conversation</span>
              </button>

              <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1">
                {conversations.map((conv) => {
                  const isActive = currentConversationId === conv.id;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv.id)}
                      className={`p-2.5 rounded-xl cursor-pointer text-xs flex items-center justify-between border ${
                        isActive
                          ? 'bg-accent/15 border-accent/40 text-text-primary'
                          : 'bg-bg-base/40 border-transparent text-text-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <MessageSquare className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span className="truncate font-medium">{conv.title}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                        className="p-1 text-text-muted hover:text-red-400 shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {conversations.length > 0 && (
              <button
                onClick={handleClearAllHistory}
                className="pt-3 border-t border-border text-center text-xs text-text-muted hover:text-red-400"
              >
                Clear All History
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl bg-bg-elevated border border-border max-w-md w-full flex flex-col gap-4 shadow-surface">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent-soft border border-accent/30 flex items-center justify-center text-accent">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">Connect Gemini API Key</h3>
                <p className="text-[11px] text-text-muted">Enable real-time grounded reasoning for your memories</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">API Key</label>
              <input
                type="password"
                value={modalKeyInput}
                onChange={(e) => setModalKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-bg-base border border-border rounded-xl px-3.5 py-2.5 text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
              />
              <span className="text-[10px] text-text-muted">
                Don't have a key?{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline"
                >
                  Get free key on Google AI Studio
                </a>
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="px-3.5 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary border border-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModalKey}
                disabled={!modalKeyInput.trim()}
                className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-accent hover:brightness-110 disabled:opacity-40"
              >
                Save &amp; Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
