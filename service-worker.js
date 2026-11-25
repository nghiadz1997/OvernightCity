/**
 * NSG SUPPORT - SERVICE WORKER (NETWORK-FIRST STRATEGY)
 * Đảm bảo luôn tải phiên bản mới nhất từ máy chủ, chỉ dùng cache khi thực sự mất mạng (Offline)
 */

const CACHE_NAME = 'nsg-support-cache-v5';

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installed v5');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating v5 & clearing all stale caches');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bỏ qua tất cả các domain ngoài, API, Zalo Bot, Telegram, Firebase, Google
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/uploads') ||
    url.hostname.includes('zaloplatforms') ||
    url.hostname.includes('zalo.me') ||
    url.hostname.includes('telegram.org') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis')
  ) {
    return;
  }

  // Network-First: Luôn ưu tiên lấy bản mới nhất từ máy chủ
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Lưu bản mới vào cache nếu thành công
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Chỉ khi mất mạng hoàn toàn mới dùng bản trong cache
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'text/plain' } });
        }
        throw new Error('Network error (Offline)');
      })
  );
});
