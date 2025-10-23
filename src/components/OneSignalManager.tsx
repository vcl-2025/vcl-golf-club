import React, { useEffect, useState } from 'react'
import { initializeOneSignal, subscribeToNotifications, sendNotification } from '../lib/onesignal'

export default function OneSignalManager() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // 初始化 OneSignal
    const initOneSignal = async () => {
      try {
        console.log('开始初始化 OneSignal...')
        console.log('App ID:', import.meta.env.VITE_ONESIGNAL_APP_ID)
        
        if (!import.meta.env.VITE_ONESIGNAL_APP_ID || import.meta.env.VITE_ONESIGNAL_APP_ID === 'your-onesignal-app-id') {
          setMessage('❌ 请先配置 OneSignal App ID')
          setIsInitialized(true)
          return
        }
        
        // 检查是否已经初始化
        if (window.OneSignal && window.OneSignal.isInitialized && window.OneSignal.isInitialized()) {
          console.log('OneSignal 已经初始化，直接设置状态')
          setIsInitialized(true)
          return
        }
        
        initializeOneSignal()
        setIsInitialized(true)
        console.log('OneSignal 初始化成功')
      } catch (error) {
        console.error('OneSignal 初始化失败:', error)
        setMessage('❌ OneSignal 初始化失败')
      }
    }

    // 延迟初始化，确保 OneSignal SDK 完全加载
    const timer = setTimeout(() => {
      initOneSignal()
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleSubscribe = async () => {
    try {
      const success = await subscribeToNotifications()
      if (success) {
        setIsSubscribed(true)
        setMessage('✅ 推送通知订阅成功！')
      } else {
        setMessage('❌ 推送通知订阅失败')
      }
    } catch (error) {
      console.error('订阅失败:', error)
      setMessage('❌ 推送通知订阅失败')
    }
  }

  const handleTestNotification = async () => {
    try {
      await sendNotification(
        '测试通知',
        '这是一条测试推送通知！',
        window.location.origin
      )
      setMessage('✅ 测试通知发送成功！')
    } catch (error) {
      console.error('发送测试通知失败:', error)
      setMessage('❌ 测试通知发送失败')
    }
  }

  if (!isInitialized) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="text-blue-600">正在初始化推送通知...</p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">推送通知设置</h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">
            订阅推送通知，及时接收活动提醒和重要通知
          </p>
          <button
            onClick={handleSubscribe}
            disabled={isSubscribed}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              isSubscribed
                ? 'bg-green-100 text-green-700 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSubscribed ? '已订阅' : '订阅推送通知'}
          </button>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-2">
            测试推送通知功能
          </p>
          <button
            onClick={handleTestNotification}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
          >
            发送测试通知
          </button>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.includes('成功') 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
