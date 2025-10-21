import React, { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, AlertCircle } from 'lucide-react';
import PushNotificationManager from './PushNotificationManager';
import EmailNotificationManager from './EmailNotificationManager';
import PWAInstallPrompt from './PWAInstallPrompt';

interface NotificationManagerProps {
  userId: string;
}

export default function NotificationManager({ userId }: NotificationManagerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isWeChat, setIsWeChat] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPWAInstall, setShowPWAInstall] = useState(false);
  const [notificationMethod, setNotificationMethod] = useState<'email' | 'push' | 'both'>('email');

  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent;
      const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent);
      const isWeChatBrowser = /MicroMessenger/i.test(userAgent);
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                             (window.navigator as any).standalone === true;
      
      setIsMobile(isMobileDevice);
      setIsIOS(isIOSDevice);
      setIsWeChat(isWeChatBrowser);
      setIsStandalone(isStandaloneMode);
      
      // 根据设备类型推荐通知方式
      if (isIOSDevice && !isStandaloneMode) {
        setNotificationMethod('email');
        // 延迟显示PWA安装提示，让用户先看到推荐信息
        setTimeout(() => setShowPWAInstall(true), 2000);
      } else if (isIOSDevice && isStandaloneMode) {
        setNotificationMethod('push'); // PWA应用模式推荐推送通知
      } else if (isWeChatBrowser) {
        setNotificationMethod('email');
      } else if (isMobileDevice) {
        setNotificationMethod('both');
      } else {
        setNotificationMethod('push');
      }
    };
    
    checkDevice();
  }, []);

  const getRecommendation = () => {
    if (isIOS && !isStandalone) {
      return {
        title: 'iPhone用户推荐',
        message: '安装为PWA应用后即可支持推送通知，或使用邮件通知功能',
        icon: <AlertCircle className="w-5 h-5 text-orange-600" />,
        color: 'bg-orange-50 border-orange-200 text-orange-800'
      };
    } else if (isIOS && isStandalone) {
      return {
        title: 'PWA应用模式',
        message: '您已安装为PWA应用，支持完整的推送通知功能',
        icon: <Bell className="w-5 h-5 text-green-600" />,
        color: 'bg-green-50 border-green-200 text-green-800'
      };
    } else if (isWeChat) {
      return {
        title: '微信浏览器',
        message: '微信内置浏览器不支持推送通知，建议使用邮件通知',
        icon: <AlertCircle className="w-5 h-5 text-green-600" />,
        color: 'bg-green-50 border-green-200 text-green-800'
      };
    } else if (isMobile) {
      return {
        title: '移动设备',
        message: '建议同时启用推送通知和邮件通知，确保重要消息不遗漏',
        icon: <Smartphone className="w-5 h-5 text-blue-600" />,
        color: 'bg-blue-50 border-blue-200 text-blue-800'
      };
    } else {
      return {
        title: '桌面设备',
        message: 'HTTP环境下推送通知受限，建议使用邮件通知（支持所有环境）',
        icon: <AlertCircle className="w-5 h-5 text-orange-600" />,
        color: 'bg-orange-50 border-orange-200 text-orange-800'
      };
    }
  };

  const recommendation = getRecommendation();

  return (
    <div className="space-y-6">
      {/* PWA安装提示 */}
      {showPWAInstall && (
        <PWAInstallPrompt onClose={() => setShowPWAInstall(false)} />
      )}

      {/* 设备检测和推荐 */}
      <div className={`p-4 rounded-lg border ${recommendation.color}`}>
        <div className="flex items-start">
          {recommendation.icon}
          <div className="ml-3">
            <h3 className="text-sm font-medium mb-1">{recommendation.title}</h3>
            <p className="text-sm">{recommendation.message}</p>
            {isIOS && !isStandalone && (
              <button
                onClick={() => setShowPWAInstall(true)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
              >
                查看安装步骤
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 通知方式选择 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Bell className="w-5 h-5 mr-2 text-blue-600" />
          通知方式设置
        </h3>
        
        <div className="space-y-3">
          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="notification-method"
              value="email"
              checked={notificationMethod === 'email'}
              onChange={(e) => setNotificationMethod(e.target.value as any)}
              className="mr-3"
            />
            <div className="flex items-center">
              <Mail className="w-5 h-5 text-blue-600 mr-3" />
              <div>
                <div className="font-medium text-gray-900">邮件通知</div>
                <div className="text-sm text-gray-500">
                  {isIOS ? 'iPhone用户强烈推荐，支持所有设备' : '支持所有设备，内容更详细'}
                </div>
              </div>
            </div>
          </label>

          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="notification-method"
              value="push"
              checked={notificationMethod === 'push'}
              onChange={(e) => setNotificationMethod(e.target.value as any)}
              className="mr-3"
              disabled={!isStandalone && (isIOS || isWeChat)}
            />
            <div className="flex items-center">
              <Bell className="w-5 h-5 text-green-600 mr-3" />
              <div>
                <div className="font-medium text-gray-900">推送通知</div>
                <div className="text-sm text-gray-500">
                  {!isStandalone && (isIOS || isWeChat) ? '当前设备不支持' : 
                   isStandalone ? 'PWA应用支持推送通知' : '实时通知，无需打开邮箱'}
                </div>
              </div>
            </div>
          </label>

          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="notification-method"
              value="both"
              checked={notificationMethod === 'both'}
              onChange={(e) => setNotificationMethod(e.target.value as any)}
              className="mr-3"
              disabled={!isStandalone && (isIOS || isWeChat)}
            />
            <div className="flex items-center">
              <Smartphone className="w-5 h-5 text-purple-600 mr-3" />
              <div>
                <div className="font-medium text-gray-900">双重通知</div>
                <div className="text-sm text-gray-500">
                  {!isStandalone && (isIOS || isWeChat) ? '当前设备不支持' : 
                   isStandalone ? 'PWA应用支持双重通知' : '推送+邮件，确保不遗漏'}
                </div>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* 邮件通知设置 */}
      {(notificationMethod === 'email' || notificationMethod === 'both') && (
        <EmailNotificationManager userId={userId} />
      )}

      {/* 推送通知设置 */}
      {(notificationMethod === 'push' || notificationMethod === 'both') && (
        <PushNotificationManager userId={userId} />
      )}

      {/* 使用说明 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">使用说明</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• <strong>邮件通知</strong>：发送到您的注册邮箱，支持所有设备</li>
          <li>• <strong>推送通知</strong>：在手机通知栏显示，需要浏览器支持</li>
          <li>• <strong>活动提醒</strong>：活动开始前24小时自动发送</li>
          <li>• <strong>报名确认</strong>：报名成功后立即发送</li>
          <li>• <strong>活动变更</strong>：活动信息更新时发送</li>
        </ul>
      </div>
    </div>
  );
}
