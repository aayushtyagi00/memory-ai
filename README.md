# MEMORY AI — Your Private Searchable Personal Memory

**Never lose important information again.**  
Turn scattered documents, screenshots and notes into a searchable personal memory with grounded Google Gemini AI answers.

---

## ⚡ Google Gemini API Integration

Memory AI is powered directly by the **Google Gemini API**:
- **Grounded Q&A (`AskMemoryPage`)**: Gemini strictly retrieves information from your indexed documents and notes, always citing source files and exact snippets. If conflicting claims exist across your files, it highlights the discrepancy. If not found, it strictly replies: *"I couldn't find this information in your memories."*
- **AI Auto-Tagging & Title Extraction (`AddMemoryPage`)**: Click **"✨ Auto-Fill with Gemini"** when creating a note to automatically generate a concise title, appropriate category, and relevant tags.
- **Multimodal Vision Extraction (`AddMemoryPage`)**: Upload screenshots, receipts, or timetable images; Gemini Vision reads and transcribes text and numbers into your memory store.
- **AI Reminders Extractor (`RemindersPage`)**: Click **"✨ AI Scan Memories"**; Gemini reviews all your stored memories, detects upcoming deadlines, exams, and payment dates, and allows 1-click importing into your reminders list.
- **Model Switcher (`SettingsPage`)**: Easily switch between `gemini-2.5-flash` (recommended), `gemini-2.0-flash`, `gemini-1.5-flash`, and `gemini-1.5-pro`.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Gemini API Key
You can configure your key in either of two ways:
- **In-App (Recommended)**: Go to **Settings** in the app, enter your Gemini API Key in the input field, test the connection with 1 click, and save it.
- **Environment File**: Create a `.env` file from `.env.example`:
  ```env
  VITE_GEMINI_API_KEY=your_gemini_api_key_here
  VITE_GEMINI_MODEL=gemini-2.5-flash
  ```
  *(Get a free key from [Google AI Studio](https://aistudio.google.com/app/apikey)).*

> Note: If no API key is provided, the app continues to work in **Demo Grounding Mode** using the built-in synthetic benchmark dataset.

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📱 Screen Catalog & Architecture

| # | Screen Title | Route | Description |
|---|---|---|---|
| 1 | **Landing Page** | `/` | Pipeline visualizer, feature breakdown, and quick access |
| 2 | **Authentication** | `/login` | Secure sign in / sign up + 1-click demo guest login |
| 3 | **Dashboard** | `/dashboard` | Quick search bar, statistics, recent memories, upcoming reminders |
| 4 | **Add Memory** | `/add` | Document upload, screenshot preview, notes, Gemini auto-fill & vision |
| 5 | **Ask Memory** | `/ask` | Grounded RAG chat, citation inspector, conflict detection alert |
| 6 | **Memory Library** | `/memories` | Full-text search across titles and contents, filters, favorites |
| 7 | **Memory Detail** | `/memories/:id` | Full content viewer, metadata, Gemini AI summary, inline editing |
| 8 | **Timeline** | `/timeline` | Chronological grouping of memories by month and year |
| 9 | **Reminders** | `/reminders` | Upcoming deadlines, AI scanning from memories, completed toggle |
| 10 | **Settings** | `/settings` | Gemini API key configuration, live test ping, model selector, demo data reset |

---

## 🛠 Tech Stack
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS (Tailored dark mode, glowing accents, glassmorphic panels)
- **Icons**: Lucide React + Material Symbols
- **AI SDK**: Google Gemini API (`@google/genai` + Direct Browser REST fallback)
- **Database / Auth**: Local encrypted storage (Default) + Supabase support
