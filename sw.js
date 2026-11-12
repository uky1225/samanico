// 🌟 서비스 워커 버전 변경
// 새 버전이 배포되면 브라우저가 변경 사항을 감지합니다.
const CACHE_NAME = 'Samanico_v1.13';

// 캐싱할 기본 파일
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './IMG_0012.png'
];

// 1. 서비스 워커 설치 및 리소스 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 최신 리소스 캐싱 중...');

        return cache.addAll(ASSETS);
      })
      .then(() => {
        // 기존 서비스 워커를 기다리지 않고 즉시 활성화
        return self.skipWaiting();
      })
  );
});


// 2. 서비스 워커 활성화 및 이전 버전 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {

            // Samanico의 이전 캐시만 삭제
            if (
              name.startsWith('Samanico_') &&
              name !== CACHE_NAME
            ) {
              console.log('[Service Worker] 이전 캐시 삭제:', name);

              return caches.delete(name);
            }

            return Promise.resolve();
          })
        );
      })
      .then(() => {
        // 즉시 브라우저 제어권 획득
        return self.clients.claim();
      })
  );
});


// 3. 네트워크 요청 처리
self.addEventListener('fetch', (event) => {

  // GET 요청만 처리
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // HTTP / HTTPS가 아닌 요청 무시
  if (!url.protocol.startsWith('http')) {
    return;
  }


  // 4. 업데이트 확인 요청은 캐시를 사용하지 않음
  if (url.searchParams.has('update_check')) {
    event.respondWith(fetch(event.request));
    return;
  }


  // 5. 구글 앱스 스크립트 API는 항상 실시간 요청
  if (
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('googleusercontent.com')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }


  // 6. HTML 페이지는 네트워크 우선 방식
  if (
    event.request.mode === 'navigate' ||
    url.pathname.endsWith('index.html') ||
    url.pathname === '/'
  ) {

    event.respondWith(
      fetch(event.request)
        .then((response) => {

          // 최신 HTML을 받아오면 캐시 업데이트
          if (response && response.status === 200) {

            const responseClone = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseClone);
              });
          }

          return response;
        })
        .catch(() => {

          // 인터넷 연결이 끊겼을 때 캐시된 HTML 사용
          return caches.match(event.request)
            .then((cachedResponse) => {

              if (cachedResponse) {
                return cachedResponse;
              }

              return caches.match('./index.html');
            });
        })
    );

    return;
  }


  // 7. 나머지 이미지 및 정적 파일은 캐시 우선 방식
  event.respondWith(

    caches.match(event.request)
      .then((cachedResponse) => {

        // 캐시에 파일이 있으면 즉시 반환
        if (cachedResponse) {
          return cachedResponse;
        }

        // 캐시에 없으면 네트워크에서 가져오기
        return fetch(event.request)
          .then((networkResponse) => {

            // 정상적인 응답만 캐싱
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type !== 'opaque' &&
              (
                url.origin === self.location.origin ||
                url.hostname.includes('gstatic.com')
              )
            ) {

              const responseClone = networkResponse.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
            }

            return networkResponse;
          })
          .catch(() => {

            console.log(
              '[Service Worker] 네트워크 요청 실패:',
              url.pathname
            );

            // 캐시와 네트워크 모두 실패한 경우
            return new Response(
              '인터넷 연결을 확인해주세요.',
              {
                status: 503,
                headers: {
                  'Content-Type': 'text/plain; charset=utf-8'
                }
              }
            );
          });
      })
  );
});
