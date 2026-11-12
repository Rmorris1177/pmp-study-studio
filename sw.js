// Increment this version whenever the app or its offline assets change.
const CACHE='pmp-studio-shell-concept-c-rc11';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icons/concept-c-icon.svg','./icons/concept-c-maskable.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./icons/apple-touch-icon.png','./icons/favicon-32.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
// Do not skip waiting: updates activate after all existing app windows close.
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('pmp-studio-shell-')&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 if(event.request.mode==='navigate'){
  event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const fresh=await fetch(event.request,{cache:'no-store'});if(fresh.ok)await cache.put('./index.html',fresh.clone());return fresh;}catch{return (await cache.match('./index.html'))||Response.error();}})());
 }else event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
