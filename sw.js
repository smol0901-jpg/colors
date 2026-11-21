/* Сервис-воркер: офлайн для сайта, агента, программы и демо. Версию кэша менять при каждой публикации. */
const VER = 'cik-v5';
const CORE = ["./", "agent/agent-core.js", "agent/agent-ui.js", "agent/index.html", "agent/team.js", "correction/correction.js", "correction/index.html", "demo/color/assets/favicon.svg", "demo/color/css/style.css", "demo/color/data/example-measurements.json", "demo/color/index.html", "demo/color/js/app.js", "demo/color/js/colorants.js", "demo/color/js/dosing.js", "demo/color/js/history.js", "demo/color/js/lab.js", "demo/color/js/llm.js", "demo/color/js/model.js", "demo/color/js/nn.js", "demo/color/js/planner.js", "demo/color/js/plot.js", "demo/color/js/ral-data.js", "demo/color/js/version.js", "demo/color/package.json", "demo/css/app.css", "demo/index.html", "demo/js/app.js", "demo/js/capacity.js", "demo/js/chem.js", "demo/js/core.js", "demo/js/equip.js", "demo/js/ops.js", "demo/js/vision-frames.js", "demo/js/vision.js", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "index.html", "manifest.webmanifest", "program/index.html", "program/program.js", "pwa.js"];
const PAGE_FALLBACK = 'index.html';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VER).then((c) => Promise.all(CORE.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VER).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.headers.has('range') || /\.(mp4|webm)$/i.test(url.pathname)) return; // видео не кэшируем
  const same = url.origin === location.origin;
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!same && !fonts) return;
  if (req.mode === 'navigate') {
    // страницы: сначала сеть, при отсутствии сети — кэш
    e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(VER).then((c) => c.put(req, cp)); return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match(new URL(url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname, location.origin).href) || caches.match(PAGE_FALLBACK))));
    return;
  }
  // ресурсы: из кэша сразу, в фоне обновляем
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((r) => { if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(VER).then((c) => c.put(req, cp)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
