/**
 * NSG SUPPORT - SERVICE WORKER (NETWORK-FIRST STRATEGY)
 * Đảm bảo luôn tải phiên bản mới nhất từ máy chủ, chỉ dùng cache khi thực sự mất mạng (Offline)
 */

const CACHE_NAME = 'nsg-support-cache-v3';

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installed v3');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating v3 & clearing all stale caches');
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

  // Bỏ qua các request API, Firebase, Google APIs
  if (
    url.pathname.startsWith('/api') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.pathname.startsWith('/uploads')
  ) {
    return;
  }

  // Network-First: Luôn ưu tiên lấy bản mới nhất từ máy chủ
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Lưu bản mới vào cache nếu thành công
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Chỉ khi mất mạng hoàn toàn mới dùng bản trong cache
        return caches.match(event.request);
      })
  );
});
