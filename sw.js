const CACHE_NAME = 'desert-odyssey-v1';
const ASSETS = [
  './',
  './index.html'
  // 만약 css, js 파일을 따로 분리했다면 여기에 './style.css', './game.js' 처럼 추가하세요
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
