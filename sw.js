const V = 'hayatak-v6';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'data/adhkar.json', 'data/quran.json', 'fonts/Cairo.ttf', 'fonts/AmiriQuran.ttf', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL.slice(0, 6)).then(() => Promise.all(SHELL.slice(6).map(u => c.add(u).catch(() => {}))))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.origin !== location.origin) return; // prayer-time API: network, app caches its own copy
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(e.request, cp)).catch(() => {}); } return res; }).catch(() => e.request.mode === 'navigate' ? caches.match('index.html') : Response.error())));
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(clients.matchAll({ type: 'window' }).then(l => l.length ? l[0].focus() : clients.openWindow('./'))); });
