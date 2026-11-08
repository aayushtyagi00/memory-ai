# Memory AI

A personal library for originals, searchable document text, notes, source-based Q&A, and reminders.

## Local setup

Use Node 24, then run `npm ci` and `npm run dev`.

Login is required. Legacy demo session flags cannot grant access. Restored sessions are verified with Supabase before protected pages open.

For cloud sign-in, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using `.env.example`, then follow [deployment instructions](docs/DEPLOYMENT.md). The migrations and Edge Functions must also be deployed.

## Features and limits

- PDF, DOCX, XLSX, TXT, Markdown, CSV, JSON, PNG, JPG and WEBP uploads, up to 15 MB. Originals are retained. Convert unsupported legacy `.doc` files first.
- Text PDFs, Word documents and spreadsheets are parsed locally. Scanned PDFs/images require AI transcription. Failed extraction is visible, with the saved original available for review or retry.
- Cloud Q&A searches user-owned text chunks and sends bounded excerpts to Google Gemini. Source quotes must match stored text. AI synthesis and OCR can still be wrong; review original evidence.
- Both demo and cloud accounts use each user’s own Gemini key, tested in Settings and saved to their authenticated Supabase account. Row-level policies restrict access to the owner; signing out clears the browser copy and signing in restores the saved key. Privileged database administrators can access stored keys. AI requests go directly to Google under that key’s project/quota; no shared server key is used for AI. Without a key, grounded text excerpt search remains available.
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
