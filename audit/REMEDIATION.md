## 8 November account access update

Demo login has been removed and restored sessions are verified with Supabase. Account-owned keys persist after a successful connection test. A new RLS table prevents cross-account reads/writes and duplicate key registration. The migration was applied to production. Keys are accessible to privileged database administrators; they are not end-to-end encrypted. Validation: 45 unit/database tests, production build and an unauthenticated browser test covering all main protected routes passed. Prior demo browser workflows are archived in `audit/legacy-demo-browser-tests.ts` because demo access is no longer supported. The historical validation below predates this change.

# Remediation and verification — 6 November 2026

The baseline audit is historical. The application source has been repaired; this file records the current state and limits of verification.

## Completed repairs

- Isolated local demo storage from authenticated cloud accounts. Removed silent cloud-to-local fallbacks and persistent browser AI keys.
- Disabled cache-based deletion and removed the destructive ghost-cleanup UI. Short valid OCR results are no longer classified as missing files.
- Added real PDF, DOCX and XLSX text extraction, retained originals, consistent file limits/MIME/signature checks, bounded office archive expansion, and visible extraction failures/retry controls.
- Replaced the broken provider File Search SDK flow with authoritative text storage and database chunk retrieval. Both cloud and demo AI use personal keys supplied by users in Settings. Requests go directly from the browser to Google with bounded inputs; source snippets must match saved evidence.
- Restricted resource mappings and cloud writes, checked ownership for privileged operations, installed atomic quota/rate limits, parent ownership policies, secure chat persistence, and atomic favorite/reminder toggles.
- Repaired password recovery, explicit demo sign-in, chat history/multi-turn context, local write-failure propagation, and rapid local mutation races.
- Made local deletion and purge atomic across metadata/attachments. Cloud purge handles nested originals, legacy AI documents, reminders and chats with checked/retryable cleanup.
- Added backup export and validated additive restore, including sample records with text but no original attachment. Added cloud account deletion after purge.
- Added optional opt-in email reminder dispatch with verified recipient emails, leases, bounded attempts and provider idempotency.
- Corrected privacy/storage/AI claims, switched dialogs to native accessible dialogs, restored meaningful button names and labels, and removed external runtime fonts/icons.
- Added exact build-asset precaching, fixed `Vary: Origin` cache mismatches for offline warm starts, security headers, lazy page loading, CI checks and deployment instructions.

## Current verification

| Check | Result |
|---|---|
| Frontend TypeScript | Passed |
| Production build and service-worker asset generation | Passed |
| Regression tests (including actual SQL migrations in embedded PostgreSQL) | 44 passed |
| All eight Edge Function entry points, with frozen dependency lock | Passed |
| Chrome browser workflows | 9 passed |
| Fresh external dependency advisory scan | Blocked by automatic approval review |

The browser checks cover session-only personal-key settings and direct Google OCR/Q&A requests with a mocked provider, note/favorite/chat persistence and deletion, PDF/DOCX text extraction and originals, password recovery route and honest unconfigured sign-in, mobile dialog focus/Escape, offline warm start, XLSX cells, backup export/purge/restore, and retention of the original after failed OCR. The installed Chrome was used because the downloaded Playwright browser failed to launch in this environment. `PLAYWRIGHT_CHANNEL=chrome` selects that option; CI can use the normal downloaded Chromium.

The full file inventory also caught two JPEG reference images carrying `.png` extensions. Those files now have `.jpg` extensions; image pixels were not changed. `audit/check-files.mjs` checks current first-party files, including embedded reference-HTML script syntax, JSON and image signatures, without exposing `.env` values.

The earlier successful npm audit reported zero vulnerabilities after dependency updates. Dependencies have not changed during this follow-up check. A fresh scan was rejected because sending dependency names/versions from the lockfile to npm requires approval; zero current advisories is therefore not asserted from this run.

## Deployment and operational checks still required

A public check on 6 November 2026 confirmed the Vercel site responds with HTTP 200, but all seven app-facing Supabase functions return HTTP 404 with `NOT_FOUND`. The backend is not deployed at the configured project. This agent session has no available authenticated Supabase CLI or connector, so remote migrations, secrets, Auth/Storage, AI responses and email delivery remain unverified. The frontend reports whether the current user supplied a personal key, offers a direct Google connection test, and provides actionable backend errors. Supabase no longer provides AI generation; retired AI endpoints return 410. Apply all migrations (including `20261106000000_atomic_toggles.sql`), deploy the functions, set server secrets/origins, register auth redirects and configure the optional reminder scheduler. See `docs/DEPLOYMENT.md`.

The local demo is intentionally unencrypted browser storage. Cloud writes require network access; there is no automatic offline sync queue. Backups are plaintext and limited to 50 MB; large-vault archive jobs remain outside the implemented scope. AI synthesis/OCR can be incorrect even when a quoted excerpt matches the source. These are documented product limitations, not verified guarantees of safety.
