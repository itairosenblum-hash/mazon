// SW v2 - network-first, no caching of app files
const CACHE = 'mazon-v2';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // תמיד נסה רשת קודם, קאש רק כגיבוי
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // שמור בקאש רק בקשות GET של קבצים סטטיים לגיבוי offline
        if (e.request.method === 'GET' && !e.request.url.includes('script.google.com')) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
