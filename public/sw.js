// Service Worker for PWA and Push Notifications
const CACHE_NAME = 'golf-club-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icon-192x192.svg',
  '/icon-512x512.svg'
];

// 安装Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// 激活Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 处理推送通知
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let notificationData = {
    title: '高尔夫俱乐部',
    body: '您有新的活动通知',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: '查看详情',
        icon: '/icon-192x192.png'
      },
      {
        action: 'dismiss',
        title: '稍后提醒',
        icon: '/icon-192x192.png'
      }
    ],
    data: {
      url: '/',
      timestamp: Date.now()
    }
  };

  // 如果有推送数据，使用推送数据
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'open') {
    // 打开网站
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  } else if (event.action === 'dismiss') {
    // 稍后提醒 - 可以设置延迟通知
    console.log('User dismissed notification');
  } else {
    // 默认点击行为
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  }
});

// 处理通知关闭
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});

// 缓存策略
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 返回缓存或网络请求
        return response || fetch(event.request);
      })
  );
});
