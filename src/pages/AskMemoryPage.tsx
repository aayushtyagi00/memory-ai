import {Dialog} from '../components/common/Dialog';
import {reportError} from '../components/common/Feedback';
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { geminiService } from '../services/gemini';
import {useAIStatus} from '../hooks/useAIStatus';
import { Source, ChatMessage, ChatConversation } from '../types';
import { SourceCard } from '../components/common/SourceCard';
import { getImageFromIndexedDB } from '../utils/indexedDb';
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
  AlertCircle,
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
  const {status: aiStatus}=useAIStatus();
  const hasApiKey=aiStatus==='configured';
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [modalKeyInput, setModalKeyInput] = useState('');
  const [unindexedImagesCount, setUnindexedImagesCount] = useState(0);


  const [dismissUnindexedBanner, setDismissUnindexedBanner] = useState(false);
  const [isTranscribingBatch, setIsTranscribingBatch] = useState(false);
  const [transcribeNotice, setTranscribeNotice] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
    actionText?: string;
    actionLink?: string;
    onAction?: () => void;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const view=useRef(0);
  const busy=useRef(false);
  const automaticQuery=useRef('');
  // Load conversations and check memories on mount
  useEffect(() => {
    let alive=true;
    const token=++view.current;

    api.listConversations().then(list=>{if(!alive||token!==view.current)return;setConversations(list);if(initialQuery&&automaticQuery.current!==initialQuery){automaticQuery.current=initialQuery;void handleSend(initialQuery,true);}else if(!initialQuery&&list.length){const latest=list[0];setCurrentConversationId(latest.id);setMessages(latest.messages);setActiveSources(latest.activeSources||[]);}}).catch(reportError);
    checkUnindexedImages();
    return()=>{alive=false;view.current++;busy.current=false;};
  }, [initialQuery]);

  const checkUnindexedImages = async () => {
    try {
      const list = await api.listMemories();
      const unindexed = list.filter(m=>(m.type==='image'||m.mime_type==='application/pdf')&&m.indexing_status!=='ready');

      setUnindexedImagesCount(unindexed.length);

    } catch {
      // ignore
    }
  };



  const handleIndexAllImages = async () => {
    if (!geminiService.hasApiKey()) {
      setShowKeyModal(true);
      return;
    }
    setIsTranscribingBatch(true);
    try {
      const result = await api.transcribeAllPendingImages();
      if (result.count > 0 && result.failed === 0) {
        setTranscribeNotice({
          type: 'success',
          message: `Successfully indexed all ${result.count} screenshot${result.count === 1 ? '' : 's'} with AI Vision! Data, text & tables are now searchable in chat.`,
        });
      } else if (result.count > 0 && result.failed > 0) {
        setTranscribeNotice({
          type: 'warning',
          message: `Indexed ${result.count} screenshot${result.count === 1 ? '' : 's'}. (${result.failed} failed: missing image cache).`,
          actionText: 'Re-upload in Add Memory',
          actionLink: '/add',
        });
      } else if (result.count === 0 && result.failed > 0) {
        setTranscribeNotice({
          type: 'warning',
          message: `Could not index ${result.failed} screenshot${result.failed === 1 ? '' : 's'}: Review the original in Memory Library and retry extraction; re-upload it only if missing.`,
          actionText: 'Open Memory Library',
          actionLink: '/memories',
        });
      } else {
        setTranscribeNotice({
          type: 'info',
          message: 'All screenshots are already fully indexed.',
        });
      }
      await checkUnindexedImages();
      setTimeout(() => setTranscribeNotice(null), 10000);
    } catch (err: any) {
      setTranscribeNotice({
        type: 'warning',
        message: 'Notice: ' + (err?.message || 'Error transcribing images'),
      });
    } finally {
      setIsTranscribingBatch(false);
    }
  };

  const loadConversationsList = async () => {
    const list = await api.listConversations();
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

  const selectConversation = async (convId: string) => {
    const token=++view.current;busy.current=false;setIsLoading(false);
    const conv = await api.getConversation(convId);
    if (!conv||token!==view.current) return;
    setCurrentConversationId(conv.id);
    setMessages(conv.messages);
    setActiveSources(conv.activeSources || []);
    setActiveConflict(Boolean(conv.conflictDetected));
    setMobileHistoryDrawerOpen(false);
  };

  const startNewChat = () => {
    view.current++;busy.current=false;setIsLoading(false);
    setCurrentConversationId(null);
    setMessages([]);
    setActiveSources([]);
    setActiveConflict(false);
    setInputQuery('');
    setMobileHistoryDrawerOpen(false);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    view.current++;busy.current=false;setIsLoading(false);
    await api.deleteConversation(convId);
    const updated = await api.listConversations();
    setConversations(updated);

    if (currentConversationId === convId) {
      if (updated.length > 0) {
        selectConversation(updated[0].id);
      } else {
        startNewChat();
      }
    }
  };

  const handleClearAllHistory = async () => {
    if (window.confirm('Are you sure you want to clear all chat history?')) {
      await api.clearAllConversations();
      setConversations([]);
      startNewChat();
    }
  };

  const handleSend = async (textToSend?: string, fresh=false) => {
    const query=(textToSend||inputQuery).trim();if(!query||busy.current)return;
    if(query.length>2000){reportError('Questions are limited to 2,000 characters.');return;}
    const token=++view.current;busy.current=true;setIsLoading(true);setLoadingStage('searching');setInputQuery('');
    const convId=fresh?crypto.randomUUID():currentConversationId||crypto.randomUUID();
    const previous=fresh?[]:messages;
    if(previous.length>=198){busy.current=false;setIsLoading(false);reportError('This conversation is full. Start a new chat.');return;}
    const userMsg:ChatMessage={id:crypto.randomUUID(),role:'user',content:query,timestamp:new Date().toISOString()};
    const newMessages=[...previous,userMsg];setMessages(newMessages);setCurrentConversationId(convId);
    const prior=conversations.find(c=>c.id===convId);
    const conv:ChatConversation={id:convId,title:prior?.title||query.slice(0,80),created_at:prior?.created_at||new Date().toISOString(),updated_at:new Date().toISOString(),messages:newMessages};
    try{
      await api.saveConversation(conv);
      if(token!==view.current)return;
      setLoadingStage('reading');
      const res=await api.askMemory(query,convId);
      if(token!==view.current)return;
      const assistant:ChatMessage={id:crypto.randomUUID(),role:'assistant',content:res.answer,sources:res.sources,conflictDetected:res.conflictDetected,timestamp:new Date().toISOString()};
      const complete={...conv,messages:[...newMessages,assistant],activeSources:res.sources,conflictDetected:res.conflictDetected};
      await api.saveConversation(complete);
      if(token!==view.current)return;
      setMessages(complete.messages);setActiveSources(res.sources);setActiveConflict(!!res.conflictDetected);
      const list=await api.listConversations();if(token===view.current)setConversations(list);
    }catch(error){if(token===view.current)reportError(error);}finally{if(token===view.current){busy.current=false;setIsLoading(false);setLoadingStage('idle');}}
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
      <div className="hidden xl:flex flex-col justify-between w-[17rem] border-r border-border bg-bg-elevated p-4 shrink-0 overflow-hidden">
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
                    <div role="button" tabIndex={0} onKeyDown={event=>{if(event.target===event.currentTarget&&(event.key==='Enter'||event.key===' ')){event.preventDefault();event.currentTarget.click();}}}
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
              <span>{hasApiKey ? 'Your Gemini key is set' : 'Text search active'}</span>
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed">
              {hasApiKey
                ? `Using ${geminiService.getModel()} with grounded citations.`
                : 'Local search returns excerpts from the saved demo memories.'}
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
                    Your API key is set
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

        {/* Ghost Images Detected Banner */}


        {/* Unindexed Screenshots Banner */}
        {unindexedImagesCount > 0 && !dismissUnindexedBanner && (
          <div className="mx-4 md:mx-6 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <div>
                <span className="font-semibold text-text-primary">
                  {unindexedImagesCount} screenshot{unindexedImagesCount > 1 ? 's need' : ' needs'} AI Vision indexing
                </span>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Transcribe your uploaded screenshots so Memory AI can read all text, tables and receipts inside them.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleIndexAllImages}
                disabled={isTranscribingBatch}
                className="px-3.5 py-1.5 rounded-lg bg-accent text-white font-medium text-xs hover:brightness-110 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isTranscribingBatch ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Indexing Screenshots...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Index All Screenshots</span>
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
            className={`mx-4 md:mx-6 mt-2 p-3 rounded-xl text-xs flex items-center justify-between gap-3 ${
              transcribeNotice.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : transcribeNotice.type === 'warning'
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                : 'bg-blue-500/10 border border-blue-500/30 text-blue-300'
            }`}
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0 flex-wrap sm:flex-nowrap">
              {transcribeNotice.type === 'success' ? (
                <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
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
            <span>{hasApiKey ? '⚡ AI configured' : 'Text search active'}</span>
          </div>
        </div>
      </div>

      {/* 3. Right: Grounding Sources Panel */}
      <div
        className="hidden lg:flex w-80 border-l border-border bg-bg-elevated p-4 shrink-0 flex-col justify-between"
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
                When you ask a question, the retrieved file chunks, citations and matching excerpts will be listed here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <span className="font-mono text-[10px] text-text-muted">
                {activeSources.length} source {activeSources.length === 1 ? 'citation' : 'citations'}:
              </span>
              {activeSources.map((source, idx) => (
                <SourceCard key={source.id || idx} source={source} index={idx} />
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-border text-[10px] font-mono text-text-muted flex items-center justify-between">
          <span>{hasApiKey ? geminiService.getModel() : 'Local Text Search'}</span>
          <span className="text-success">Source excerpts</span>
        </div>
      </div>

      {mobileSourceDrawerOpen&&<Dialog label="Source evidence" onClose={()=>setMobileSourceDrawerOpen(false)}><div className="max-w-lg w-full bg-bg-elevated rounded-xl p-6"><button onClick={()=>setMobileSourceDrawerOpen(false)} className="mb-4 underline">Close sources</button>{activeSources.map((source,index)=><SourceCard key={source.memoryId||index} source={source} index={index}/>)}</div></Dialog>}
      {/* Mobile Chat History Drawer */}
      {mobileHistoryDrawerOpen && (
        <Dialog label="Chat history" onClose={()=>setMobileHistoryDrawerOpen(false)}>
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
                    <div role="button" tabIndex={0} onKeyDown={event=>{if(event.target===event.currentTarget&&(event.key==='Enter'||event.key===' ')){event.preventDefault();event.currentTarget.click();}}}
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
        </Dialog>
      )}

      {/* Quick API Key Modal */}
      {showKeyModal && (
        <Dialog label="Your Gemini API key" onClose={()=>setShowKeyModal(false)}>
          <div className="p-6 rounded-2xl bg-bg-elevated border border-border max-w-md w-full flex flex-col gap-4 shadow-surface">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent-soft border border-accent/30 flex items-center justify-center text-accent">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">Connect Gemini API Key</h3>
                <p className="text-[11px] text-text-muted">Requests go directly to Google using your account. Your key stays in this tab until reload or sign-out.</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="AskMemoryPage-field-934" className="text-xs font-medium text-text-secondary">API Key</label>
              <input id="AskMemoryPage-field-934"
                type="password"
                value={modalKeyInput}
                onChange={(e) => setModalKeyInput(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="Your personal Gemini API key"
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
                  Get a key on Google AI Studio
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
        </Dialog>
      )}
    </div>
  );
};
