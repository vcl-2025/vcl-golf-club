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
    icon: '/icon-192x192.svg',
    badge: '/badge-72x72.svg',
    vibrate: [100, 50, 100],
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: '查看详情',
        icon: '/icon-192x192.svg'
      },
      {
        action: 'dismiss',
        title: '稍后提醒',
        icon: '/icon-192x192.svg'
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
      console.log('Push data received:', pushData);
      notificationData = { ...notificationData, ...pushData };
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }

  console.log('Showing notification with data:', notificationData);
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
      .then(() => {
        console.log('Notification shown successfully');
      })
      .catch((error) => {
        console.error('Error showing notification:', error);
      })
  );
});

// 主动触发推送通知（用于测试）
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  console.log('Message type:', event.data?.type);
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    console.log('处理SHOW_NOTIFICATION消息...');
    const { title, body, icon, badge } = event.data;
    
    const notificationData = {
      title: title || '高尔夫俱乐部',
      body: body || '您有新的活动通知',
      icon: icon || '/icon-192x192.svg',
      badge: badge || '/badge-72x72.svg',
      vibrate: [100, 50, 100],
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: '查看详情',
          icon: '/icon-192x192.svg'
        },
        {
          action: 'dismiss',
          title: '稍后提醒',
          icon: '/icon-192x192.svg'
        }
      ],
      data: {
        url: '/',
        timestamp: Date.now()
      }
    };
    
    console.log('准备显示通知:', notificationData);
    console.log('通知标题:', notificationData.title);
    console.log('通知内容:', notificationData.body);
    
    self.registration.showNotification(notificationData.title, notificationData)
      .then(() => {
        console.log('✅ 通知显示成功！');
      })
      .catch((error) => {
        console.error('❌ 通知显示失败:', error);
        console.error('错误详情:', error.message);
        console.error('错误堆栈:', error.stack);
      });
  } else {
    console.log('未知消息类型:', event.data?.type);
  }
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
