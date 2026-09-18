export type MemoryType = 'document' | 'image' | 'note';

export type IndexingStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface Source {
  id?: string;
  title: string;
  fileName?: string;
  type?: string;
  citation?: string;
  url?: string;
  memoryId?: string;
  snippet?: string;
}

export interface Memory {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  type: MemoryType;
  category?: string | null;
  tags?: string[];
  storage_path?: string | null;
  original_file_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  gemini_document_name?: string | null;
  gemini_file_name?: string | null;
  gemini_store_name?: string | null;
  indexing_status: IndexingStatus;
  indexing_error?: string | null;
  is_favorite?: boolean;
  created_at: string;
  updated_at: string;
  content?: string; // For notes or inline previews
}

export interface Note {
  id: string;
  user_id: string;
  memory_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  conflictDetected?: boolean;
  timestamp: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
  activeSources?: Source[];
  conflictDetected?: boolean;
}

export interface Conversation {
  id: string;
  user_id: string;
  title?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[] | null;
  created_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  due_at?: string | null;
  source_memory_id?: string | null;
  status: 'pending' | 'completed';
  created_at: string;
  source_memory_title?: string;
}

export interface Profile {
  id: string;
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AskResponse {
  answer: string;
  sources: Source[];
  foundInformation: boolean;
  conflictDetected?: boolean;
  conversationId?: string;
}

export interface UserStats {
  total: number;
  documents: number;
  notes: number;
  images: number;
  storageBytes?: number;
  storageLimitBytes?: number;
}
