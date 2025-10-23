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
      })
      .catch((error) => {
        console.error('❌ PWA Service Worker注册失败:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)