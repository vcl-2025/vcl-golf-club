import React, { useState } from 'react'
import { X, Mail, Lock, User, Phone } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'login' | 'register'
  onModeChange: (mode: 'login' | 'register') => void
}

export default function AuthModal({ isOpen, onClose, mode, onModeChange }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        setMessage('登录成功！')
        setTimeout(() => onClose(), 1000)
      } else {
        // console.log('=== 开始注册流程 ===')
        // console.log('邮箱:', email)
        // console.log('姓名:', fullName)
        // console.log('电话:', phone)

        const signUpPayload = {
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}`,
            data: {
              full_name: fullName,
              phone: phone
            }
          }
        }

        // console.log('发送到 Supabase 的数据:', JSON.stringify(signUpPayload.options.data, null, 2))

        const { data, error } = await supabase.auth.signUp(signUpPayload)

        if (error) {
          console.error('注册失败:', error)
          throw error
        }

        // console.log('注册成功，返回的数据:')
        // console.log('- User ID:', data.user?.id)
        // console.log('- User metadata:', JSON.stringify(data.user?.user_metadata, null, 2))
        // console.log('- 是否有 session:', !!data.session)

        // 如果有 session，说明邮箱验证已禁用，需要更新 user_profiles
        if (data.user && data.session) {
          // console.log('邮箱验证已禁用，尝试更新 user_profiles...')

          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              full_name: fullName,
              phone: phone
            })
            .eq('id', data.user.id)

          if (updateError) {
            console.error('更新用户资料失败:', updateError)
          } else {
            // console.log('用户资料更新成功')
          }
        } else {
          // console.log('有 session，触发器应该已经创建了用户资料')
        }

        if (data.user && !data.session) {
          setMessage('注册成功！我们已发送验证邮件到您的邮箱，请点击邮件中的链接完成验证。验证后您就可以正常登录了。')
        } else {
          setMessage('注册成功！')
          setTimeout(() => onClose(), 1000)
        }
      }
    } catch (error: any) {
      if (error.message === 'Email not confirmed') {
        setMessage('邮箱尚未验证。请检查您的邮箱（包括垃圾邮件文件夹），点击验证链接后再次登录。如需重新发送验证邮件，请联系客服。')
      } else {
        setMessage(error.message || '操作失败，请重试')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'login' ? '会员登录' : '会员注册'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  姓名
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                    placeholder="请输入您的姓名"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">这是您在俱乐部中显示的姓名</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  电话号码
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                    placeholder="请输入手机号码"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              邮箱地址
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                placeholder="请输入邮箱地址"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              密码
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                placeholder="请输入密码"
                required
                minLength={6}
              />
            </div>
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
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 disabled:opacity-50"
          >
            {loading ? '处理中...' : (mode === 'login' ? '登录' : '注册')}
          </button>
        </form>

        <div className="mt-6 text-center">
          {mode === 'login' && message.includes('邮箱尚未验证') && (
            <div className="mb-4">
              <button
                onClick={async () => {
                  if (email) {
                    setLoading(true)
                    try {
                      await supabase.auth.resend({
                        type: 'signup',
                        email: email,
                        options: {
                          emailRedirectTo: `${window.location.origin}`
                        }
                      })
                      setMessage('验证邮件已重新发送，请查看邮箱。')
                    } catch (error: any) {
                      setMessage('发送失败：' + error.message)
                    } finally {
                      setLoading(false)
                    }
                  }
                }}
                className="text-golf-600 hover:text-golf-700 text-sm underline"
                disabled={loading || !email}
              >
                重新发送验证邮件
              </button>
            </div>
          )}
          <button
            onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}
            className="text-golf-600 hover:text-golf-700 text-sm"
          >
            {mode === 'login' ? '还没有账户？立即注册' : '已有账户？立即登录'}
          </button>
        </div>
      </div>
    </div>
  )
}