import React, { useState } from 'react'
import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import MemberLogin from './components/MemberLogin'
import Dashboard from './components/Dashboard'
import HomePage from './pages/HomePage'
import ResetPassword from './pages/ResetPassword'
import EventDetailPage from './pages/EventDetailPage'
import { supabase } from './lib/supabase'
import { ModalProvider } from './components/ModalProvider'
import { initMobileViewport } from './utils/viewport'

function App() {
  const { user, loading } = useAuth()
  const [showPasswordReset, setShowPasswordReset] = useState(false)

  useEffect(() => {
    // 初始化移动端视口设置
    initMobileViewport()
    
    // 处理邮件验证回调
    const handleAuthCallback = async () => {
      // 检查是否是密码重置
      const urlParams = new URLSearchParams(window.location.search)
      const type = urlParams.get('type')
      if (type === 'recovery') {
        console.log('Password recovery detected - redirecting to reset page')
        // 重定向到重置页面
        window.location.href = '/reset-password'
        return
      }
      
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        try {
          // 处理认证回调
          if (!supabase) return
          const { data, error } = await supabase.auth.getUser()
          if (error) {
            console.error('Auth callback error:', error)
          } else if (data.user) {
            // console.log('User authenticated successfully:', data.user.email)
            
            // 检查是否有待保存的用户资料
            const pendingProfile = localStorage.getItem('pendingUserProfile')
            if (pendingProfile) {
              try {
                const profileData = JSON.parse(pendingProfile)
                if (profileData.userId === data.user.id) {
                  // 保存用户资料到数据库
                  const { error: profileError } = await supabase
                    .from('user_profiles')
                    .insert({
                      id: data.user.id,
                      full_name: profileData.fullName,
                      phone: profileData.phone,
                      membership_type: 'standard'
                    })
                  
                  if (profileError && profileError.code !== '23505') {
                    console.error('保存用户资料失败:', profileError)
                  }
                  
                  // 清除临时存储的数据
                  localStorage.removeItem('pendingUserProfile')
                }
              } catch (error) {
                console.error('处理待保存用户资料失败:', error)
                localStorage.removeItem('pendingUserProfile')
              }
            }
          }
        } catch (error) {
          console.error('Error handling auth callback:', error)
        } finally {
          // 清理 URL 参数
          window.history.replaceState({}, document.title, window.location.pathname)
        }
      } else if (hash && hash.includes('error')) {
        console.error('Auth error in URL')
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }

    handleAuthCallback()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-golf-50 to-golf-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-golf-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  // 如果显示密码重置，显示重置界面
  if (showPasswordReset) {
    return (
      <ModalProvider>
        <MemberLogin onLoginSuccess={() => {}} />
      </ModalProvider>
    )
  }

  return (
    <Router>
      <ModalProvider>
        <Routes>
          {/* 公开首页 */}
          <Route path="/" element={
            !user ? (
              <HomePage />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          } />
          
          {/* 登录页面 */}
          <Route path="/login" element={
            !user ? (
              <MemberLogin onLoginSuccess={() => {}} />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          } />
          
          {/* 重置密码 */}
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* 会员面板（需要登录） */}
          <Route path="/dashboard" element={
            user ? (
              <Dashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          } />
          
          {/* 活动详情页（公开，不需要登录） */}
          <Route path="/event/:id" element={<EventDetailPage />} />
          
          {/* 其他路由重定向到首页 */}
          <Route path="*" element={
            <Navigate to={user ? "/dashboard" : "/"} replace />
          } />
        </Routes>
      </ModalProvider>
    </Router>
  )
}

export default App