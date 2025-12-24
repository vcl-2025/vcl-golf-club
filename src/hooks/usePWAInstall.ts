import { useState, useEffect } from 'react';

/**
 * Hook to detect if PWA is already installed and handle install prompt
 * 
 * 逻辑说明：
 * - isInstalled: 当前是否以 PWA 模式运行（display-mode: standalone）
 * - canInstall: 是否支持一键安装（beforeinstallprompt 事件可用）
 * - shouldShowButton: 是否应该显示安装按钮
 *   - 如果当前是 PWA 模式运行，不显示
 *   - 如果支持一键安装，显示
 *   - 如果是 iOS，总是显示（需要手动操作）
 *   - 如果已安装但删除了，从浏览器访问时 shouldShowButton 为 true
 */
export function usePWAInstall() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [shouldShowButton, setShouldShowButton] = useState(true);

  useEffect(() => {
    // 检测是否已安装为 PWA（当前是否以 PWA 模式运行）
    const checkInstalled = () => {
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);
      
      // 如果当前是 PWA 模式运行，不显示按钮
      // 如果从浏览器访问（即使之前安装过但删除了），isStandalone 为 false，可以显示按钮
      return isStandalone;
    };

    const isCurrentlyStandalone = checkInstalled();

    // 检测是否为 iOS（iOS 总是需要手动操作，所以总是显示按钮）
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    // 监听 PWA 安装提示事件（Chrome/Edge）
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 监听安装状态变化（用户可能安装了应用）
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // 决定是否显示按钮
    // 1. 如果当前是 PWA 模式运行，不显示
    // 2. 如果是 iOS，总是显示（需要手动操作）
    // 3. 如果支持一键安装（canInstall），显示
    // 4. 如果已安装但删除了，从浏览器访问时 isStandalone 为 false，显示按钮
    const updateShouldShowButton = () => {
      if (isCurrentlyStandalone) {
        setShouldShowButton(false);
      } else if (isIOS) {
        setShouldShowButton(true); // iOS 总是显示，因为需要手动操作
      } else {
        // 对于其他平台，如果支持安装就显示
        // 注意：即使 canInstall 为 false（比如已安装但删除了），
        // 用户从浏览器访问时，也应该显示按钮，让用户可以重新安装
        setShouldShowButton(true);
      }
    };

    // 延迟检查，等待 beforeinstallprompt 事件
    const timer = setTimeout(() => {
      updateShouldShowButton();
    }, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // 当 canInstall 状态变化时，更新 shouldShowButton
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isCurrentlyStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    if (isCurrentlyStandalone) {
      setShouldShowButton(false);
    } else if (isIOS) {
      setShouldShowButton(true);
    } else {
      // 对于其他平台，即使 canInstall 为 false，也显示按钮
      // 因为用户可能已经安装过但删除了，从浏览器访问时应该可以重新安装
      setShouldShowButton(true);
    }
  }, [canInstall, isInstalled]);

  return {
    isInstalled,
    canInstall,
    deferredPrompt,
    shouldShowButton
  };
}

