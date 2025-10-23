// OneSignal 配置
export const ONESIGNAL_CONFIG = {
  appId: import.meta.env.VITE_ONESIGNAL_APP_ID || 'your-app-id',
  apiKey: import.meta.env.VITE_ONESIGNAL_API_KEY || 'your-api-key',
  restApiKey: import.meta.env.VITE_ONESIGNAL_REST_API_KEY || 'your-rest-api-key'
}

// OneSignal 初始化
export const initializeOneSignal = () => {
  console.log('OneSignal 配置:', ONESIGNAL_CONFIG)
  
  if (typeof window !== 'undefined' && window.OneSignal) {
    // 检查是否已经初始化
    if (window.OneSignal.isInitialized && window.OneSignal.isInitialized()) {
      console.log('OneSignal 已经初始化，跳过重复初始化')
      return
    }
    
    console.log('开始初始化 OneSignal SDK...')
    window.OneSignal.init({
      appId: ONESIGNAL_CONFIG.appId,
      allowLocalhostAsSecureOrigin: true,
      notifyButton: {
        enable: false
      }
    })
    console.log('OneSignal SDK 初始化完成')
  } else {
    console.error('OneSignal SDK 未加载或 window 对象不存在')
  }
}

// 订阅推送通知
export const subscribeToNotifications = async () => {
  if (typeof window !== 'undefined' && window.OneSignal) {
    try {
      await window.OneSignal.showNativePrompt()
      return true
    } catch (error) {
      console.error('订阅推送失败:', error)
      return false
    }
  }
  return false
}

// 发送推送通知
export const sendNotification = async (title: string, message: string, url?: string) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-onesignal-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        title,
        message,
        url
      })
    })
    
    if (!response.ok) {
      throw new Error('发送推送失败')
    }
    
    return await response.json()
  } catch (error) {
    console.error('发送推送失败:', error)
    throw error
  }
}

// 声明全局 OneSignal 类型
declare global {
  interface Window {
    OneSignal: any
  }
}
