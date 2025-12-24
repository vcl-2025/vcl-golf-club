import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Smartphone, Monitor, CheckCircle, XCircle, ArrowLeft, Sparkles, Zap, Shield, Bell } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallApp() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<'desktop' | 'mobile' | 'ios' | 'unknown'>('unknown');

  useEffect(() => {
    // 检测平台
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isMobile = isIOS || isAndroid;
    const isDesktop = !isMobile && (window.innerWidth > 768);

    if (isIOS) {
      setPlatform('ios');
    } else if (isMobile) {
      setPlatform('mobile');
    } else if (isDesktop) {
      setPlatform('desktop');
    } else {
      setPlatform('unknown');
    }

    // 检测是否已安装
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // 监听 PWA 安装提示事件（Chrome/Edge）
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setInstallError('您的浏览器不支持一键安装，请使用 Chrome、Edge 或 Safari 浏览器');
      return;
    }

    setIsInstalling(true);
    setInstallError(null);

    try {
      // 显示安装提示
      await deferredPrompt.prompt();
      
      // 等待用户选择
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        
        // 3秒后自动返回首页
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } else {
        setInstallError('安装已取消');
      }
    } catch (error: any) {
      console.error('安装失败:', error);
      setInstallError(error.message || '安装失败，请重试');
    } finally {
      setIsInstalling(false);
    }
  };

  const getInstallInstructions = () => {
    if (platform === 'ios') {
      return {
        title: 'iPhone/iPad 安装步骤（需要手动操作）',
        subtitle: '由于 iOS 系统限制，无法一键安装，需要手动添加到主屏幕',
        steps: [
          {
            text: '点击 Safari 浏览器底部的"分享"按钮（方形箭头向上图标）',
            detail: '位于浏览器底部工具栏中间位置'
          },
          {
            text: '在分享菜单中向下滚动，找到并点击"添加到主屏幕"',
            detail: '图标是一个加号，通常在菜单的底部'
          },
          {
            text: '可以修改应用名称（可选），然后点击右上角"添加"按钮',
            detail: '应用会出现在主屏幕上，就像普通 App 一样'
          }
        ],
        icon: Smartphone,
        note: '⚠️ 注意：必须使用 Safari 浏览器，Chrome 等其他浏览器不支持此功能'
      };
    } else if (platform === 'mobile') {
      return {
        title: 'Android 手机安装步骤',
        subtitle: '支持一键安装',
        steps: [
          {
            text: '点击浏览器右上角的"菜单"按钮（三个点）',
            detail: ''
          },
          {
            text: '选择"添加到主屏幕"或"安装应用"',
            detail: ''
          },
          {
            text: '确认安装即可',
            detail: ''
          }
        ],
        icon: Smartphone,
        note: ''
      };
    } else {
      return {
        title: '桌面浏览器安装步骤',
        subtitle: '支持一键安装',
        steps: [
          {
            text: '点击浏览器地址栏右侧的"安装"图标',
            detail: ''
          },
          {
            text: '或在浏览器菜单中选择"安装应用"',
            detail: ''
          },
          {
            text: '确认安装即可',
            detail: ''
          }
        ],
        icon: Monitor,
        note: ''
      };
    }
  };

  const instructions = getInstallInstructions();
  const InstructionIcon = instructions.icon;

  // 如果已安装，显示成功页面
  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">安装成功！</h1>
            <p className="text-gray-600">应用已成功安装到您的设备</p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
              <h3 className="font-semibold text-green-900 mb-2 flex items-center">
                <Sparkles className="w-5 h-5 mr-2" />
                现在您可以：
              </h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• 从桌面或主屏幕直接打开应用</li>
                <li>• 享受更快的加载速度</li>
                <li>• 接收推送通知</li>
                <li>• 离线访问部分功能</li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-xl hover:bg-green-700 transition-colors font-semibold"
          >
            开始使用
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* 返回按钮 */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
          <span className="text-gray-700 font-medium">返回</span>
        </button>
      </div>

      <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden">
          {/* 头部 */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white text-center">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Download className="w-12 h-12" />
            </div>
            <h1 className="text-4xl font-bold mb-2">安装桌面应用</h1>
            <p className="text-lg opacity-90">一键安装，享受更好的使用体验</p>
          </div>

          {/* 内容区域 */}
          <div className="p-8">
            {/* 功能特性 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <Zap className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">快速启动</h3>
                <p className="text-sm text-gray-600">像原生应用一样快速打开</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <Bell className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">推送通知</h3>
                <p className="text-sm text-gray-600">及时接收重要消息提醒</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <Shield className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">安全可靠</h3>
                <p className="text-sm text-gray-600">数据加密，隐私保护</p>
              </div>
            </div>

            {/* 安装按钮区域 */}
            {deferredPrompt ? (
              <div className="text-center mb-8">
                <button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-8 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-semibold text-lg shadow-lg flex items-center justify-center space-x-2"
                >
                  {isInstalling ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>正在安装...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-6 h-6" />
                      <span>一键安装应用</span>
                    </>
                  )}
                </button>
                <p className="text-sm text-gray-500 mt-3">
                  点击按钮后，浏览器会弹出安装确认对话框
                </p>
              </div>
            ) : (
              <div className="mb-8">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                  <div className="flex items-start">
                    <InstructionIcon className="w-6 h-6 text-yellow-600 mr-3 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-yellow-900 mb-1">{instructions.title}</h3>
                      {instructions.subtitle && (
                        <p className="text-sm text-yellow-700 mb-4">{instructions.subtitle}</p>
                      )}
                      <ol className="space-y-3 text-sm text-yellow-800">
                        {instructions.steps.map((step, index) => (
                          <li key={index} className="flex items-start">
                            <span className="font-semibold mr-3 mt-0.5 bg-yellow-200 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <span className="font-medium">{typeof step === 'string' ? step : step.text}</span>
                              {typeof step === 'object' && step.detail && (
                                <p className="text-xs text-yellow-700 mt-1 ml-0">{step.detail}</p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                      {instructions.note && (
                        <div className="mt-4 bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                          <p className="text-xs text-yellow-900">{instructions.note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {platform === 'ios' && (
                  <div className="mt-4 space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>💡 为什么需要手动操作？</strong>
                      </p>
                      <p className="text-xs text-blue-700">
                        iOS 系统（iPhone/iPad）出于安全考虑，不允许网站通过代码自动触发"添加到主屏幕"功能。
                        这是 Apple 的系统限制，所有网站都需要用户手动操作。Android 和桌面浏览器支持一键安装。
                      </p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                      <p className="text-sm text-orange-800">
                        <strong>⚠️ 重要提示：</strong>必须使用 Safari 浏览器，Chrome 等其他浏览器不支持添加到主屏幕功能。
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 错误提示 */}
            {installError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start">
                <XCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 mb-1">安装失败</h4>
                  <p className="text-sm text-red-800">{installError}</p>
                </div>
              </div>
            )}

            {/* 浏览器兼容性提示 */}
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600">
                <strong>推荐浏览器：</strong>Chrome、Edge、Safari（iOS）、Firefox
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

