# Memory AI project audit

> Historical baseline: these findings describe the original code. See REMEDIATION.md for repairs and current validation.

Reviewed 5 November 2026 (Asia/Calcutta). This is an audit, not a remediation change.

## Result

The frontend builds successfully, but the application is not ready to hold real private user data. The main problems are authorization around administrator-powered endpoints, mixed local/cloud persistence, destructive cleanup, and an indexing architecture that the frontend does not actually use.

The current `.env` has empty Gemini and Supabase credentials. Consequently, a fresh browser using this checkout runs the local/demo path. Browser-stored settings can override this. No live Supabase database, OAuth provider, or Gemini account was exercised.

## Scope and verification

- Inventoried 72 project files: 62 text/configuration files and 10 PNG design references. Runtime source, configuration, SQL, server functions, reference HTML scripts, and dependency lock information were examined. PNGs received format/dimension checks, not a visual design review.
- Excluded `.git` internals, generated `dist`, and vendored `node_modules` from first-party file coverage. Used installed SDK declarations and implementations to verify API contracts. New `audit/` artifacts are excluded from the original inventory.
- `npm run build`: PASS (TypeScript frontend check and Vite production build). The configured `vendor-genai` chunk is empty because the frontend uses REST instead of the SDK.
- `npm audit --json`: 3 vulnerable packages, 2 high and 1 moderate; no critical advisory reported. Initial sandbox request failed DNS; the subsequent network-enabled audit succeeded.
- `node audit/reproduce.mjs`: eight isolated reproduction checks passed, meaning eight existing defects were reproduced. These load the actual service source with mocked browser/cloud dependencies; they are not browser E2E or live exploit tests.
- All TypeScript/JavaScript source files were parsed without syntax errors. The normal build excludes `supabase/functions`, so it does not validate Edge Function SDK types.
- No existing test runner, lint command, CI workflow, Supabase CLI configuration, or Deno validation setup was found. Deno is unavailable in the execution environment.
- `.env` is ignored and not tracked in the current Git index. Credential values were not printed or copied into this report. No claim is made about historical Git commits or deployed secrets.

Severity: P1 = fix before using real private data or relying on the feature; P2 = significant correctness/reliability gap; P3 = maintenance/hardening. Findings described as conditional require deployed functions and the stated prerequisites.

## Security and privacy findings

### S1 — P1: Client-writable resource pointers are trusted by privileged server operations

Locations: `supabase/migrations/20260919000000_memory_ai_init.sql:135`, `:139`; `supabase/functions/ask-memory/index.ts:30`; `supabase/functions/_shared/gemini.ts:32`; `supabase/functions/delete-memory/index.ts:46`.

The `for all` policies permit an authenticated user to change all columns on their own `memory_stores` and `memories` rows, including `gemini_store_name`, `gemini_document_name`, and `storage_path`. Row ownership does not establish ownership of a resource named by one of these fields.

Conditional impact:

- A user who knows another store's resource name can put that name into their own store row. `ask-memory` then queries that store using the application's Gemini credentials.
- A user who knows another file's storage path can put it into their own memory row, then call `delete-memory`. The function verifies ownership of the row but uses a service-role client to remove the supplied path, bypassing object RLS. The same problem applies to an arbitrary Gemini document name accessible to the server key.

This is a code-level authorization defect; no victim identifiers were obtained and no live destructive test was performed. Resource names are not readily enumerable from the supplied code, which limits immediate exploitation but does not make them an authorization boundary.

Fix: make provider resource mappings server-managed; restrict client column writes; validate storage prefixes and bind external document identifiers to a server-owned mapping before performing privileged work. Apply the fix to both migrations and the duplicate SQL string.

### S2 — P1: Conversation ownership is missing in `ask-memory`

Location: `supabase/functions/ask-memory/index.ts:125`.

The endpoint accepts a caller-provided `conversationId` and inserts messages through `supabaseAdmin` without checking that the conversation belongs to the authenticated user. The improved `messages` RLS policy does not protect these service-role inserts. A known foreign conversation UUID allows unauthorized cross-conversation inserts. Under the current read policy, these attacker-owned messages are not automatically visible to the victim; this finding is unauthorized data insertion, not demonstrated disclosure of the victim's chat.

Fix: validate the conversation with both `id` and `user_id`, or use a request-scoped user client for conversation/message operations. Check insert errors and reject foreign/missing IDs.

### S3 — P1: Private browser data and AI keys are shared across accounts and remain after logout

Locations: `src/services/api.ts:7`, `:1177`; `src/services/gemini.ts:35`; `src/context/AuthContext.tsx:188`; `src/utils/indexedDb.ts:6`.

Local memories, reminders, conversations, blobs, and Gemini configuration use global origin-wide keys. There is no user namespace or encryption. Signing out only clears the authentication marker; it leaves chat content, attachments, reminders cached from cloud creation, and the Gemini key. A subsequent demo/local session on the same browser can see prior local data. Successful cloud reminder creation also writes private reminder contents into this shared cache. An XSS elsewhere on this origin would be able to read this material.

Fix: explicit demo/local/cloud modes, per-user storage namespaces, a clear logout retention policy, and protected server-side AI credentials for a hosted app. Do not describe JSON in localStorage as encrypted storage.

### S4 — P1 for hosted deployment: Gemini secrets are designed to be shipped to browsers

Locations: `.env.example:3`, `src/services/gemini.ts:35`, `:43`, `:88`; `README.md`.

`VITE_GEMINI_API_KEY` is browser-visible build configuration, and an entered key is kept in plaintext localStorage and sent in the request query string. A deployment using an operator-owned `VITE_` key exposes that key to visitors and risks quota/billing abuse. This checkout's key is empty, so no actual deployed-key compromise was verified. A deliberate personal BYOK utility has a different trust model, but must explain storage and retention clearly.

Fix: use authenticated server endpoints with a server secret, per-user usage limits, and request auditing. Avoid secrets in URLs. Supabase's public anon key is intended for browser use with correct RLS; it is not equivalent to a service-role secret.

### S5 — P1: Storage and AI usage limits can be bypassed

Locations: `src/services/api.ts:223`, `:396`; `supabase/functions/upload-memory/index.ts:33`; `supabase/functions/create-note/index.ts:20`; `supabase/functions/ask-memory/index.ts:20`; SQL storage bucket configuration.

The 5 GB quota exists only in frontend code. Clients can write to the permitted bucket/database directly, forge `file_size`, or call functions repeatedly. The schema defines neither bucket file-size/type restrictions nor atomic per-user quota enforcement. Server note/question bodies have no application length limit and no per-user AI rate limit. Platform limits may exist externally but are not configured here. The single server upload function's 15 MB check does not protect direct browser uploads.

Fix: enforce quota and allowed file constraints on the authoritative path, validate real sizes, restrict direct writes where necessary, and rate-limit expensive endpoints. Count updates as well as creates.

### S6 — P2: Evidence is labeled verified without verifying the excerpt

Locations: `src/services/gemini.ts:353`, `:371`, `:378`; `src/components/common/SourceCard.tsx:74`; `supabase/functions/ask-memory/index.ts:65`.

The frontend verifies that a source ID/title exists, but accepts any model-generated `snippet`. It also returns `foundInformation: true` when no source survives verification. The server treats absence of one not-found phrase as sufficient to classify an answer as found, even when grounding chunks are absent. User-controlled document contents are interpolated into prompts without an explicit untrusted-document boundary.

Reproduced: a fake model response citing an existing memory with `FABRICATED PROOF` is accepted and rendered as evidence. This is answer/evidence integrity risk; there is no demonstrated automatic external exfiltration tool in the AI flow.

Fix: schema-validate outputs, require a valid retrieved source for a positive answer, verify quoted excerpts against the retrieved text, and add malicious-document/contradiction evaluation cases. Avoid absolute zero-hallucination guarantees.

### S7 — P2: Missing parent ownership checks for notes/reminders

Locations: migration `:143`, `:171` and corresponding policies in `src/services/migrationSql.ts`.

The policies check only the child row's `user_id`. A caller can associate an owned note/reminder with a known foreign `memory_id`/`source_memory_id`. Foreign-key existence is not proof of matching ownership. Current RLS does not directly reveal the foreign memory contents, but the relation violates tenant integrity and exposes existence/deletion side effects.

Fix: enforce matching parent ownership using `exists` checks or composite foreign keys that include `user_id`.

### S8 — P2: Privacy and security assurances do not match runtime behavior

Locations: `src/pages/AuthPage.tsx:263`, `src/pages/SettingsPage.tsx:230`, `src/components/layout/AppLayout.tsx:54`, `src/pages/LandingPage.tsx:205`; `README.md`.

The UI claims AES encryption, enforced RLS, isolated cloud storage, no third-party sharing, and an active File Search connection regardless of local/demo configuration. Browser storage is plaintext, Gemini receives selected private memory contents, and the frontend never invokes File Search functions. These assertions can cause users to entrust sensitive information under false assumptions.

Fix: derive mode/health indicators from verified runtime state and disclose AI processing, storage mode, retention, and limitations accurately.

### S9 — P2 in development references: DOM XSS in standalone reminder mockup

Location: `screens/08_reminders.html` (`newCard.innerHTML`, interpolated `title` and `src`).

The reference HTML inserts raw form input into `innerHTML`; markup with an executable event handler can execute. This is a standalone design mockup, not `src/pages/RemindersPage.tsx`, whose React text rendering escapes content. `screens/` is not copied into the production Vite artifact, so this is not a demonstrated production route vulnerability. It is reachable when the mockup itself is served/opened.

Fix: use `textContent`/DOM elements for user-provided values, and keep mockups separate from deployed application paths.

### S10 — P3: Browser security headers are not configured in the repository

Location: `vercel.json:1`, `index.html:1`.

No app-defined CSP, frame-embedding restriction, Referrer-Policy, or nosniff header configuration was found. Hosting may add headers independently; live response headers were not inspected. External fonts/logo add third-party requests.

Fix: configure and test an appropriate CSP and response headers. This is defense in depth, not evidence of a currently exploitable injection in the React app.

## Functional and data-loss defects

### F1 — P1: “Remove Incomplete” can delete valid cloud images

Locations: `src/services/api.ts:622`; `src/pages/AskMemoryPage.tsx:88`; `src/pages/MemoryLibraryPage.tsx:47`.

An image with placeholder/short OCR text and a normal Supabase path such as `user-id/memory-id/receipt.png` is considered missing when it is absent from the current browser's IndexedDB. The cleanup never attempts a cloud download or object existence check. It invokes `deleteMemory`, which removes the cloud file and row. This happens naturally on another device or after clearing browser cache. **Reproduced with isolated cloud mocks.**

Fix: resolve remote attachment existence before classification, distinguish OCR failure from file absence, and avoid irreversible cleanup based on cache state.

### F2 — P1: Frontend bypasses the supplied indexing backend

Locations: `src/services/api.ts:214`, `:389`, `:653`; all five Edge Function entry points.

There are no frontend `functions.invoke` calls. Upload/create use direct database writes, while Q&A sends text to Gemini REST. PDF, DOC, DOCX, and XLSX contents are never parsed; they become `Uploaded file: filename` and are immediately marked `ready`. Local non-image originals are not saved anywhere, so a local PDF is neither searchable nor downloadable after upload. **Reproduced for PDF.** Cloud originals may upload, but their contents still are not indexed by the frontend.

Fix: choose and wire one authoritative ingestion/retrieval pipeline; preserve every supported original; report pending/failed indexing accurately; remove unsupported formats until they work.

### F3 — P1: Edge indexing uses incorrect installed Gemini SDK contracts

Locations: `supabase/functions/upload-memory/index.ts:147`, `:157`, `:164`; `create-note/index.ts:91`, `:101`, `:114`; `load-demo-data/index.ts:182`, `:188`, `:194`.

Checked against installed `@google/genai` declarations:

- `customMetadata` expects `CustomMetadata[]`, but the functions pass a plain object.
- `ai.operations.get` expects `{ operation }`, but the functions pass `{ name: operation.name }`.
- Successful upload returns `response.documentName`, but code reads `response.name` or `metadata.documentName`. The provider document ID can remain null, breaking subsequent deletion.

`any` casts and frontend-only TypeScript checks hide these errors. Edge dependency resolution is not locked, so the deployed version must also be pinned/verified.

Fix: use the actual typed SDK contracts and type-check all Edge Functions before deployment. The server default model `gemini-3.8-flash` also differs from the documented/frontend default; its availability was not verified and should not be assumed from a passing frontend build.

### F4 — P1: Cloud failures silently save locally and return success

Locations: `src/services/api.ts:137`, `:291`, `:389`, `:1027`.

Database/storage errors and missing cloud authentication often fall through to global local/demo storage. The user sees success although the data is not in the cloud. On the next successful remote query, local fallback writes disappear from the visible list. No queue reconciles them later. Storage failure can also create a cloud record with no durable attachment.

Fix: select storage mode explicitly; propagate cloud errors; if offline writes are supported, persist a per-user queue with visible sync state and retry/reconciliation.

### F5 — P1: Storage write failures report success

Locations: `src/services/api.ts:44`, `:393`; `src/utils/indexedDb.ts:37`.

The localStorage save helpers swallow quota/errors. `createNote` and other mutations still return the new object. IndexedDB resolves when the request succeeds rather than the transaction commits, has no transaction abort handling, and can suppress database-open errors. The promised 5 GB does not account for localStorage's much smaller capacity, browser eviction, or attachment duplication. **Reproduced successful note creation with no persisted note after quota failure.**

Fix: wait for transaction completion, propagate failures, use suitable durable storage, request/check storage persistence as appropriate, and show actionable errors.

### F6 — P2: Cloud favorites do not work without matching local data

Location: `src/services/api.ts:992`.

`toggleFavorite` finds the memory in localStorage before trying the cloud update; a normal cloud UUID is not present there. It returns null without a request. **Reproduced.** Fix by reading/toggling the authoritative record with checked errors.

### F7 — P2: Existing cloud reminders cannot be completed on another device

Location: `src/services/api.ts:1085`.

`toggleReminder` has the same local-first lookup defect. Reminders created on this browser may work because creation mirrors them locally, while server-created or other-device reminders fail. **Reproduced.**

### F8 — P1: Deletion/purge leaves private data behind and can hide failed deletions

Locations: `src/services/api.ts:959`, `:1148`; `supabase/functions/delete-memory/index.ts:46`; `src/pages/SettingsPage.tsx:111`.

- Frontend single-delete never calls Gemini document deletion. A previously indexed document can remain retrievable on the server path.
- Bulk purge never deletes the Gemini store/documents, conversations/messages, AI key, or IndexedDB attachments. **Reproduced retained conversations.**
- Single image delete removes only its ID key; duplicate filename and remote-path cache entries remain.
- Bulk cloud file deletion lists only one folder level and the default page. Nested `{user}/{memory}/{file}` uploads and files beyond that page remain.
- Supabase usually returns `{ error }` instead of throwing; delete operations frequently ignore that result. The UI removes rows or closes confirmation even when the backend deletion failed.

Fix: implement an idempotent server cleanup workflow covering provider documents, every attachment, database records, and the declared local-data scope; retain retry state until confirmed complete. Define explicitly whether purging memories also purges chat and credentials, and label the action accordingly.

### F9 — P2: Password reset does not let users set a new password

Locations: `src/context/AuthContext.tsx:208`; `src/App.tsx:64`; `src/pages/AuthPage.tsx:17`.

Reset email redirects to `/login?reset=true`, but the query is never handled and there is no `auth.updateUser({password})` form or recovery route. The recovered authenticated session is redirected to the dashboard by public-route guards. Fix with an explicit recovery flow that remains accessible during recovery and requires password submission.

### F10 — P2: Chat history synchronization is incomplete and not account-isolated

Locations: `src/services/api.ts:1177`, `:1187`; `src/pages/AskMemoryPage.tsx:299`.

History reads only localStorage, never the cloud. `saveConversation` writes only the last message of the completed exchange, normally the assistant message, omitting the user question. Non-UUID conversations create a new server conversation on every save and never map that ID back; UUID conversations avoid that particular duplication but still omit questions. `askMemory` ignores its conversation argument and sends no prior-turn context, so follow-up references such as “what about the second one?” are not grounded in the ongoing chat.

Fix: load history by authenticated user, persist both messages with stable IDs, support idempotent sync, and pass bounded conversation context to the AI.

### F11 — P2: Async image extraction can attach the wrong text to another image

Location: `src/pages/AddMemoryPage.tsx:109`, `:157`, `:269`.

Selecting image A starts OCR; selecting B before A finishes does not cancel A or reject its stale result. A's completion can overwrite B's extraction/category/tags. The upload handler's polling loop also captures stale React state, so it cannot observe `visionExtracting` or `visionExtractedText` updates during that invocation and can repeat OCR unnecessarily. Fast uploads can have status changed back to `processing` by the outstanding 600 ms timer.

Fix: keep a request/file identity, cancel or ignore stale requests, await the actual extraction promise, and clear timers in finally/unmount paths.

### F12 — P2: Batch uploads bypass single-file validation

Locations: `src/pages/AddMemoryPage.tsx:89`, `:130`, `:310`.

Only the single-file handler checks extension and 20 MB size; multi-file queue creation checks neither. The frontend advertises formats that the server rejects, and server upload uses a different 15 MB limit. The batch flow navigates away even with failed uploads. Fix with shared validation for each file and a consistent authoritative limit, retaining failed items for retry.

### F13 — P2: Image fallback references and filename caches are inconsistent

Locations: `src/services/api.ts:323`, `:340`; `src/pages/MemoryDetailPage.tsx:81`; `src/services/api.ts:551`.

When cloud storage fails, the row gets an `indexeddb:{user}_{timestamp}` path, but the image is saved under inserted ID and filename, not that path key. Detail calls `getFileUrl(data.storage_path)` without the ID fallback, so its preview can fail even on the creating device. The unscoped filename fallback can return another upload's image when names collide, including across accounts.

Fix: store/retrieve by stable per-user memory ID, pass that ID consistently, and do not use unscoped filenames as attachment identity.

### F14 — P2: Synthetic answers and reminders fabricate evidence

Locations: `src/services/api.ts:873`; `src/pages/RemindersPage.tsx:123`; `src/services/demoData.ts`.

The conflict demo cites `project_update_old.txt`, which is absent from the initial dataset. Hardcoded answers can still assert facts after their source was removed. **Reproduced the nonexistent conflict source.** Without an API key, scanning any custom note containing “exam”, “project”, or “interview” generates fixed September 2026 DBMS/Nova Labs reminders, even when the note concerns another event. The displayed summary fallback also calls content verified without analyzing it.

Fix: confine synthetic behavior to an explicitly isolated demo fixture; derive production results from actual stored content; otherwise return an honest unavailable/not-found result.

### F15 — P2: Upcoming reminders are neither reliably future nor complete notifications

Locations: `src/pages/DashboardPage.tsx:60`; `src/services/gemini.ts:530`; `src/pages/RemindersPage.tsx`.

Dashboard filters by pending status, not future due time; local reminders are not necessarily sorted by due date. AI scanning supplies neither current date nor timezone, performs no date/schema validation, and permits duplicate imports. The supplied September demo dates are already past on the review date. There is no notification scheduler, push subscription, email delivery, or background reminder trigger: reminders are an in-app list only.

Fix: distinguish overdue/upcoming/undated, normalize timezone-aware dates, validate/deduplicate imports, and implement delivery if actual notifications are part of the intended feature.

### F16 — P2: Retrieval and statistics do not scale or return complete vault results

Locations: `src/services/api.ts:95`, `:137`; `src/services/gemini.ts:238`, `:530`.

Reads fetch all columns/content without pagination. Supabase response row caps can truncate results, causing incomplete libraries, statistics, scans, and quota estimates. Client Q&A selects only 30 memories by keyword overlap and sends unbounded text from those memories; paraphrases can miss a relevant source while large notes overflow model limits. Reminder scanning similarly grows without a token budget.

Fix: server pagination, aggregate statistics, indexed search/retrieval, bounded context/chunking, and explicit partial-result handling.

### F17 — P2: Server ingestion is not a recoverable job

Locations: `supabase/functions/upload-memory/index.ts:155`; `create-note/index.ts:99`; `_shared/gemini.ts:32`; `load-demo-data/index.ts:186`.

Functions poll indefinitely inside the HTTP request. Timeouts or disconnections can leave rows processing, with no retry endpoint/job queue. Two concurrent first uploads can create competing Gemini stores before upserting the same user mapping. Several DB/storage failures are ignored. Server note creation stores text only in `notes`, while frontend details/Q&A read `memories.content` without a join. Edits never reindex the server copy. Demo seed uploads plain text labeled as PDF/PNG and marks failed indexes ready.

Fix: bounded durable ingestion jobs, atomic store provisioning, explicit failure/retry state, a canonical text source, reindex-on-edit, and valid demo files.

### F18 — P2: Demo/account/configuration lifecycle is inconsistent

Locations: `src/context/AuthContext.tsx:85`, `:98`, `:131`, `:176`; `src/lib/supabase.ts:100`; `src/pages/SettingsPage.tsx`.

Without backend configuration, normal sign-in/sign-up accepts any supplied credentials as a demo identity instead of creating a real account. The demo identity is not a cloud-auth bypass, but the UI labels it a verified private vault. `enableDemoUser` does not clear an existing cloud session, and service calls decide backend mode from configuration/session rather than `isDemoUser`. Configuration changes resync once but do not rebind the auth subscription to the new client. Settings no longer contains the Supabase configuration UI referenced by error messages and retains an unused SQL-export module.

Fix: explicit account/demo mode and consistent service routing; bind subscriptions to the active client; offer an actual supported backend setup path or update the documentation/errors.

### F19 — P3: Accessibility and recovery UX are incomplete

Locations: modal implementations in `SettingsPage`, `RemindersPage`, `AskMemoryPage`; upload zone in `AddMemoryPage`; conversation rows in `AskMemoryPage`.

Custom modal containers do not implement dialog semantics, focus trapping/restoration, or consistent Escape handling. Some click-only divs cannot be used by keyboard; several icon-only controls lack accessible names. Many data-operation errors only go to console. Memory detail can apply an older asynchronous request after navigating to another ID and does not reset all preview state immediately.

Fix: accessible dialog/button primitives, keyboard interaction, labeled inputs, visible errors/retry actions, request cancellation, and a browser accessibility/responsive pass. PNG visual parity was not assessed in this audit.

## Dependency audit

| Package installed | npm severity | Advisory | Exposure assessment |
|---|---|---|---|
| `vite@6.4.3` | High | GHSA-587h-7wmj-h5pm plus four other Vite/launch-editor findings | Development tooling; this checkout uses Windows and `server.host: true`, increasing the importance of dev-server access control. Not evidence of command execution in the static production artifact. |
| `source-map-js@1.2.1` | High | GHSA-68fv-2mgg-jv7q | Build-tool source-map parsing denial of service; input/exposure prerequisites matter. |
| `postcss-selector-parser@6.1.4` | Moderate | GHSA-rj75-hqrm-r3gf | CSS selector parsing CPU exhaustion in build tooling. |

The audit reported fixes available. Resolve patched versions and rebuild before merging dependency changes; this audit did not modify dependencies. Consider binding development to localhost by default. Audit Edge Function remote imports separately; npm audit does not cover the Deno dependency graph.

## Missing capabilities and release work

These are absent from the supplied implementation; whether each is required depends on the intended product scope:

1. A single working end-to-end secure ingestion, indexing, update, retrieval, and deletion pipeline.
2. Durable offline synchronization with per-user conflict handling and explicit data ownership.
3. Fully implemented PDF/Word/spreadsheet extraction, OCR failure recovery, and supported-format parity.
4. Password recovery completion, clear demo separation, account/session management, and an account deletion workflow.
5. User export/backup/import and a tested restore path before entrusting irreplaceable files.
6. Actual reminder delivery, timezone-aware scheduling, editing, and duplicate detection.
7. Runtime request/AI response schemas, authorization tests, upload constraints, usage limits, and deletion verification.
8. Error monitoring, structured operational logs without private-content leaks, job health, and budget monitoring.
9. Frontend/Edge/RLS integration tests, CI gates, linting, reproducible server dependencies, deployment configuration, and documented migrations/secrets/OAuth setup.
10. Truthful privacy/retention/AI-provider disclosures and runtime health indicators.
11. Complete paginated search/history and server aggregation suitable for a vault larger than a demo dataset.
12. Accessible dialogs and keyboard navigation; PWA offline assets are runtime-cached rather than fully precached, so offline support requires a dedicated cold/warm-cache test.

## Recommended repair order

1. Restrict provider mappings and privileged resource operations (S1/S2), isolate user data (S3), and remove operator AI secrets from the client (S4).
2. Disable destructive cache-based ghost deletion (F1); make writes/deletes report authoritative success/failure (F4/F5/F8).
3. Choose one backend flow, fix/type-check SDK calls, and wire real document ingestion/search (F2/F3/F17).
4. Repair cloud favorites/reminders, recovery, conversation sync, and OCR races (F6/F7/F9/F10/F11).
5. Add enforcement, tests, deployment/operational controls, and update privacy/product statements before accepting real users.

## Documentation used to check security assumptions

- Vite: https://vite.dev/guide/env-and-mode — `VITE_` variables are exposed to client code.
- Supabase: https://supabase.com/docs/guides/database/postgres/row-level-security — service-role access bypasses RLS.
- Supabase: https://supabase.com/docs/guides/storage/security/access-control — privileged storage access bypasses object policies.
- Installed `node_modules/@google/genai/dist/genai.d.ts`: `OperationGetParameters`, `UploadToFileSearchStoreConfig`, `UploadToFileSearchStoreResponse`.
- npm advisory links are recorded in the dependency table above and can be opened at `https://github.com/advisories/<advisory-id>`.

See `FILE_REVIEW.md` for per-file coverage, `file-inventory.json` for fingerprints and source/script inventory, and `reproduction-results.json` for the eight isolated checks.
