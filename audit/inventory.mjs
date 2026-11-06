import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';
const files=[];
function walk(dir='.') {
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    if(['.git','node_modules','dist','audit','test-results','playwright-report'].includes(entry.name))continue;
    const file=path.join(dir,entry.name);
    if(entry.isDirectory()){walk(file);continue;}
    const buffer=fs.readFileSync(file);
    const row={file:file.replaceAll('\\','/'),bytes:buffer.length,sha256:crypto.createHash('sha256').update(buffer).digest('hex')};
    if(file.endsWith('.png')) {row.review='Binary reference asset: PNG signature/dimensions only; no executable code';row.width=buffer.readUInt32BE(16);row.height=buffer.readUInt32BE(20);}
    else if(entry.name==='.env') {
      row.review='Configuration presence only; secret values intentionally omitted';
      row.variables=buffer.toString().split(/\r?\n/).filter(x=>/^\w+=/.test(x)).map(x=>({name:x.split('=')[0],nonempty:!!x.slice(x.indexOf('=')+1).trim()}));
    } else {
      const text=buffer.toString();row.lines=text.split('\n').length;row.review='Text source/configuration/reference';
      if(/\.(tsx?|jsx?)$/.test(file)) {
        const tree=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
        row.parseErrors=tree.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' '));
        row.handlers=[];
        const visit=node=>{if(ts.isJsxAttribute(node)&&/^on[A-Z]/.test(node.name.getText(tree)))row.handlers.push({name:node.name.getText(tree),line:tree.getLineAndCharacterOfPosition(node.pos).line+1,expression:node.initializer?.getText(tree)});ts.forEachChild(node,visit);};visit(tree);
      }
      if(file.endsWith('.html')) {
        row.scripts=[...text.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].map(m=>({attributes:m[1],code:m[1].includes('tailwind-config')?'Theme configuration':m[2]}));
        row.externalOrigins=[...new Set([...text.matchAll(/https?:\/\/[^/\s"'<>]+/g)].map(m=>m[0]))];
      }
    }
    files.push(row);
  }
}
walk();
files.sort((a,b)=>a.file.localeCompare(b.file));
fs.writeFileSync('audit/file-inventory.json',JSON.stringify(files,null,2)+'\n');
const notes={
  '.env':'Credential presence checked only; credentials are empty. Local/demo runtime is the default for this checkout.',
  '.env.example':'S4, F2, F18: recommends browser AI secret; local-encryption/setup descriptions need correction.',
  '.gitignore':'Ignores .env and build/dependency output; current .env is not tracked. No independent defect identified.',
  'README.md':'S4, S8, F2, F18: architecture, encryption, model list, and setup documentation diverge from implementation.',
  'package.json':'F3, release gaps: no test/lint/Edge-check scripts; browser SDK and pg dependencies appear unused in app source.',
  'package-lock.json':'Dependency audit: installed Vite, source-map-js, postcss-selector-parser advisories. Full lock parsed by npm.',
  'vite.config.ts':'Dependency audit: host:true exposes development server to network interfaces; vendor-genai chunk is empty.',
  'vercel.json':'S10: SPA fallback exists; app-defined security headers absent.',
  'tsconfig.json':'Frontend strict check passes; include only src, so Edge Functions are excluded (F3).',
  'tsconfig.node.json':'Build configuration types reviewed. No independent defect identified.',
  'postcss.config.js':'Standard Tailwind/autoprefixer setup; transitive parser dependency advisories covered separately.',
  'tailwind.config.js':'Theme configuration reviewed; w-68 used in AskMemoryPage is not defined by this theme/default spacing.',
  'index.html':'S10: external fonts; CSP/header hardening missing from app configuration.',
  'public/logo.svg':'Static vector inspected; no executable content found.',
  'public/manifest.webmanifest':'Manifest reviewed; SVG-only install icon support requires target-browser verification.',
  'public/sw.js':'PWA: hashed JS/CSS are not install-precached; cache miss plus failed fetch can return null; no sync/push implementation.',
  'src/main.tsx':'Registers production SW; StrictMode enabled; no independent entry-point defect identified.',
  'src/App.tsx':'F9: authenticated public-route redirects interfere with recovery; no recovery route.',
  'src/index.css':'Static styles reviewed; no independent security/correctness defect identified.',
  'src/vite-env.d.ts':'Only Supabase env fields typed explicitly; Gemini access uses any. No independent runtime defect.',
  'src/types/index.ts':'Application interfaces reviewed; no runtime schema validation (S6/F17). Profile.email type excludes nullable DB values.',
  'src/lib/supabase.ts':'F18: dynamic client lifecycle/setup; connection tester can report success despite DB/auth endpoint failure notices.',
  'src/context/AuthContext.tsx':'S3/F9/F18: retained browser data, incomplete recovery, demo/account lifecycle and stale auth subscription.',
  'src/utils/indexedDb.ts':'S3/F5/F8: global unencrypted blob store, suppressed failures, request-vs-transaction completion, incomplete cleanup.',
  'src/services/api.ts':'S3/S5; F1/F2/F4/F5/F6/F7/F8/F10/F13/F14/F16/F18. Main concentration of defects.',
  'src/services/gemini.ts':'S4/S6; F10/F15/F16: browser key, unverified evidence, missing history/date/token limits; VITE_GEMINI_MODEL is ignored.',
  'src/services/demoData.ts':'F14/F15: fixture dates stale; fabricated conflict source absent; fixtures not isolated from local user data.',
  'src/services/migrationSql.ts':'S1/S7: duplicate schema/policies retain weaknesses. No source imports this SQL export; drift/maintenance risk.',
  'src/components/common/Header.tsx':'Navigation reviewed; no independent defect identified.',
  'src/components/common/SourceCard.tsx':'S6: labels model-supplied snippets verified without proof validation.',
  'src/components/common/ErrorBoundary.tsx':'Catches render failures; does not handle async operation errors. Security reassurance is not established by a render boundary.',
  'src/components/layout/AppLayout.tsx':'S8/F4: unverified Connected label and promised reconnect sync without a sync implementation.',
  'src/pages/LandingPage.tsx':'S8/F2: claims native embeddings, zero hallucinations and File Search pipeline that frontend bypasses.',
  'src/pages/AuthPage.tsx':'S8/F9/F18/F19: misleading encryption/private-vault claims; missing reset completion; modal accessibility.',
  'src/pages/DashboardPage.tsx':'S8/F15/F16: all totals called indexed, past pending items shown as upcoming, full-vault reads.',
  'src/pages/AddMemoryPage.tsx':'F2/F11/F12/F19: unsupported formats, OCR races/stale closure, unchecked batch uploads, keyboard/label gaps.',
  'src/pages/AskMemoryPage.tsx':'F1/F10/F19: cache-only ghost classification; no multi-turn backend context; stale in-flight replies can overwrite a newly selected conversation.',
  'src/pages/MemoryLibraryPage.tsx':'F1/F6/F8/F16: destructive ghost UI; cloud favorite no-op; hides failed deletions; client filtering of capped reads.',
  'src/pages/MemoryDetailPage.tsx':'F6/F8/F13/F14/F19: cloud favorite no-op; misleading provider deletion/summary; wrong attachment fallback; async detail races.',
  'src/pages/TimelinePage.tsx':'F16: depends on unpaginated listMemories; grouping itself reviewed with no separate defect identified.',
  'src/pages/RemindersPage.tsx':'F7/F14/F15/F19: cached toggles, fabricated custom-data reminders, duplicate/invalid date imports, no notification delivery.',
  'src/pages/SettingsPage.tsx':'S8/F8/F18/F19: false privacy assurances, incomplete purge, missing documented backend configuration, dialog/accessibility.',
  'supabase/functions/_shared/auth.ts':'JWT validated with getUser; server service-role client then bypasses RLS, requiring explicit downstream ownership checks (S1/S2).',
  'supabase/functions/_shared/cors.ts':'Wildcard CORS noted, but bearer auth is still required; wildcard alone is not an auth bypass.',
  'supabase/functions/_shared/gemini.ts':'S1/F17: client-writable store pointer reused; racing first-store provisioning; ignored lookup/upsert errors.',
  'supabase/functions/ask-memory/index.ts':'S1/S2/S5/S6; F3/F10: unverified store/conversation pointers, limits/evidence gaps, differing default model, no history context.',
  'supabase/functions/upload-memory/index.ts':'F3/F17: SDK metadata/polling/documentName errors; unbounded ingestion loop; checked only by static audit, not build.',
  'supabase/functions/create-note/index.ts':'S5/F3/F17: input limits, SDK contracts, ignored storage/DB errors, missing memories.content, unbounded poll.',
  'supabase/functions/delete-memory/index.ts':'S1/F8: trusts mutable resource pointers with admin rights; failures ignored, deletion not retryable.',
  'supabase/functions/load-demo-data/index.ts':'F3/F17: text uploaded as PDF/PNG, SDK mismatches, failure marked ready, notes not copied into memories.content.',
  'supabase/migrations/20260919000000_memory_ai_init.sql':'S1/S5/S7: overly writable resource columns/store mapping; no quotas; missing parent ownership; messages and bucket RLS otherwise present.',
  'supabase/migrations/20260925000000_security_and_performance_fix.sql':'Protects messages for user-scoped clients; cannot protect service-role calls. Reopens full store-row writes; S1/S2 remain.',
};
const rows=files.map(f=>{
  let note=notes[f.file];
  if(!note&&f.file.endsWith('.png'))note='Reference screenshot: PNG metadata inspected only, not visual parity; not executable application code.';
  if(!note&&f.file.startsWith('screens/'))note=f.file.includes('08_reminders')?'S9: standalone mockup contains raw-input innerHTML injection. Not included in production build.':'Standalone design reference: theme, scripts and interactions inventoried; CDN Tailwind dependency; not integrated runtime functionality or production build output.';
  return `| \`${f.file}\` | ${note||'Inventoried; see JSON for metadata.'} |`;
});
fs.writeFileSync('audit/BASELINE_FILE_REVIEW.md','# File review inventory\n\nOriginal project inventory; excludes Git internals, vendored dependencies, generated builds, and audit artifacts. Findings refer to PROJECT_AUDIT.md. A row without an independent finding is not a guarantee that the file has no defects. Text/scripts were reviewed statically; the 10 PNGs received metadata checks only.\n\n| File | Review result |\n|---|---|\n'+rows.join('\n')+'\n');
console.log(JSON.stringify({total:files.length,text:files.filter(x=>!x.file.endsWith('.png')).length,images:files.filter(x=>x.file.endsWith('.png')).length,syntaxErrors:files.filter(x=>x.parseErrors?.length),environment:files.find(x=>x.file==='.env')?.variables},null,2));
