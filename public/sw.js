// 简单的 Service Worker，用于 PWA 功能
const CACHE_NAME = 'golf-club-v3'
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
]

// 安装事件
self.addEventListener('install', (event) => {
  // 不自动跳过等待，等待用户确认后再更新
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache)
      })
  )
  // 不调用 skipWaiting()，等待用户手动触发
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

// 监听来自客户端的消息，用于手动触发 skipWaiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    // 用户点击更新后，立即激活新版本
    self.skipWaiting()
  }
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
