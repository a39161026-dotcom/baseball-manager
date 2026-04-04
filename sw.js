// ⚾ 야구9단 매니저 — Service Worker
// 오프라인 캐싱 + 빠른 로딩

const CACHE_NAME = 'baseball9-v1';
const ASSETS = [
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Noto+Sans+KR:wght@400;700&display=swap',
];

// 설치: 핵심 파일 캐싱
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(() => {
        // 폰트 등 외부 리소스 실패해도 설치 계속
        return cache.add('./index.html');
      });
    })
  );
  self.skipWaiting();
});

// 활성화: 구버전 캐시 삭제
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: 캐시 우선, 없으면 네트워크
self.addEventListener('fetch', event => {
  // Firebase 실시간 DB 요청은 캐싱 제외
  if (event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('googleapis.com/identitytoolkit')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // 유효한 응답만 캐싱 (opaque 응답 포함)
        if (!response || response.status !== 200) return response;

        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          try {
            cache.put(event.request, toCache);
          } catch(e) { /* 캐싱 실패 무시 */ }
        });

        return response;
      }).catch(() => {
        // 오프라인이고 캐시도 없으면 index.html 반환
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// 백그라운드 동기화 (선택)
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
