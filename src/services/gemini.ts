import { Memory, Source, Reminder, AskResponse } from '../types';
import { getImageFromIndexedDB } from '../utils/indexedDb';

const STORAGE_API_KEY = 'memory_ai_gemini_api_key';
const STORAGE_MODEL_KEY = 'memory_ai_gemini_model';
export const DEFAULT_MODEL = 'gemini-2.5-flash';

export const SUPPORTED_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Recommended · Flagship multimodal model with ultra-fast search' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'Frontier Reasoning · State-of-the-art complex analysis & deep synthesis' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', desc: 'Ultra-low latency · High throughput lightweight intelligence' },
];

export interface GeminiAnalysisResult {
  title: string;
  category: string;
  tags: string[];
  summary?: string;
  detectedReminder?: {
    title: string;
    due_at?: string;
    description?: string;
  };
}

export interface ExtractedReminder {
  title: string;
  description?: string;
  due_at?: string;
  source_memory_id?: string;
  source_memory_title?: string;
}

export const geminiService = {
  getApiKey(): string {
    const local = localStorage.getItem(STORAGE_API_KEY);
    if (local && local.trim()) return local.trim();
    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (envKey && typeof envKey === 'string' && envKey.trim()) return envKey.trim();
    return '';
  },

  setApiKey(key: string): void {
    if (!key || !key.trim()) {
      localStorage.removeItem(STORAGE_API_KEY);
    } else {
      localStorage.setItem(STORAGE_API_KEY, key.trim());
    }
  },

  hasApiKey(): boolean {
    return Boolean(this.getApiKey());
  },

  getModel(): string {
    const stored = localStorage.getItem(STORAGE_MODEL_KEY);
    // Auto-migrate retired models (1.5-pro -> 2.5-pro, 2.0-flash / 1.5-flash -> 2.5-flash)
    if (stored === 'gemini-1.5-pro') return 'gemini-2.5-pro';
    if (stored === 'gemini-2.0-flash' || stored === 'gemini-1.5-flash') return 'gemini-2.5-flash';
    return stored || DEFAULT_MODEL;
  },

  setModel(model: string): void {
    localStorage.setItem(STORAGE_MODEL_KEY, model);
  },

  /**
   * Helper to make a direct API call to Google Generative Language API.
   * This is universally compatible with browser environments and requires no Node dependencies.
   */
  async callGenerateContent(
    prompt: string,
    systemInstruction?: string,
    options?: {
      model?: string;
      apiKey?: string;
      temperature?: number;
      inlineData?: { mimeType: string; data: string }[];
      responseSchemaJson?: boolean;
    }
  ): Promise<string> {
    const key = options?.apiKey || this.getApiKey();
    if (!key) {
      throw new Error('Gemini API Key is not configured. Please enter your API key in Settings.');
    }

    const model = options?.model || this.getModel();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

    const parts: any[] = [];
    if (options?.inlineData) {
      for (const item of options.inlineData) {
        parts.push({
          inlineData: {
            mimeType: item.mimeType,
            data: item.data,
          },
        });
      }
    }
    parts.push({ text: prompt });

    const requestBody: any = {
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      generationConfig: {
        temperature: options?.temperature ?? 0.1, // low temperature for strict grounding
      },
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    if (options?.responseSchemaJson) {
      requestBody.generationConfig.responseMimeType = 'application/json';
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error?.message || `Gemini API error (${res.status} ${res.statusText})`;

      // Auto-fallback recovery: If the requested model is not found/deprecated, retry with DEFAULT_MODEL
      if (res.status === 404 && model !== DEFAULT_MODEL) {
        console.warn(`Model "${model}" was not found (retired/unsupported). Automatically recovering with "${DEFAULT_MODEL}".`);
        return this.callGenerateContent(prompt, systemInstruction, {
          ...options,
          model: DEFAULT_MODEL,
        });
      }

      throw new Error(msg);
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || '';
    return text;
  },

  /**
   * Test API key validity and measure response latency.
   */
  async testConnection(keyToTest?: string, modelToTest?: string): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const key = keyToTest || this.getApiKey();
    if (!key) {
      return { success: false, latencyMs: 0, error: 'No API key provided.' };
    }

    const start = performance.now();
    try {
      const model = modelToTest || this.getModel();
      const res = await this.callGenerateContent('Ping: Respond with "OK"', undefined, {
        apiKey: key,
        model,
        temperature: 0,
      });

      const latencyMs = Math.round(performance.now() - start);
      if (res && res.length > 0) {
        return { success: true, latencyMs };
      }
      return { success: false, latencyMs, error: 'Empty response received from Gemini.' };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      return { success: false, latencyMs, error: err?.message || 'Connection test failed.' };
    }
  },

  /**
   * Grounded Question-Answering using stored memories.
   */
  async askMemoryWithGemini(question: string, memories: Memory[]): Promise<AskResponse> {
    if (!this.hasApiKey()) {
      throw new Error('No Gemini API Key available');
    }

    if (memories.length === 0) {
      return {
        answer: "You don't have any indexed memories yet. Upload a document or write a note to get started!",
        sources: [],
        foundInformation: false,
        conflictDetected: false,
      };
    }

    // Rank & prioritize memories by keyword relevance to question
    const qTerms = question
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2 && !['what', 'when', 'where', 'which', 'does', 'have', 'from', 'with', 'about', 'this', 'that', 'tell', 'show', 'give'].includes(w));

    const isVisualQuery = /screenshot|image|photo|picture|pic|receipt|bill|slip|table|score|chart|view|scan|camera|capture|upload/i.test(question);

    const scoredMemories = [...memories].sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      const textA = `${a.title} ${a.description || ''} ${a.original_file_name || ''} ${a.content || ''} ${a.tags?.join(' ') || ''}`.toLowerCase();
      const textB = `${b.title} ${b.description || ''} ${b.original_file_name || ''} ${b.content || ''} ${b.tags?.join(' ') || ''}`.toLowerCase();

      for (const t of qTerms) {
        if (textA.includes(t)) scoreA += 2;
        if (a.title.toLowerCase().includes(t)) scoreA += 4;
        if (textB.includes(t)) scoreB += 2;
        if (b.title.toLowerCase().includes(t)) scoreB += 4;
      }

      if (isVisualQuery) {
        if (a.type === 'image') scoreA += 6;
        if (b.type === 'image') scoreB += 6;
      }

      // Prioritize user-uploaded / custom memories over initial demo memories
      if (!a.id.startsWith('demo-mem-') && b.id.startsWith('demo-mem-')) {
        scoreA += 8;
      } else if (a.id.startsWith('demo-mem-') && !b.id.startsWith('demo-mem-')) {
        scoreB += 8;
      }

      return scoreB - scoreA;
    });

    // Format top memories for grounding (cap at 30 most relevant)
    const candidates = scoredMemories.slice(0, 30);
    const formattedMemories = candidates.map((m, idx) => {
      const isScreenshot = m.type === 'image';
      return `--- MEMORY ITEM [${idx + 1}] ---
ID: ${m.id}
Title: ${m.title}
Filename: ${m.original_file_name || m.title}
Type: ${m.type}${isScreenshot ? ' (Screenshot / Image OCR Transcription)' : ''}
Category: ${m.category || 'General'}
Tags: ${m.tags?.join(', ') || 'none'}
Content:
${m.content || m.description || '(No explicit text transcribed)'}
---------------------------`;
    }).join('\n\n');

    // Attach inline visual data for top image candidates if available
    const inlineData: { mimeType: string; data: string }[] = [];
    const imageCandidates = candidates
      .filter((c) => c.type === 'image' && c.storage_path?.startsWith('data:image/'))
      .slice(0, 3);

    for (const img of imageCandidates) {
      if (img.storage_path) {
        try {
          const parts = img.storage_path.split(',');
          const mimeMatch = parts[0].match(/data:(.*?);base64/);
          if (mimeMatch && parts[1]) {
            inlineData.push({
              mimeType: mimeMatch[1],
              data: parts[1],
            });
          }
        } catch (e) {
          console.warn('Could not attach inline image data for candidate:', img.id, e);
        }
      }
    }

    const systemInstruction = `You are Memory AI, a private personal information retrieval assistant.
Answer user questions using ONLY information retrieved from the user's stored memories provided below.

Strict Grounding & Citation Rules:
1. Ground every statement strictly in the provided memories. Do NOT invent, assume, or hallucinate facts outside the memories.
2. If the user is asking about an uploaded screenshot or image, check the (Screenshot / Image OCR Transcription) items carefully.
3. If the answer cannot be found in the memories, your answer MUST be exactly:
   "I couldn't find this information in your memories."
   Set foundInformation to false and sources to [].
4. For any found information, you MUST cite the specific memory source in the "sources" list:
   - memoryId: You MUST use the exact "ID" string of the specific memory item you retrieved the fact from (e.g. "ID: xyz"). NEVER cite a memory that does not contain the answer.
   - title: Exact title of that specific memory item
   - fileName: Exact Filename of that specific memory item
   - citation: Filename or Title
   - type: document | image | note
   - snippet: Exact sentence or excerpt from that memory that proves your answer
5. If sources conflict (e.g. differing dates, differing amounts, differing status across documents), do NOT silently choose one.
   Set conflictDetected to true, clearly state in your answer that sources conflict, and cite both conflicting sources.
6. If the question is a general conversation or unrelated question, reply that Memory AI is focused on searching and retrieving their personal memories.
7. You MUST format your final response strictly as valid JSON matching this structure:
{
  "answer": "string",
  "foundInformation": true,
  "conflictDetected": false,
  "sources": [
    {
      "memoryId": "string",
      "title": "string",
      "fileName": "string",
      "citation": "string",
      "type": "document" | "image" | "note",
      "snippet": "string"
    }
  ]
}`;

    const userPrompt = `USER'S STORED MEMORIES:
${formattedMemories}

USER QUESTION:
"${question}"

Provide the JSON response now:`;

    try {
      const responseText = await this.callGenerateContent(userPrompt, systemInstruction, {
        temperature: 0.1,
        inlineData: inlineData.length > 0 ? inlineData : undefined,
        responseSchemaJson: true,
      });

      // Parse JSON from output
      let cleaned = responseText.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      let parsed: any;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = {
            answer: cleaned,
            foundInformation: false,
            conflictDetected: false,
            sources: [],
          };
        }
      }

      // Verify sources strictly against actual memories
      const verifiedSources: Source[] = (parsed.sources || [])
        .map((s: any) => {
          let matchingMem = memories.find((m) => m.id === s.memoryId);
          if (!matchingMem && s.fileName) {
            matchingMem = memories.find((m) => m.original_file_name?.toLowerCase() === s.fileName.toLowerCase());
          }
          if (!matchingMem && s.title) {
            matchingMem = memories.find((m) => m.title.toLowerCase() === s.title.toLowerCase());
          }
          if (!matchingMem) return null;

          return {
            id: matchingMem.id,
            memoryId: matchingMem.id,
            title: matchingMem.title,
            fileName: matchingMem.original_file_name || matchingMem.title,
            citation: matchingMem.original_file_name || matchingMem.title,
            type: matchingMem.type,
            snippet: s.snippet || matchingMem.content?.slice(0, 250) || matchingMem.description || '',
          };
        })
        .filter(Boolean) as Source[];

      return {
        answer: parsed.answer || "I couldn't find this information in your memories.",
        foundInformation: Boolean(parsed.foundInformation),
        conflictDetected: Boolean(parsed.conflictDetected),
        sources: verifiedSources,
      };
    } catch (err: any) {
      console.error('Gemini askMemory error:', err);
      throw err;
    }
  },

  /**
   * Automatically analyze text note or document content to suggest title, category, tags, and detect reminders.
   */
  async analyzeMemoryContent(content: string, existingTitle?: string): Promise<GeminiAnalysisResult> {
    const prompt = `Analyze this personal note/document content:
"""
${content.slice(0, 4000)}
"""
${existingTitle ? `Current Title: "${existingTitle}"` : ''}

Extract and return JSON with:
1. "title": a concise, descriptive title (3-6 words)
2. "category": exactly one of ["Academic", "Financial", "Career", "Personal", "Meeting", "General"]
3. "tags": array of 3 to 5 lowercase keyword tags
4. "summary": 1-2 sentence executive summary
5. "detectedReminder": (optional) if there is an explicit deadline, exam date, payment due date, or scheduled event, extract { "title": string, "due_at": "ISO 8601 string or YYYY-MM-DD", "description": string }. Otherwise null.

Respond strictly with valid JSON.`;

    const systemInstruction = `You are an AI document analysis engine for Memory AI. Output valid JSON only.`;

    const responseText = await this.callGenerateContent(prompt, systemInstruction, {
      temperature: 0.2,
      responseSchemaJson: true,
    });

    let cleaned = responseText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return JSON.parse(cleaned);
  },

  /**
   * Multimodal Vision: Transcribe and understand images/screenshots using Gemini Vision.
   * Supports File object, base64 data URL, or remote/blob image URL.
   */
  async extractTextFromImage(
    fileOrUrl: File | string,
    providedMimeType?: string
  ): Promise<{ extractedText: string; title: string; category: string; tags: string[] }> {
    let base64Data = '';
    let mimeType = providedMimeType || 'image/jpeg';

    if (typeof fileOrUrl === 'string') {
      if (fileOrUrl.startsWith('data:')) {
        const parts = fileOrUrl.split(',');
        const mimeMatch = parts[0].match(/data:(.*?);base64/);
        if (mimeMatch) mimeType = mimeMatch[1];
        base64Data = parts[1] || '';
      } else if (fileOrUrl.startsWith('http://') || fileOrUrl.startsWith('https://')) {
        const resp = await fetch(fileOrUrl);
        const blob = await resp.blob();
        mimeType = blob.type || mimeType;
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] || '');
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else if (fileOrUrl.startsWith('indexeddb:')) {
        const key = fileOrUrl.replace('indexeddb:', '');
        const data = await getImageFromIndexedDB(key);
        if (!data) throw new Error('Image data is missing from local IndexedDB cache.');
        return this.extractTextFromImage(data);
      } else if (!fileOrUrl.startsWith('/') && fileOrUrl.includes('/') && !fileOrUrl.includes(';base64,')) {
        throw new Error(`Cannot parse remote storage path "${fileOrUrl}" directly without signed URL.`);
      } else {
        base64Data = fileOrUrl;
      }
    } else {
      mimeType = fileOrUrl.type || 'image/jpeg';
      base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(fileOrUrl);
      });
    }

    if (!base64Data) {
      throw new Error('No valid image data available for vision extraction.');
    }

    const prompt = `Carefully examine this image (receipt, document, screenshot, chat, schedule, or table).
1. Transcribe ALL visible text, numbers, labels, dates, codes, transactions, and details accurately.
2. Provide:
- "extractedText": exhaustive clean text transcription and structured breakdown of all visible text and data
- "title": appropriate concise descriptive title for this image (e.g. "Semester Exam Schedule", "Electricity Bill", "WhatsApp Chat with Alex")
- "category": one of ["Academic", "Financial", "Career", "Personal", "Meeting", "General"]
- "tags": 3-5 lowercase keyword tags

Output valid JSON matching this schema:
{
  "extractedText": "string",
  "title": "string",
  "category": "string",
  "tags": ["string"]
}`;

    const responseText = await this.callGenerateContent(prompt, undefined, {
      inlineData: [{ mimeType, data: base64Data }],
      temperature: 0.1,
      responseSchemaJson: true,
    });

    let cleaned = responseText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      return JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      return {
        extractedText: cleaned,
        title: 'Screenshot Memory',
        category: 'General',
        tags: ['screenshot', 'image'],
      };
    }
  },

  /**
   * Scan all user memories with Gemini to detect upcoming deadlines and events.
   */
  async scanMemoriesForReminders(memories: Memory[]): Promise<ExtractedReminder[]> {
    if (memories.length === 0) return [];

    const summaries = memories.map((m) => {
      return `Memory ID: ${m.id}
Title: ${m.title}
File: ${m.original_file_name || m.title}
Category: ${m.category}
Content Excerpt: ${m.content?.slice(0, 1000) || m.description || ''}`;
    }).join('\n---\n');

    const prompt = `Review these user memories and identify all future or scheduled deadlines, exam dates, fee payment dates, interview schedules, project submissions, and meetings.

Memories:
${summaries}

Return a JSON array of reminders:
[
  {
    "title": "Short reminder title (e.g., DBMS Examination)",
    "description": "Details including time, location, venue, instructions",
    "due_at": "ISO 8601 string or YYYY-MM-DDTHH:mm:ss if time known",
    "source_memory_id": "the exact Memory ID that mentioned this",
    "source_memory_title": "title of the memory"
  }
]

If no upcoming dates or deadlines are found, return empty array []. Output strictly valid JSON.`;

    const responseText = await this.callGenerateContent(prompt, undefined, {
      temperature: 0.1,
      responseSchemaJson: true,
    });

    let cleaned = responseText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return JSON.parse(cleaned);
  },
};
