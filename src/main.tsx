import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { injectSpeedInsights } from '@vercel/speed-insights';
injectSpeedInsights();

// 注册Service Worker (PWA功能)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ PWA Service Worker注册成功:', registration.scope);
        
        // 监听更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          
          newWorker.addEventListener('statechange', () => {
            // 当新 Service Worker 安装完成但还在等待状态时
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 检测到新版本，显示更新提示
              showUpdateNotification(registration);
            }
          });
        });
        
        // 定期检查更新（每60秒检查一次）
        setInterval(() => {
          registration.update();
        }, 60000);
      })
      .catch((error) => {
        console.error('❌ PWA Service Worker注册失败:', error);
      });
    
    // 监听 Service Worker 控制器变更（新版本激活后）
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // 新版本激活后刷新页面
      window.location.reload();
    });
  });
}

// 显示更新提示
function showUpdateNotification(registration: ServiceWorkerRegistration) {
  // 检查是否已经显示过提示（避免重复显示）
  if (document.querySelector('.pwa-update-notification')) {
    return;
  }
  
  const notification = document.createElement('div');
  notification.className = 'pwa-update-notification';
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 14px;
    font-weight: 500;
    max-width: 90%;
    animation: slideUp 0.3s ease-out;
  `;
  
  notification.innerHTML = `
    <span>🔄 发现新版本可用</span>
    <button id="pwa-update-btn" style="
      background: white;
      color: #059669;
      border: none;
      padding: 8px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    ">立即更新</button>
    <button id="pwa-update-dismiss" style="
      background: transparent;
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 12px;
    ">稍后</button>
  `;
  
  // 添加动画样式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp {
      from {
        transform: translateX(-50%) translateY(100px);
        opacity: 0;
      }
      to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    }
    #pwa-update-btn:hover {
      transform: scale(1.05);
    }
    #pwa-update-btn:active {
      transform: scale(0.95);
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(notification);
  
  // 立即更新按钮
  document.getElementById('pwa-update-btn')?.addEventListener('click', () => {
    if (registration.waiting) {
      // 告诉 Service Worker 跳过等待并激活
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    notification.remove();
  });
  
  // 稍后按钮
  document.getElementById('pwa-update-dismiss')?.addEventListener('click', () => {
    notification.remove();
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)