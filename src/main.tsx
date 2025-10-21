import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { injectSpeedInsights } from '@vercel/speed-insights';
injectSpeedInsights();

// 注册Service Worker
if ('serviceWorker' in navigator) {
  console.log('开始注册Service Worker...');
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker注册成功:', registration);
        console.log('Service Worker作用域:', registration.scope);
        console.log('Service Worker状态:', registration.active?.state);
      })
      .catch((error) => {
        console.error('❌ Service Worker注册失败:', error);
        console.error('错误详情:', error.message);
        console.error('错误堆栈:', error.stack);
      });
  });
} else {
  console.log('❌ 浏览器不支持Service Worker');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)