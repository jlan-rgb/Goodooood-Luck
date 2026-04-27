// ── Service Worker｜日運星盤 PWA ──
const CACHE_NAME = 'fortune-v1';
const ASSETS = [
  './index.html',
  './manifest.json'
];

// ── 安裝：快取核心資源 ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── 啟動：清除舊快取 ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── 攔截請求：優先快取，離線也能用 ──
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// ── 推送通知處理 ──
self.addEventListener('push', event => {
  let data = { title: '🌟 日運星盤', body: '今日運勢已更新，點擊查看。', icon: './icons/icon-192.png' };
  if (event.data) {
    try { data = { ...data, ...event.data.json() }; } catch(e) {}
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: './icons/icon-72.png',
      tag: 'daily-fortune',
      renotify: true,
      requireInteraction: false,
      data: { url: './index.html' }
    })
  );
});

// ── 點擊通知：開啟APP ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes('index.html') && 'focus' in client) return client.focus();
      }
      return clients.openWindow('./index.html');
    })
  );
});

// ── 定時推送（Background Sync / Periodic Sync）──
self.addEventListener('periodicsync', event => {
  if (event.tag === 'daily-fortune-push') {
    event.waitUntil(sendDailyNotification());
  }
});

async function sendDailyNotification() {
  const now = new Date();
  const hour = now.getHours();
  // 只在早上8點推送
  if (hour === 8) {
    await self.registration.showNotification('🌟 今日運勢', {
      body: `${now.getMonth()+1}月${now.getDate()}日 運勢已更新，點擊查看今日星盤。`,
      icon: './icons/icon-192.png',
      badge: './icons/icon-72.png',
      tag: 'daily-fortune',
      data: { url: './index.html' }
    });
  }
}
