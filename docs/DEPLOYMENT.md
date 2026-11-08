## Account key storage update — 8 November 2026

Apply `20261108000000_account_api_keys.sql` with `npx.cmd supabase db push --remote` before deploying this frontend. Demo login is removed, including legacy session flags. Successful Settings connection tests save the personal key to an account-owned Supabase table; RLS isolates reads/writes and a unique constraint rejects duplicate keys across accounts. Account ownership uses the Supabase auth UUID, not an editable email address. Keys remain retrievable by privileged database administrators; this is not end-to-end encryption. AI requests still go directly to Google. Sign-out clears the in-memory key, and signing in restores the saved key. Deleting an auth account cascades its key. The older session-only notes below describe the previous release.

# Deployment

Code changes do not update a hosted database or deploy functions automatically. Deploy the migrations, functions, and frontend together. Do not use the new frontend against the old write policies.

## Existing Memory Ai project: complete the backend deployment

The existing frontend uses origin `https://memory-ai-two-eta.vercel.app` and the linked Supabase project reference is `iqdwixeogewcbxsdpioy`. A public check on 6 November 2026 found the frontend reachable, but all seven app-facing Edge Functions returned HTTP 404 (function not found). A database push does not deploy these functions.

In Supabase **Edge Functions → Secrets**, set `ALLOWED_ORIGINS=https://memory-ai-two-eta.vercel.app`. Each user enters their own Gemini key in app Settings; new AI requests go directly from their browser to Google. No operator Gemini key or model secret is required. Do not include `/dashboard`, a trailing slash, or `#` in the origin.

Run in PowerShell from this repository:

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref iqdwixeogewcbxsdpioy
npx.cmd supabase migration list --remote
npx.cmd supabase db push --dry-run --remote
npx.cmd supabase db push --remote
npx.cmd supabase functions deploy --remote=iqdwixeogewcbxsdpioy
npx.cmd supabase functions list --remote=iqdwixeogewcbxsdpioy
```

Review the migration dry run and confirm the CLI's hosted-operation prompts. If it reports incompatible or unknown migration history, stop and reconcile it; do not reset a live database. Supabase CLI v3 targets the local stack by default for database commands; `--remote` selects the linked hosted project. See the [official CLI v3 migration guide](https://supabase.com/docs/guides/local-development/cli/migrating-to-v3). Docker is not needed for hosted database operations. On Windows, `npx.cmd` avoids PowerShell's blocked `npx.ps1` shim without changing execution policy.

Keep the existing Vercel project's production URL. Verify that its public Supabase URL/key refer to this same project. Set the hosted Auth Site URL and redirects as described below, then sign in and test Settings → AI connection, a note, an upload, and a memory question. A personal key indicator means a key has been entered; use Test Connection to check it with Google. Keys are entered again after reload.

## New Supabase project, same existing Vercel URL

1. Create a new project in the Supabase Dashboard and retain its database password privately. Copy the project reference, project URL, and public anon/publishable key from the project's connection/API settings. Existing users and files do not transfer automatically.
2. From this repository in a terminal with Node 24/npm installed, log in, link the **new** project, and apply the migrations:

   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_NEW_PROJECT_REF
   npx supabase migration list --remote
   npx supabase db push --dry-run --remote
   npx supabase db push --remote
   ```

   Enter the new database password in the local prompt if requested. On a genuinely empty project all five checked-in migrations should be pending. Do not run these against the old project by mistake, and do not paste passwords into chat or commit them.
3. In **Supabase → Edge Functions → Secrets**, set `ALLOWED_ORIGINS=https://YOUR_EXISTING_VERCEL_DOMAIN`. Users configure their own personal Gemini keys inside the app; do not install an operator key for AI requests. Include the exact custom domain too if users access both. Supabase supplies the `SUPABASE_*` runtime secrets; do not attempt to overwrite those built-ins. Then deploy:

   ```sh
   npx supabase functions deploy --remote=YOUR_NEW_PROJECT_REF
   ```

   This deploys all eight function entry points using their checked-in dependency/authentication settings. The retired `ai` and `ask-memory` endpoints return HTTP 410, so older clients cannot use a shared operator key. The scheduled email function remains inactive until its optional secrets/scheduler are configured.
4. In **Supabase → Authentication → URL Configuration**, set Site URL to `https://YOUR_EXISTING_VERCEL_DOMAIN` and add these exact redirects:

   ```text
   https://YOUR_EXISTING_VERCEL_DOMAIN/dashboard
   https://YOUR_EXISTING_VERCEL_DOMAIN/reset-password
   ```

   Configure the Google provider separately if needed. These dashboard settings configure the hosted project; the localhost URLs in `supabase/config.toml` are for local development. Do not push localhost Auth configuration to production.
5. In your **existing Vercel project → Settings → Environment Variables**, replace the production values of `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the new project's URL and public key. Update Preview too only if previews should use the same backend. Remove any old `VITE_GEMINI_API_KEY` variable. Never place the Gemini secret, database password, or service-role key in browser variables.
6. **Redeploy the latest Git commit in the same Vercel project.** Use framework Vite, root repository directory, Node 24, install `npm ci`, build `npm run build`, and output `dist`. Do not reuse the old build cache for the first backend switch. Vite embeds these public settings at build time; changing environment variables alone does not update an already-built frontend. The existing Vercel project/domain stays the same.
7. Verify sign-up/confirmation, sign-in, note creation, file upload, Q&A, and password recovery on that production URL. Old Supabase accounts will need to be migrated or recreated. Keep the old Supabase project available until this verification succeeds.

The repository must be connected to that Vercel project under **Settings → Git**, with production branch `main`, for a push to trigger an automatic production deployment. A GitHub push alone does not create or configure a Supabase project and does not change Vercel environment variables.

## Frontend

Use Node 24 and `npm ci`. Set the public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using `.env.example`. `npm run build` produces `dist/` and a service worker containing the exact public build asset list. Serve `dist/` with SPA navigation fallback. Vercel headers are in `vercel.json`; use equivalent headers elsewhere.

The CSP permits standard `*.supabase.co` endpoints. For custom Supabase domains add the exact HTTPS/WSS origin to `connect-src`. Never put a Gemini key or service-role key in a `VITE_` variable.

## Database and functions

Using Supabase CLI, link the intended project, review its migration history, then apply `supabase db push --remote`. Apply all migrations in filename order, including:

- `20261105000000_authoritative_vault.sql`
- `20261105010000_reminder_delivery.sql`
- `20261106000000_atomic_toggles.sql`

These remove direct browser writes to provider mappings/memories, install searchable chunks and quotas, and add ownership-checked chat/toggle operations. Existing originals are retained. Historical records with inconsistent provider identifiers require operator review before privileged deletion.

Set Edge secret `ALLOWED_ORIGINS` (actual frontend origins, comma-separated without trailing slashes). Hosted Supabase provides its URL, anon key and service-role key. Deploy `ai`, `ask-memory`, `create-note`, `delete-memory`, `manage-memory`, `upload-memory`, and `load-demo-data` using `supabase/config.toml`.

Register deployed `/dashboard` and `/reset-password` URLs in the Auth redirect allowlist, set the site URL, and configure Google OAuth if required. Test registration, confirmation, recovery and two-user isolation in staging before accepting private data.

AI uses a personal Gemini key entered by each user in Settings. For both demo and signed-in cloud accounts, selected memory excerpts, question/history, or a visual document go directly from the browser to Google with that user’s key; quota and any billing follow the Google project owning the key. Supabase receives saved memory text, original attachments, and conversations, but not the personal API key. The key is held only in tab memory, is isolated by sign-in identity, and clears on reload/sign-out. Text excerpt search and manual notes/reminders work without a key.

New ingestion creates no Gemini File Search stores. A legacy cleanup helper remains only for resources created by older server-key releases: it requires the original operator key and verifies remote ownership metadata before deletion. It does not generate AI content or accept personal keys. Unverifiable legacy resources produce an explicit error and need separate operator review; do not substitute a new user’s key. After resolving any such legacy resources, remove unused `GEMINI_API_KEY`/`GEMINI_MODEL` server secrets.

## Optional email delivery

Deploy `dispatch-reminders`. It authenticates a separate high-entropy `x-reminder-secret` header; only this scheduled function has gateway JWT verification disabled. Set `RESEND_API_KEY`, `REMINDER_FROM_EMAIL` (verified sender), and `REMINDER_CRON_SECRET` (at least 32 random characters).

Configure an external scheduler or Supabase Cron to POST to `/functions/v1/dispatch-reminders` every minute with that secret header. Store it in a scheduler secret store or Supabase Vault, never in public URLs, source, or browser configuration. See [Supabase scheduling documentation](https://supabase.com/docs/guides/functions/schedule-functions).

Delivery requires explicit user opt-in and a verified account email. Reminder contents are sent to Resend. Work is leased, attempts are bounded, and provider idempotency keys protect retries. [Resend retains those keys for 24 hours](https://resend.com/changelog/idempotency-keys). Monitor function responses/logs: an enabled preference does not prove the scheduler is running.

## Checks

Run `npm run typecheck`, `npm test`, `npm run check:edge`, `npm run build`, then `npm run test:e2e`. Install Chromium with `npx playwright install chromium`. Browser tests use the production preview; rebuild before rerunning after source changes.

Database tests apply actual SQL to embedded PostgreSQL with minimal Supabase-compatible auth/storage schemas. They verify SQL and row policies locally, but do not replace hosted Auth/Storage/Edge/provider/email tests or inspecting production response headers.
