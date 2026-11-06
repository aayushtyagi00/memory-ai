import fs from 'node:fs';import path from 'node:path';import ts from 'typescript';import vm from 'node:vm';
const files=[];const failures=[];
function walk(dir='.'){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  if(['.git','node_modules','dist','audit','test-results','playwright-report'].includes(e.name))continue;
  const p=path.join(dir,e.name);if(e.isDirectory()){walk(p);continue;}
  const b=fs.readFileSync(p);const row={file:p.replaceAll('\\','/'),bytes:b.length,review:''};
  if(e.name==='.env'){row.review='Configuration names/presence only; values omitted';}
  else if(p.endsWith('.jpg')){row.review='Reference JPEG metadata only';if(b[0]!==255||b[1]!==216)failures.push(p+': invalid JPEG');}
  else if(p.endsWith('.png')){row.review='Reference PNG metadata only';if(b.toString('hex',0,8)!=='89504e470d0a1a0a')failures.push(p+': invalid PNG');}
  else {const source=b.toString();row.review='Source/configuration static review';if(/\.(tsx?|m?jsx?)$/.test(p)){const kind=p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS;const parsed=ts.createSourceFile(p,source,ts.ScriptTarget.Latest,true,kind);for(const d of parsed.parseDiagnostics)failures.push(p+': '+ts.flattenDiagnosticMessageText(d.messageText,' '));}
   if(p.endsWith('.json')||p.endsWith('.webmanifest')){try{JSON.parse(source);}catch{failures.push(p+': invalid JSON');}}
   if(p.endsWith('.html')){let n=0;for(const match of source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){if(!match[1].includes('src=')){try{new vm.Script(match[2]);}catch(error){failures.push(p+': script '+(++n)+' '+error.message);}}}row.review='HTML and embedded script syntax; standalone references are not production routes';}
  }files.push(row);
 }
}
walk();files.sort((a,b)=>a.file.localeCompare(b.file));fs.writeFileSync('audit/current-file-review.json',JSON.stringify({reviewedOn:'2026-11-06',files,failures},null,2)+'\n');console.log(JSON.stringify({files:files.length,failures},null,2));if(failures.length)process.exitCode=1;
