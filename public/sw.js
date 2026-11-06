const CACHE_NAME = 'memory-ai-static-v3';
const PRECACHE_URLS = self.__PRECACHE__ || ['/', '/index.html', '/manifest.webmanifest', '/logo.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(PRECACHE_URLS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(name=>name.startsWith('memory-ai-')&&name!==CACHE_NAME).map(name=>caches.delete(name)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 // Only public application assets are cached. Private documents and API responses never are.
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).catch(async()=>await caches.match('/index.html')||Response.error()));return;
 }
 if(!PRECACHE_URLS.includes(url.pathname))return;
 // Public precached assets have identical contents regardless of Origin/Accept headers.
 // Preview/CDN servers may emit Vary: Origin, unlike cache.addAll's initial requests.
 event.respondWith(caches.match(event.request,{ignoreVary:true}).then(hit=>hit||fetch(event.request)));
});
