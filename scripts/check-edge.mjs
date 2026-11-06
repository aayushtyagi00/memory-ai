import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve('supabase/functions');
const deno=path.resolve('node_modules/deno/bin.cjs');
for(const entry of fs.readdirSync(root,{withFileTypes:true})){
 if(!entry.isDirectory()||entry.name.startsWith('_'))continue;
 const directory=path.join(root,entry.name);
 if(!fs.existsSync(path.join(directory,'index.ts')))continue;
 const config=path.join(directory,'deno.json');
 if(!fs.existsSync(config))throw new Error(`Missing deployment dependency configuration for ${entry.name}`);
 const result=spawnSync(process.execPath,[deno,'check','--frozen','--config',config,path.join(directory,'index.ts')],{stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status??1);
}
