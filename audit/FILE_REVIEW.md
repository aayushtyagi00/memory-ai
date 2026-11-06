# File review inventory

Original project inventory; excludes Git internals, vendored dependencies, generated builds, and audit artifacts. Findings refer to PROJECT_AUDIT.md. A row without an independent finding is not a guarantee that the file has no defects. Text/scripts were reviewed statically; the 10 PNGs received metadata checks only.

| File | Review result |
|---|---|
| `.env` | Credential presence checked only; credentials are empty. Local/demo runtime is the default for this checkout. |
| `.env.example` | S4, F2, F18: recommends browser AI secret; local-encryption/setup descriptions need correction. |
| `.gitignore` | Ignores .env and build/dependency output; current .env is not tracked. No independent defect identified. |
| `index.html` | S10: external fonts; CSP/header hardening missing from app configuration. |
| `package-lock.json` | Dependency audit: installed Vite, source-map-js, postcss-selector-parser advisories. Full lock parsed by npm. |
| `package.json` | F3, release gaps: no test/lint/Edge-check scripts; browser SDK and pg dependencies appear unused in app source. |
| `postcss.config.js` | Standard Tailwind/autoprefixer setup; transitive parser dependency advisories covered separately. |
| `public/logo.svg` | Static vector inspected; no executable content found. |
| `public/manifest.webmanifest` | Manifest reviewed; SVG-only install icon support requires target-browser verification. |
| `public/sw.js` | PWA: hashed JS/CSS are not install-precached; cache miss plus failed fetch can return null; no sync/push implementation. |
| `README.md` | S4, S8, F2, F18: architecture, encryption, model list, and setup documentation diverge from implementation. |
| `screens/01_landing_page.html` | Standalone design reference: theme, scripts and interactions inventoried; CDN Tailwind dependency; not integrated runtime functionality or production build output. |
| `screens/01_landing_page.png` | Reference screenshot: PNG metadata inspected only, not visual parity; not executable application code. |
| `screens/02_sign_in_and_registration.html` | Standalone design reference: theme, scripts and interactions inventoried; CDN Tailwind dependency; not integrated runtime functionality or production build output. |
| `screens/02_sign_in_and_registration.png` | Reference screenshot: PNG metadata inspected only, not visual parity; not executable application code. |
| `screens/03_dashboard.html` | Standalone design reference: theme, scripts and interactions inventoried; CDN Tailwind dependency; not integrated runtime functionality or production build output. |
| `screens/03_dashboard.png` | Reference screenshot: PNG metadata inspected only, not visual parity; not executable application code. |
| `screens/04_add_memory.html` | Standalone design reference: theme, scripts and interactions inventoried; CDN Tailwind dependency; not integrated runtime functionality or production build output. |
| `screens/04_add_memory.png` | Reference screenshot: PNG metadata inspected only, not visual parity; not executable application code. |
| `screens/05_ask_memory.html` | Standalone design reference: theme, scripts and interactions inventoried; CDN Tailwind dependency; not integrated runtime functionality or production build output. |
| `screens/05_ask_memory.png` | Reference screenshot: PNG metadata inspected only, not visual parity; not executable application code. |
| `screens/06_memory_library.html` | Standalone design reference: theme, scripts and interactions inventoried; CDN Tailwind dependency; not integrated runtime functionality or production build output. |
| `screens/06_memory_library.png` | Reference screenshot: PNG metadata inspected only, not visual parity; not executable application code. |
| `screens/07_timeline.html` | Standalone design reference: theme, scripts and interactions inventoried; CDN Tailwind dependency; not integrated runtime functionality or production build output. |
| `screens/07_timeline.png` | Reference screenshot: PNG metadata inspected only, not visual parity; not executable application code. |
| `screens/08_reminders.html` | S9: standalone mockup contains raw-input innerHTML injection. Not included in production build. |
| `screens/08_reminders.png` | Reference screenshot: PNG metadata inspected only, not visual parity; not executable application code. |
| `screens/09_settings.html` | Standalone design reference: theme, scripts and interactions inventoried; CDN Tailwind dependency; not integrated runtime functionality or production build output. |
| `screens/09_settings.png` | Reference screenshot: PNG metadata inspected only, not visual parity; not executable application code. |
| `screens/10_states_and_overlays.html` | Standalone design reference: theme, scripts and interactions inventoried; CDN Tailwind dependency; not integrated runtime functionality or production build output. |
| `screens/10_states_and_overlays.png` | Reference screenshot: PNG metadata inspected only, not visual parity; not executable application code. |
| `src/App.tsx` | F9: authenticated public-route redirects interfere with recovery; no recovery route. |
| `src/components/common/ErrorBoundary.tsx` | Catches render failures; does not handle async operation errors. Security reassurance is not established by a render boundary. |
| `src/components/common/Header.tsx` | Navigation reviewed; no independent defect identified. |
| `src/components/common/SourceCard.tsx` | S6: labels model-supplied snippets verified without proof validation. |
| `src/components/layout/AppLayout.tsx` | S8/F4: unverified Connected label and promised reconnect sync without a sync implementation. |
| `src/context/AuthContext.tsx` | S3/F9/F18: retained browser data, incomplete recovery, demo/account lifecycle and stale auth subscription. |
| `src/index.css` | Static styles reviewed; no independent security/correctness defect identified. |
| `src/lib/supabase.ts` | F18: dynamic client lifecycle/setup; connection tester can report success despite DB/auth endpoint failure notices. |
| `src/main.tsx` | Registers production SW; StrictMode enabled; no independent entry-point defect identified. |
| `src/pages/AddMemoryPage.tsx` | F2/F11/F12/F19: unsupported formats, OCR races/stale closure, unchecked batch uploads, keyboard/label gaps. |
| `src/pages/AskMemoryPage.tsx` | F1/F10/F19: cache-only ghost classification; no multi-turn backend context; stale in-flight replies can overwrite a newly selected conversation. |
| `src/pages/AuthPage.tsx` | S8/F9/F18/F19: misleading encryption/private-vault claims; missing reset completion; modal accessibility. |
| `src/pages/DashboardPage.tsx` | S8/F15/F16: all totals called indexed, past pending items shown as upcoming, full-vault reads. |
| `src/pages/LandingPage.tsx` | S8/F2: claims native embeddings, zero hallucinations and File Search pipeline that frontend bypasses. |
| `src/pages/MemoryDetailPage.tsx` | F6/F8/F13/F14/F19: cloud favorite no-op; misleading provider deletion/summary; wrong attachment fallback; async detail races. |
| `src/pages/MemoryLibraryPage.tsx` | F1/F6/F8/F16: destructive ghost UI; cloud favorite no-op; hides failed deletions; client filtering of capped reads. |
| `src/pages/RemindersPage.tsx` | F7/F14/F15/F19: cached toggles, fabricated custom-data reminders, duplicate/invalid date imports, no notification delivery. |
| `src/pages/SettingsPage.tsx` | S8/F8/F18/F19: false privacy assurances, incomplete purge, missing documented backend configuration, dialog/accessibility. |
| `src/pages/TimelinePage.tsx` | F16: depends on unpaginated listMemories; grouping itself reviewed with no separate defect identified. |
| `src/services/api.ts` | S3/S5; F1/F2/F4/F5/F6/F7/F8/F10/F13/F14/F16/F18. Main concentration of defects. |
| `src/services/demoData.ts` | F14/F15: fixture dates stale; fabricated conflict source absent; fixtures not isolated from local user data. |
| `src/services/gemini.ts` | S4/S6; F10/F15/F16: browser key, unverified evidence, missing history/date/token limits; VITE_GEMINI_MODEL is ignored. |
| `src/services/migrationSql.ts` | S1/S7: duplicate schema/policies retain weaknesses. No source imports this SQL export; drift/maintenance risk. |
| `src/types/index.ts` | Application interfaces reviewed; no runtime schema validation (S6/F17). Profile.email type excludes nullable DB values. |
| `src/utils/indexedDb.ts` | S3/F5/F8: global unencrypted blob store, suppressed failures, request-vs-transaction completion, incomplete cleanup. |
| `src/vite-env.d.ts` | Only Supabase env fields typed explicitly; Gemini access uses any. No independent runtime defect. |
| `supabase/functions/_shared/auth.ts` | JWT validated with getUser; server service-role client then bypasses RLS, requiring explicit downstream ownership checks (S1/S2). |
| `supabase/functions/_shared/cors.ts` | Wildcard CORS noted, but bearer auth is still required; wildcard alone is not an auth bypass. |
| `supabase/functions/_shared/gemini.ts` | S1/F17: client-writable store pointer reused; racing first-store provisioning; ignored lookup/upsert errors. |
| `supabase/functions/ask-memory/index.ts` | S1/S2/S5/S6; F3/F10: unverified store/conversation pointers, limits/evidence gaps, differing default model, no history context. |
| `supabase/functions/create-note/index.ts` | S5/F3/F17: input limits, SDK contracts, ignored storage/DB errors, missing memories.content, unbounded poll. |
| `supabase/functions/delete-memory/index.ts` | S1/F8: trusts mutable resource pointers with admin rights; failures ignored, deletion not retryable. |
| `supabase/functions/load-demo-data/index.ts` | F3/F17: text uploaded as PDF/PNG, SDK mismatches, failure marked ready, notes not copied into memories.content. |
| `supabase/functions/upload-memory/index.ts` | F3/F17: SDK metadata/polling/documentName errors; unbounded ingestion loop; checked only by static audit, not build. |
| `supabase/migrations/20260919000000_memory_ai_init.sql` | S1/S5/S7: overly writable resource columns/store mapping; no quotas; missing parent ownership; messages and bucket RLS otherwise present. |
| `supabase/migrations/20260925000000_security_and_performance_fix.sql` | Protects messages for user-scoped clients; cannot protect service-role calls. Reopens full store-row writes; S1/S2 remain. |
| `tailwind.config.js` | Theme configuration reviewed; w-68 used in AskMemoryPage is not defined by this theme/default spacing. |
| `tsconfig.json` | Frontend strict check passes; include only src, so Edge Functions are excluded (F3). |
| `tsconfig.node.json` | Build configuration types reviewed. No independent defect identified. |
| `vercel.json` | S10: SPA fallback exists; app-defined security headers absent. |
| `vite.config.ts` | Dependency audit: host:true exposes development server to network interfaces; vendor-genai chunk is empty. |
