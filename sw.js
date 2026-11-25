const V = 'hayatak-v27';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'fonts/Cairo.woff2', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.slice(0, 6).map(u => c.add(new Request(u, { cache: 'reload' })))).then(() => Promise.all(SHELL.slice(6).map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.origin !== location.origin) return; // prayer-time API: network, app caches its own copy
  if (e.request.headers.has('range')) { e.respondWith(caches.match(e.request.url, { ignoreSearch: true }).then(async r => { if (!r) return fetch(e.request); const b = await r.arrayBuffer(), m = /bytes=(\d*)-(\d*)/.exec(e.request.headers.get('range')) || [], s = m[1] ? +m[1] : 0, en = m[2] ? Math.min(+m[2], b.byteLength - 1) : b.byteLength - 1; return new Response(b.slice(s, en + 1), { status: 206, headers: { 'Content-Type': r.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': `bytes ${s}-${en}/${b.byteLength}`, 'Content-Length': en - s + 1 } }); })); return; }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(e.request, cp)).catch(() => {}); } return res; }).catch(() => e.request.mode === 'navigate' ? caches.match('index.html') : Response.error())));
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(clients.matchAll({ type: 'window' }).then(l => l.length ? l[0].focus() : clients.openWindow('./'))); });
