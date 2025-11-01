import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { logUserLogin } from '../utils/loginLogger'

interface MemberLoginProps {
  onLoginSuccess: () => void
}

export default function MemberLogin({ onLoginSuccess }: MemberLoginProps) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [memberCount, setMemberCount] = useState(0)
  const [yearsEstablished, setYearsEstablished] = useState(0)

  // 获取会员数量和成立年数
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 获取会员数量
        const { data: memberData, error: memberError } = await supabase
          .rpc('get_member_count')
        
        if (!memberError && memberData) {
          setMemberCount(memberData)
        }
        
        // 计算成立年数（假设2015年成立，今年第10年）
        const establishedYear = 2015
        const currentYear = new Date().getFullYear()
        setYearsEstablished(currentYear - establishedYear)
      } catch (error) {
        console.error('获取统计数据失败:', error)
        // 设置默认值
        setMemberCount(11)
        setYearsEstablished(10)
      }
    }
    
    fetchStats()
  }, [])

  // 防止iOS自动缩放
  useEffect(() => {
    const preventZoom = () => {
      // 重置视口以防止iOS缩放
      const viewport = document.querySelector('meta[name=viewport]')
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
      }
    }

    // 页面加载时执行
    preventZoom()

    // 监听输入框聚焦事件
    const inputs = document.querySelectorAll('input[type="email"], input[type="password"], input[type="text"], input[type="tel"]')
    inputs.forEach(input => {
      input.addEventListener('focus', preventZoom)
      input.addEventListener('blur', preventZoom)
    })

    return () => {
      inputs.forEach(input => {
        input.removeEventListener('focus', preventZoom)
        input.removeEventListener('blur', preventZoom)
      })
    }
  }, [])

  // 5张高尔夫球场背景图片
  const backgroundImages = [
    'https://images.pexels.com/photos/1325735/pexels-photo-1325735.jpeg?auto=compress&cs=tinysrgb&w=1920', // 高尔夫球场全景
    'https://images.pexels.com/photos/1325736/pexels-photo-1325736.jpeg?auto=compress&cs=tinysrgb&w=1920', // 高尔夫球洞特写
    'https://images.pexels.com/photos/1325734/pexels-photo-1325734.jpeg?auto=compress&cs=tinysrgb&w=1920', // 高尔夫球场绿地
    'https://images.pexels.com/photos/2002717/pexels-photo-2002717.jpeg?auto=compress&cs=tinysrgb&w=1920', // 高尔夫球场湖景
    'https://images.pexels.com/photos/1325733/pexels-photo-1325733.jpeg?auto=compress&cs=tinysrgb&w=1920'  // 高尔夫球场日落
  ]

  useEffect(() => {
    // 检查URL参数，如果是密码重置，自动切换到重置模式
    const urlParams = new URLSearchParams(window.location.search)
    const type = urlParams.get('type')
    if (type === 'recovery') {
      setMode('reset')
    }
  }, [])

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setFullName('')
    setPhone('')
    setShowPassword(false)
    setRememberMe(false)
    setMessage('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`
        })
        if (error) throw error
        setMessage('重置邮件已发送，请检查您的邮箱。')
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.updateUser({
          password: password
        })
        if (error) throw error
        setMessage('密码重置成功！请使用新密码登录。')
        setMode('login')
      } else if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}`,
            data: {
              full_name: fullName,
              phone: phone
            }
          }
        })
        if (error) throw error
        
        // 检查用户状态
        if (data.user) {
          if (!data.session) {
            // 检查 user_metadata 中是否有 email_verified 字段
            const user = data.user
            const hasEmailVerified = user.user_metadata && 'email_verified' in user.user_metadata
            
            if (hasEmailVerified) {
              // 有 email_verified 字段说明是新用户，需要验证
              setMessage('注册成功！请检查您的邮箱，点击验证链接完成注册。验证后请返回此页面登录。')
            } else {
              // 没有 email_verified 字段说明用户已存在且已验证过
              setMessage('该邮箱已注册，请直接登录或使用其他邮箱。')
            }
          } else {
            // 有session，说明邮箱验证被禁用或用户已验证，直接注册成功
            setMessage('注册成功！请检查您的邮箱，点击验证链接完成注册。验证后请返回此页面登录。')
            
            // 确保用户资料存在
            try {
              const { error: profileError } = await supabase
                .from('user_profiles')
                .insert({
                  id: data.user.id,
                  full_name: fullName,
                  phone: phone,
                  membership_type: 'standard'
                })
              
              if (profileError && profileError.code !== '23505') {
                console.error('创建用户资料失败:', profileError)
              }
            } catch (error) {
              console.error('处理用户资料时出错:', error)
            }
            
            // 有session的情况下自动登录
            setTimeout(() => {
              onLoginSuccess()
              navigate('/dashboard')
            }, 1500)
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        
        // 登录成功后检查用户是否被禁用
        if (data.user) {
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('is_active')
            .eq('id', data.user.id)
            .single()
          
          // 如果查询出错，允许登录（避免因为数据库问题阻止所有用户）
          if (profileError) {
            console.warn('无法检查用户状态:', profileError)
          } else if (profile && profile.is_active === false) {
            // 用户被禁用，立即登出并抛出错误
            await supabase.auth.signOut()
            throw new Error('您的账户已被禁用，请联系管理员')
          }
        }
        
        // 如果选择了记住我，保存到localStorage
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email)
        } else {
          localStorage.removeItem('rememberedEmail')
        }
        
        // 显示登录后的 session 数据
        // console.log('=== 登录成功，获取活跃会话数据 ===')
        
        // 使用 RPC 函数获取当前用户的活跃会话
        const { data: sessions, error: sessionsError } = await supabase.rpc('get_user_active_sessions')
        // console.log('当前用户活跃会话:', sessions)
        // console.log('会话查询错误:', sessionsError)
        
        // 使用 RPC 函数返回的真实数据记录到 login_logs
        if (sessions && sessions.length > 0) {
          const session = sessions[0] // 取最新的会话
          const { error: insertError } = await supabase
            .from('login_logs')
            .insert({
              user_id: session.user_id,
              device_type: session.user_agent ? (
                /mobile|android|iphone|ipod|blackberry|iemobile|opera mini|windows phone/i.test(session.user_agent) ? 'mobile' : 'desktop'
              ) : 'unknown',
              user_agent: session.user_agent,
              ip_address: session.ip
            })
          
          if (insertError) {
            console.error('记录登录日志失败:', insertError)
          } else {
            // console.log('使用真实数据记录登录日志成功')
          }
        }
        
        // console.log('=====================================')
        
        onLoginSuccess()
        navigate('/dashboard')
      }
    } catch (error: any) {
      if (error.message === '您的账户已被禁用，请联系管理员') {
        setMessage('您的账户已被禁用，请联系管理员')
      } else if (error.message === 'User is banned' || error.message.includes('banned')) {
        setMessage('您的账户已被禁用，请联系管理员')
      } else if (error.message === 'Email not confirmed') {
        setMessage('邮箱尚未验证。请检查您的邮箱（包括垃圾邮件文件夹），点击验证链接后再次登录。')
      } else if (error.message === 'Invalid login credentials' || error.message.includes('invalid_credentials')) {
        setMessage('登录失败：邮箱或密码错误。请检查您的邮箱和密码是否正确，或使用"忘记密码"功能重置密码。')
      } else if (error.message === 'User already registered') {
        setMessage('该邮箱已注册，请直接登录或使用其他邮箱。')
      } else if (error.message.includes('already_registered') || error.message.includes('email_address_already_in_use')) {
        setMessage('该邮箱已注册，请直接登录或使用其他邮箱。')
      } else if (error.message.includes('Email rate limit exceeded')) {
        setMessage('邮件发送过于频繁，请稍后再试。')
      } else {
        console.error('Authentication error:', error)
        setMessage('登录失败，请检查网络连接或稍后重试。如果问题持续存在，请联系管理员。')
      }
    } finally {
      setLoading(false)
    }
  }

  // 组件加载时检查是否有记住的邮箱
  React.useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail')
    if (rememberedEmail) {
      setEmail(rememberedEmail)
      setRememberMe(true)
    }
  }, [])

  // 图片自动切换效果
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % backgroundImages.length
      )
    }, 5000) // 每5秒切换一张图片

    return () => clearInterval(interval)
  }, [backgroundImages.length])

  const getTitle = () => {
    switch (mode) {
      case 'register': return '会员注册'
      case 'forgot': return '重置密码'
      case 'reset': return '重置密码'
      default: return '会员登录'
    }
  }

  const getSubtitle = () => {
    switch (mode) {
      case 'register': return '加入绿茵高尔夫俱乐部'
      case 'forgot': return '输入您的邮箱地址，我们将发送重置链接'
      case 'reset': return '请输入您的新密码'
      default: return '欢迎回到绿茵高尔夫俱乐部'
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 transition-opacity duration-1000">
        {backgroundImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentImageIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={image}
              alt={`高尔夫球场 ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-golf-900/30 to-transparent"></div>
        
        {/* 图片指示器 */}
        <div className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {backgroundImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                index === currentImageIndex 
                  ? 'bg-white scale-110' 
                  : 'bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Left Side - Brand Info */}
        <div className="flex-1 flex items-end justify-center px-4 py-4 sm:py-6 lg:items-center lg:py-12 lg:px-12">
          <div className="max-w-lg text-center lg:text-left w-full">
            {/* Logo */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white rounded-full flex items-center justify-center mx-auto lg:mx-0 mb-3 sm:mb-4 lg:mb-8 border border-white shadow-lg">
              <img 
                src="/golf-club-logo.png" 
                alt="绿茵高尔夫俱乐部" 
                className="w-19 h-19 sm:w-21 sm:h-21 lg:w-23 lg:h-23 object-contain"
              />
            </div>
            
            {/* Brand Name */}
            <h1 className="text-2xl sm:text-3xl lg:text-5xl xl:text-6xl font-bold text-white mb-2 sm:mb-3 lg:mb-6 leading-tight">
              绿茵高尔夫俱乐部
            </h1>
            <p className="text-golf-200 text-base sm:text-lg lg:text-xl mb-3 sm:mb-4 lg:mb-8 font-medium">
              Greenfield Golf Club
            </p>
            
            {/* Description */}
            <p className="text-white/90 text-sm sm:text-base lg:text-lg leading-relaxed mb-4 sm:mb-6 lg:mb-12 max-w-md mx-auto lg:mx-0">
              在这片绿意盎然的天地里，每一杆都是艺术，每一场都是享受。加入我们，体验世界级的高尔夫之旅。
            </p>
            
            {/* Stats */}
            <div className="hidden lg:flex justify-start space-x-12">
              <div className="text-center lg:text-left">
                <div className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-white mb-1">{memberCount}+</div>
                <div className="text-xs sm:text-sm lg:text-base text-golf-200">尊贵会员</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-white mb-1">18洞</div>
                <div className="text-xs sm:text-sm lg:text-base text-golf-200">锦标球场</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-white mb-1">{yearsEstablished}年</div>
                <div className="text-xs sm:text-sm lg:text-base text-golf-200">专业经验</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 flex items-start justify-center px-4 py-2 sm:py-4 lg:items-center lg:px-12 lg:py-8">
          <div className="w-full max-w-sm sm:max-w-md">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 border border-white/20">
              <div className="text-center mb-6 sm:mb-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                  <img 
                    src="/golf-club-logo.png" 
                    alt="绿茵高尔夫俱乐部" 
                    className="w-15 h-15 sm:w-17 sm:h-17 object-contain"
                  />
                </div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">{getTitle()}</h2>
                <p className="text-xs sm:text-sm lg:text-base text-gray-600">{getSubtitle()}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 lg:space-y-6">
                {mode === 'register' && (
                  <>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                        姓名
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-golf-500 focus:border-transparent transition-all duration-200 bg-white/80"
                        placeholder="请输入您的姓名"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                        手机号码
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-golf-500 focus:border-transparent transition-all duration-200 bg-white/80"
                        placeholder="请输入您的手机号码"
                        required
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    邮箱地址
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-golf-500 focus:border-transparent transition-all duration-200 bg-white/80"
                      placeholder="请输入您的邮箱"
                      required
                    />
                  </div>
                </div>

                {mode !== 'forgot' && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      密码
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-8 sm:pl-10 pr-10 sm:pr-12 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-golf-500 focus:border-transparent transition-all duration-200 bg-white/80"
                        placeholder="请输入您的密码"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'login' && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 text-golf-600 focus:ring-golf-500 border-gray-300 rounded"
                      />
                      <label htmlFor="remember-me" className="ml-2 block text-xs sm:text-sm text-gray-700">
                       记住邮箱
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs sm:text-sm text-golf-600 hover:text-golf-700 transition-colors text-left sm:text-right"
                    >
                      忘记密码？
                    </button>
                  </div>
                )}

                {message && (
                  <div className={`p-3 sm:p-4 rounded-lg sm:rounded-xl text-xs sm:text-sm border ${
                    message.includes('成功') || message.includes('已发送')
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-golf-600 to-golf-700 hover:from-golf-700 hover:to-golf-800 text-white font-semibold py-2 sm:py-3 px-4 text-sm sm:text-base rounded-lg sm:rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {loading ? 
                    (mode === 'register' ? '注册中...' : mode === 'forgot' ? '发送中...' : mode === 'reset' ? '重置中...' : '登录中...') : 
                    (mode === 'register' ? '注册' : mode === 'forgot' ? '发送重置邮件' : mode === 'reset' ? '重置密码' : '登录')
                  }
                </button>
              </form>

              <div className="mt-4 sm:mt-6 text-center">
                {/* 重新发送验证邮件按钮 */}
                {message.includes('验证邮件') && mode === 'register' && (
                  <div className="mb-3 sm:mb-4">
                    <button
                      onClick={async () => {
                        if (email) {
                          setLoading(true)
                          try {
                            const { error } = await supabase.auth.resend({
                              type: 'signup',
                              email: email,
                              options: {
                                emailRedirectTo: `${window.location.origin}`
                              }
                            })
                            if (error) throw error
                            setMessage('验证邮件已重新发送！请检查您的邮箱（包括垃圾邮件文件夹）。')
                          } catch (error: any) {
                            if (error.message.includes('Email rate limit exceeded')) {
                              setMessage('邮件发送过于频繁，请稍后再试。')
                            } else {
                              setMessage('重新发送失败，请稍后重试。可能邮箱验证功能已被禁用，请尝试直接登录。')
                            }
                          } finally {
                            setLoading(false)
                          }
                        }
                      }}
                      className="text-golf-600 hover:text-golf-700 text-xs sm:text-sm underline transition-colors"
                      disabled={loading || !email}
                    >
                      重新发送验证邮件
                    </button>
                  </div>
                )}
                
                {mode === 'forgot' ? (
                  <p className="text-xs sm:text-sm text-gray-600">
                    记起密码了？
                    <button 
                      onClick={() => {
                        setMode('login')
                        resetForm()
                      }}
                      className="text-golf-600 hover:text-golf-700 font-medium ml-1 transition-colors"
                    >
                      返回登录
                    </button>
                  </p>
                ) : mode === 'reset' ? (
                  <p className="text-xs sm:text-sm text-gray-600">
                    密码重置成功！请使用新密码登录。
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-600">
                    {mode === 'register' ? '已有账户？' : '还不是会员？'}
                    <button 
                      onClick={() => {
                        setMode(mode === 'register' ? 'login' : 'register')
                        resetForm()
                      }}
                      className="text-golf-600 hover:text-golf-700 font-medium ml-1 transition-colors"
                    >
                      {mode === 'register' ? '立即登录' : '立即注册'}
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}