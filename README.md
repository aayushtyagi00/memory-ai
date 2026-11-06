# Memory AI

A personal library for originals, searchable document text, notes, source-based Q&A, and reminders.

## Local setup

Use Node 24, then run `npm ci` and `npm run dev`.

**Explore Interactive Demo** opens a local demo without an account. Its IndexedDB data is not encrypted by this app and is shared with subsequent demo sessions in this browser. Cloud requests never silently fall back to that storage.

For cloud sign-in, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using `.env.example`, then follow [deployment instructions](docs/DEPLOYMENT.md). The migrations and Edge Functions must also be deployed.

## Features and limits

- PDF, DOCX, XLSX, TXT, Markdown, CSV, JSON, PNG, JPG and WEBP uploads, up to 15 MB. Originals are retained. Convert unsupported legacy `.doc` files first.
- Text PDFs, Word documents and spreadsheets are parsed locally. Scanned PDFs/images require AI transcription. Failed extraction is visible, with the saved original available for review or retry.
- Cloud Q&A searches user-owned text chunks and sends bounded excerpts to Google Gemini. Source quotes must match stored text. AI synthesis and OCR can still be wrong; review original evidence.
- The demo provides deterministic excerpt search. Optional personal Gemini keys are kept in tab memory only until reload/sign-out. Cloud AI uses a server secret.
- Timezone-aware reminders, completion, duplicate checks, and optional email delivery after configuring Resend and a scheduler. The local demo sends no emails.
- Plaintext backup export/restore up to 50 MB. Restore adds records. Sample documents without binary originals restore as notes. Large-vault archival export is not implemented; download originals individually.
- Retryable purge removes memories, originals, linked reminders and chats. Cleanup failures are reported. Cloud account deletion requires successful purge first.
- Public app assets are precached for offline warm starts. Cloud writes and AI require a connection. There is no hidden offline queue or automatic demo/cloud synchronization.

## Checks

```sh
npm run typecheck
npm test
npm run check:edge
npm run build
npx playwright install chromium
npm run test:e2e
```

Tests cover source validation, persistent originals, storage failures/concurrency, backup round-trips, quotas, tenant boundaries, chat ownership, reminder leasing, and browser workflows. `screens/` contains standalone design references, not the shipped application.

See [the baseline audit](audit/PROJECT_AUDIT.md) and [current remediation notes](audit/REMEDIATION.md).
