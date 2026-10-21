// Offline support: keeps the app's own files on the phone. Only this site's own files are cached;
// the planner's data never passes through here (it lives in the phone's localStorage).
const CACHE = "den-viktorii-v8";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
  "./icon-maskable-512.png", "./apple-touch-icon.png", "./favicon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("den-viktorii-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  const u = new URL(req.url);
  if (req.method !== "GET" || u.origin !== self.location.origin) return;
  if (u.pathname.endsWith(".tar.gz")) return;   // the speech model is stored by the recognizer itself (IndexedDB), not cached twice
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, {ignoreSearch: true});
    const fresh = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (cached) { e.waitUntil(fresh); return cached; }       // offline-first, refresh in background
    const res = await fresh;
    if (res) return res;
    if (req.mode === "navigate") return (await cache.match("./index.html")) || Response.error();
    return Response.error();
  }));
});
