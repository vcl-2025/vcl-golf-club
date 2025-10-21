import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Bell } from 'lucide-react';

interface PWAInstallPromptProps {
  onClose: () => void;
}

export default function PWAInstallPrompt({ onClose }: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 检测iOS设备
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // 检测是否已安装为PWA
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // 监听PWA安装提示
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA安装结果: ${outcome}`);
      setDeferredPrompt(null);
    }
  };

  const handleIOSInstall = () => {
    // iOS需要手动添加到主屏幕
    alert('请按照以下步骤添加到主屏幕：\n1. 点击Safari底部的分享按钮\n2. 选择"添加到主屏幕"\n3. 点击"添加"');
  };

  if (isStandalone) {
    return null; // 已经是PWA，不显示提示
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Smartphone className="w-6 h-6 mr-2 text-blue-600" />
            安装应用
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Bell className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">推送通知功能</h4>
                <p className="text-sm text-blue-700">
                  安装为PWA应用后，您可以接收推送通知，包括活动提醒、报名确认等。
                </p>
              </div>
            </div>
          </div>

          {isIOS ? (
            <div className="space-y-3">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-900 mb-2">iPhone用户安装步骤：</h4>
                <ol className="text-sm text-yellow-800 space-y-1">
                  <li>1. 点击Safari底部的分享按钮</li>
                  <li>2. 选择"添加到主屏幕"</li>
                  <li>3. 点击"添加"完成安装</li>
                </ol>
              </div>
              
              <button
                onClick={handleIOSInstall}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <Download className="w-5 h-5 mr-2" />
                查看安装步骤
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-900 mb-1">Android用户</h4>
                <p className="text-sm text-green-800">
                  点击下方按钮即可安装为应用，支持推送通知功能。
                </p>
              </div>
              
              <button
                onClick={handleInstall}
                disabled={!deferredPrompt}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Download className="w-5 h-5 mr-2" />
                {deferredPrompt ? '安装应用' : '安装提示不可用'}
              </button>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              稍后再说
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
