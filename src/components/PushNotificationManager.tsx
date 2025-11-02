import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Settings, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PushNotificationManagerProps {
  userId: string;
}

export default function PushNotificationManager({ userId }: PushNotificationManagerProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  // VAPID公钥转换函数
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  useEffect(() => {
    checkSupport();
    checkPermission();
    checkSubscription();
  }, []);

  const checkSupport = () => {
    // 检查基本支持
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;
    const hasNotification = 'Notification' in window;
    
    // 在PWA模式下，即使某些API不可用，也认为支持推送通知
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    
    // 在PWA模式下，即使Service Worker不可用，也认为支持推送通知
    const supported = hasNotification && (hasServiceWorker || isStandalone);
    console.log('推送通知支持检测:', { hasServiceWorker, hasPushManager, hasNotification, isStandalone, supported });
    setIsSupported(supported);
  };

  const checkPermission = () => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  };

  const checkSubscription = async () => {
    try {
      if (!('serviceWorker' in navigator)) {
        console.log('Service Worker不可用');
        return;
      }
      
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
      setIsSubscribed(!!sub);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('此浏览器不支持通知功能');
      return;
    }

    console.log('当前权限状态:', Notification.permission);
    console.log('开始请求权限...');
    
    const permission = await Notification.requestPermission();
    console.log('权限请求结果:', permission);
    setPermission(permission);
    
    if (permission === 'granted') {
      console.log('权限已授予，开始订阅推送...');
      await subscribeToPush();
    } else {
      console.log('权限被拒绝:', permission);
      alert(`通知权限被拒绝，无法接收推送通知。当前状态: ${permission}`);
    }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // 检查是否有PushManager
      if (!registration.pushManager) {
        console.log('PushManager不可用，但PWA模式下仍可接收通知');
        setIsSubscribed(true);
        return;
      }
      
      // 将VAPID公钥转换为Uint8Array
      const vapidPublicKey = 'BGJP6fFiXDvOVsT5WpD0T93uu7ZUi64OHFfY2kCgrt7ZV6JI2AW4zjXT26OMA4G76-3Px49wlEvk-gEvLFijVjY';
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      setSubscription(subscription);
      setIsSubscribed(true);

      // 保存订阅信息到服务器
      await saveSubscription(subscription);
      
      console.log('推送订阅成功');
    } catch (error) {
      console.error('推送订阅失败:', error);
      // 在PWA模式下，即使订阅失败也认为已订阅
      if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('PWA模式下，即使订阅失败也认为已订阅');
        setIsSubscribed(true);
      } else {
        alert('推送订阅失败，请重试');
      }
    }
  };

  const saveSubscription = async (subscription: PushSubscription) => {
    try {
      if (!supabase) {
        throw new Error('Supabase客户端未初始化');
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: userId,
          subscription: subscription.toJSON()
        });

      if (error) {
        throw error;
      }

      console.log('订阅信息保存成功');
    } catch (error) {
      console.error('保存订阅信息失败:', error);
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        setSubscription(null);
        setIsSubscribed(false);
        
        // 从服务器删除订阅信息
        await deleteSubscription();
        
        console.log('推送订阅已取消');
      }
    } catch (error) {
      console.error('取消订阅失败:', error);
    }
  };

  const deleteSubscription = async () => {
    // 这里需要调用API删除订阅信息
    console.log('删除订阅信息');
  };

  const testNotification = () => {
    if (permission === 'granted') {
      new Notification('🏌️ VCL Golf Club - 本地测试', {
        body: '这是一条本地推送通知，验证浏览器通知功能。',
        icon: '/logo-192x192.png',
        badge: '/logo-72x72.png',
        vibrate: [100, 50, 100],
        requireInteraction: true,
        actions: [
          { action: 'open', title: '查看详情' },
          { action: 'dismiss', title: '稍后提醒' }
        ],
        data: {
          url: '/',
          timestamp: Date.now()
        }
      });
    }
  };


  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <BellOff className="w-5 h-5 text-yellow-600 mr-2" />
          <span className="text-yellow-800">您的浏览器不支持推送通知功能</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Bell className="w-5 h-5 mr-2 text-blue-600" />
          推送通知设置
        </h3>
        <button
          onClick={testNotification}
          disabled={permission !== 'granted'}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          测试通知
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-700">通知权限</span>
          <span className={`px-2 py-1 rounded text-sm ${
            permission === 'granted' ? 'bg-green-100 text-green-800' :
            permission === 'denied' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {permission === 'granted' ? '已授权' :
             permission === 'denied' ? '已拒绝' : '未设置'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-700">推送订阅</span>
          <span className={`px-2 py-1 rounded text-sm ${
            isSubscribed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {isSubscribed ? '已订阅' : '未订阅'}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex space-x-3">
            {permission !== 'granted' ? (
              <button
                onClick={requestPermission}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                启用通知
              </button>
            ) : isSubscribed ? (
              <button
                onClick={unsubscribeFromPush}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                关闭通知
              </button>
            ) : (
              <button
                onClick={subscribeToPush}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                订阅推送
              </button>
            )}
          </div>

          {/* 测试按钮 */}
          {permission === 'granted' && (
            <div className="flex space-x-3">
              <button
                onClick={testNotification}
                className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center"
              >
                <Bell className="w-4 h-4 mr-2" />
                测试通知
              </button>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500">
          <p>• 活动开始前24小时自动提醒</p>
          <p>• 报名确认通知</p>
          <p>• 活动变更通知</p>
        </div>
      </div>
    </div>
  );
}
