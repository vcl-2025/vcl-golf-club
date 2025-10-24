// 简单的 Service Worker，用于 PWA 功能
const CACHE_NAME = 'golf-club-v2'
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
]

// 安装事件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache)
      })
  )
})

// 激活事件
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// 拦截请求
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 如果是 HTML 请求，总是从网络获取
        if (event.request.headers.get('accept').includes('text/html')) {
          return fetch(event.request)
            .catch(() => caches.match('/index.html'))
        }
        // 其他资源返回缓存或网络请求
        return response || fetch(event.request)
      })
  )
})
