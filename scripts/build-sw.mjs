import fs from 'node:fs';
import crypto from 'node:crypto';
const assets=fs.readdirSync('dist/assets').filter(name=>!name.endsWith('.map')).map(name=>'/assets/'+name);
const urls=['/','/index.html','/manifest.webmanifest','/logo.svg',...assets];
const version=crypto.createHash('sha256').update(JSON.stringify(urls)+fs.readFileSync('dist/index.html','utf8')).digest('hex').slice(0,12);
const worker=fs.readFileSync('public/sw.js','utf8').replace('memory-ai-static-v3','memory-ai-static-'+version).replace('self.__PRECACHE__',JSON.stringify(urls));
fs.writeFileSync('dist/sw.js',worker);
