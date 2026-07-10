const CACHE_NAME = 'desert-odyssey-v1.0.2'; // 업데이트 시 버전을 올리면 유저 브라우저가 즉시 리프레시됩니다.
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// 최초 설치 시 에셋 캐싱
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 구버전 캐시 삭제 청소
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 네트워크 다운 시 로컬 캐시 우선 반환 (오프라인 구동의 핵심)
self.addEventListener('fetch', (e) => {
  // 구글 앱스 스크립트 통신 API 요청은 캐싱에서 제외 (실시간성 유지)
  if (e.request.url.includes('script.google.com')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
