import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [tokenChecked, setTokenChecked] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // 检测用户是否已经通过恢复链接自动登录
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setMessage('重置链接无效或已过期，请重新请求邮件。')
      }
      setTokenChecked(true)
    }
    
    checkSession()
  }, [])

  const handleReset = async () => {
    if (password.length < 6) {
      setMessage('密码至少 6 位。')
      return
    }
    if (password !== confirm) {
      setMessage('两次输入的密码不一致。')
      return
    }

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      // 将英文错误信息转换为中文
      let errorMessage = error.message
      if (errorMessage.includes('New password should be different from the old password')) {
        errorMessage = '新密码不能与旧密码相同'
      } else if (errorMessage.includes('Password should be at least 6 characters')) {
        errorMessage = '密码至少需要6位字符'
      } else if (errorMessage.includes('Invalid password')) {
        errorMessage = '密码格式无效'
      } else if (errorMessage.includes('Auth session missing')) {
        errorMessage = '认证会话已失效，请重新申请密码重置'
      }
      setMessage('❌ 修改失败：' + errorMessage)
    } else {
      setMessage('✅ 密码修改成功，正在登出...')
      setTimeout(async () => {
        await supabase.auth.signOut()
        navigate('/')
      }, 2000)
    }
  }

  if (!tokenChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-golf-50 to-golf-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-golf-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">验证链接中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-golf-50 to-golf-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-golf-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-golf-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">重置密码</h1>
          <p className="text-gray-600">请设置一个新密码以继续使用账户</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              新密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
              placeholder="请输入新密码"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              确认密码
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
              placeholder="请再次输入新密码"
              required
              minLength={6}
            />
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

          <button
            onClick={handleReset}
            className="w-full bg-golf-600 text-white py-2 px-4 rounded-lg hover:bg-golf-700 focus:ring-2 focus:ring-golf-500 focus:ring-offset-2 transition-colors"
          >
            更新密码
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-golf-600 hover:text-golf-700 text-sm"
          >
            返回主页
          </button>
        </div>
      </div>
    </div>
  )
}
