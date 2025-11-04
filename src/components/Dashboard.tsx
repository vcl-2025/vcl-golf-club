import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, Trophy, Image, Heart, LogOut, User, Menu, X, Settings, ChevronDown, ArrowRight, Receipt, BookOpen, Bell, Users, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import ProfileModal from './ProfileModal'
import EventList from './EventList'
import EventDetail from './EventDetail'
import AdminPanel from './AdminPanel'
import PosterList from './PosterList'
import PosterDetail from './PosterDetail'
import ScoreList from './ScoreList'
import ScoreDetail from './ScoreDetail'
import UserScoreQuery from './UserScoreQuery'
import InvestmentList from './InvestmentList'
import InvestmentDetail from './InvestmentDetail'
import ExpenseList from './ExpenseList'
import EventReviews from './EventReviews'
import MemberPhotoGallery from './MemberPhotoGallery'
import InformationCenterList from './InformationCenterList'
import InformationCenterDetail from './InformationCenterDetail'
import { Event, InformationItem } from '../types'

interface Poster {
  id: string
  title: string
  description: string
  image_url: string
  display_order: number
  event_date: string
  status: string
  created_at: string
}

interface Score {
  id: string
  user_id: string
  competition_name: string
  competition_type: string
  course_name: string
  competition_date: string
  total_strokes: number
  net_strokes: number | null
  handicap: number
  rank: number | null
  total_participants: number | null
  holes_played: number
  notes: string | null
  created_at: string
}

interface InvestmentProject {
  id: string
  title: string
  description: string
  target_amount: number
  current_amount: number | null
  payment_method: string | null
  payment_qrcode_url: string | null
  emt_email: string | null
  status: string
  start_date: string
  end_date: string
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [memberCount, setMemberCount] = useState<number>(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [adminMenuVisible, setAdminMenuVisible] = useState(true)
  // 修改密码相关状态
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberNewPassword, setRememberNewPassword] = useState(false)
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false)
  const [passwordChangeMessage, setPasswordChangeMessage] = useState('')
  const [currentView, setCurrentView] = useState<'dashboard' | 'events' | 'posters' | 'scores' | 'investments' | 'expenses' | 'reviews' | 'information' | 'members' | 'admin'>('dashboard')
  const [showDateAvatar, setShowDateAvatar] = useState(false) // false显示日期，true显示头像

  // 监听用户菜单状态变化
  useEffect(() => {
    if (!userMenuOpen && currentView === 'admin') {
      setAdminMenuVisible(true)
    }
  }, [userMenuOpen, currentView])

  // 当修改密码modal打开时，禁止背景滚动
  useEffect(() => {
    if (changePasswordModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [changePasswordModalOpen])

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedPoster, setSelectedPoster] = useState<Poster | null>(null)
  const [selectedScore, setSelectedScore] = useState<Score | null>(null)
  const [selectedInvestment, setSelectedInvestment] = useState<InvestmentProject | null>(null)
  const [selectedInformationItem, setSelectedInformationItem] = useState<InformationItem | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [recentScores, setRecentScores] = useState<Score[]>([])
  const [recentInvestments, setRecentInvestments] = useState<InvestmentProject[]>([])
  const [recentExpenses, setRecentExpenses] = useState<any[]>([])
  const [recentPosters, setRecentPosters] = useState<Poster[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      // 检查是否需要强制修改密码
      const forcePasswordChange = localStorage.getItem('forcePasswordChange')
      if (forcePasswordChange === 'true') {
        // 显示密码修改模态框
        setProfileModalOpen(true)
        // 清除标记
        localStorage.removeItem('forcePasswordChange')
      }
      
      fetchUserProfile()
      fetchMemberCount()
      fetchDashboardData()
    }
    
  }, [user])

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuOpen) {
        const target = event.target as Element
        if (!target.closest('.user-dropdown-container')) {
          setUserMenuOpen(false)
        }
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  const fetchUserProfile = async () => {
    if (!user) return
    
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    
    setUserProfile(data)
  }

  const fetchMemberCount = async () => {
    try {
      // console.log('开始查询会员数量...')
      
      // 使用专门的函数获取会员总数
      const { data, error } = await supabase
        .rpc('get_member_count')
      
      // console.log('会员数量查询结果:', { data, error })
      
      if (error) {
        console.error('查询失败:', error)
        // 如果函数调用失败，使用备用方案
        const { data: viewData, error: viewError } = await supabase
          .from('member_count_view')
          .select('total_members')
          .single()
        
        if (viewError) {
          console.error('备用查询也失败:', viewError)
          setMemberCount(2) // 最后的备用值
        } else {
          setMemberCount(viewData.total_members)
        }
      } else {
        // console.log('会员数量查询成功:', data)
        setMemberCount(data || 0)
      }
    } catch (error) {
      console.error('查询会员数量时发生错误:', error)
      setMemberCount(2) // 临时显示已知的数量
    }
  }

  const fetchDashboardData = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // 获取即将举行的活动 - 显示2个
      // 只显示未开始的活动（当前时间 < 活动开始时间）
      const now = new Date().toISOString()
      
      // 查询未开始的活动，排除已取消的活动
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gt('start_time', now)
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true })
        .limit(2)
      
      // 如果还是没有找到，就不显示任何活动
      if (!events || events.length === 0) {
        // console.log('没有找到即将举行的活动')
        // events 已经是常量，不需要重新赋值
      }
      
      // console.log('活动查询结果:', { events, eventsError })
      setUpcomingEvents(events || [])

      // 获取用户最近的成绩 - 显示2个
      const { data: scores, error: scoresError } = await supabase
        .from('scores')
        .select('*')
        .eq('user_id', user.id)
        .limit(2)
      // console.log('成绩查询结果:', { scores, scoresError })
      setRecentScores(scores || [])

      // 获取最近的投资项目 - 显示2个，并计算实际筹集金额
      const { data: investments, error: investmentsError } = await supabase
        .from('investment_projects')
        .select(`
          *,
          investments!inner (
            amount,
            status
          )
        `)
        .limit(2)
      
      // 计算每个项目的实际筹集金额
      const investmentsWithAmount = (investments || []).map(project => {
        const confirmedInvestments = project.investments?.filter(inv => inv.status === 'confirmed') || []
        const actualAmount = confirmedInvestments.reduce((sum, inv) => sum + inv.amount, 0)
        return {
          ...project,
          current_amount: actualAmount
        }
      })
      
      // console.log('投资项目查询结果:', { investments: investmentsWithAmount, investmentsError })
      setRecentInvestments(investmentsWithAmount)

      // 获取最近的费用公示 - 显示2个
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .limit(2)
      // console.log('费用公示查询结果:', { expenses, expensesError })
      setRecentExpenses(expenses || [])

      // 获取最近的海报 - 显示2个（暂时隐藏）
      // const { data: posters, error: postersError } = await supabase
      //   .from('posters')
      //   .select('*')
      //   .limit(2)
      // // console.log('海报查询结果:', { posters, postersError })
      // setRecentPosters(posters || [])
      setRecentPosters([])

    } catch (error) {
      console.error('获取Dashboard数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const getMembershipTypeText = (type: string) => {
    switch (type) {
      case 'premium': return '高级会员'
      case 'vip': return 'VIP会员'
      default: return '普通会员'
    }
  }

  const getCurrentDate = () => {
    const now = new Date()
    return {
      year: now.getFullYear(),
      season: `${now.getMonth() + 1}月${now.getDate()}日`
    }
  }

  const { year, season } = getCurrentDate()

  // 日期卡片在日期和头像之间切换（每5秒）
  useEffect(() => {
    const interval = setInterval(() => {
      setShowDateAvatar(prev => !prev)
    }, 5000) // 每5秒切换一次

    return () => clearInterval(interval)
  }, [])

  // 检查是否为管理员
  const isAdmin = userProfile?.role === 'admin'

  // 如果是会员照片页面，直接返回全屏组件
  if (currentView === 'members') {
    return <MemberPhotoGallery onClose={() => setCurrentView('dashboard')} />
  }

  return (
    <div 
      className="min-h-screen dashboard-background"
      style={{
        backgroundImage: 'url(/flower-pattern.png)',
        backgroundRepeat: 'repeat',
        backgroundAttachment: 'fixed',
        backgroundSize: '480px 480px',
        backgroundPosition: '-30px 30px'
      }}
    >
      <style>{`
        @media (min-width: 641px) {
          .dashboard-background {
            background-size: 800px 800px !important;
          }
        }
      `}</style>
      {/* Header */}
      <header className="shadow-sm border-b sticky top-0 z-50" style={{ backgroundColor: '#619f56', borderColor: 'rgba(255,255,255,0.2)' }}>
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-3">
          <div className="flex justify-between items-center">
            {/* Logo and Brand */}
            <div 
              className="flex items-center cursor-pointer hover:opacity-90 transition-opacity duration-200 px-2 py-1 rounded-lg"
              onClick={() => setCurrentView('dashboard')}
              title="返回首页"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center flex-shrink-0">
                <img 
                  src="/logo.png" 
                  alt="溫哥華華人女子高爾夫俱樂部" 
                  className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 object-contain"
                  draggable="false"
                />
              </div>
              <div className="ml-2 sm:ml-3">
                <h1 className="text-base sm:text-xl lg:text-lg xl:text-xl font-extrabold text-white">溫哥華華人女子高爾夫俱樂部</h1>
                <p className="text-xs font-bold text-white">Vancouver Chinese Ladies' Golf Club</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden lg:flex space-x-2 xl:space-x-3">
              <button 
                onClick={() => setCurrentView('dashboard')}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'dashboard' 
                    ? 'bg-[#F15B98] text-white' 
                    : 'text-white hover:text-white/80 hover:bg-white/10'
                }`}
              >
                首页
              </button>
              <button
                onClick={() => setCurrentView('information')}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'information'
                    ? 'bg-[#F15B98] text-white'
                    : 'text-white hover:text-white/80 hover:bg-white/10'
                }`}
              >
                信息中心
              </button>
              <button 
                onClick={() => setCurrentView('events')}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'events' 
                    ? 'bg-[#F15B98] text-white' 
                    : 'text-white hover:text-white/80 hover:bg-white/10'
                }`}
              >
                活动报名
              </button>
              <button
                onClick={() => setCurrentView('reviews')}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'reviews'
                    ? 'bg-[#F15B98] text-white'
                    : 'text-white hover:text-white/80 hover:bg-white/10'
                }`}
              >
                精彩回顾
              </button>
              <button
                onClick={() => setCurrentView('scores')}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'scores'
                    ? 'bg-[#F15B98] text-white'
                    : 'text-white hover:text-white/80 hover:bg-white/10'
                }`}
              >
                成绩查询
              </button>
              <button
                onClick={() => setCurrentView('investments')}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'investments'
                    ? 'bg-[#F15B98] text-white'
                    : 'text-white hover:text-white/80 hover:bg-white/10'
                }`}
              >
                捐赠与赞助
              </button>
              <button
                onClick={() => setCurrentView('expenses')}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'expenses'
                    ? 'bg-[#F15B98] text-white'
                    : 'text-white hover:text-white/80 hover:bg-white/10'
                }`}
              >
                费用公示
              </button>
              {isAdmin && (
                <button 
                  onClick={() => {
                    setCurrentView('admin')
                    setAdminMenuVisible(true)
                  }}
                  className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                    currentView === 'admin' 
                      ? 'bg-[#F15B98] text-white' 
                      : 'text-white hover:text-white/80 hover:bg-white/10'
                  }`}
                >
                  管理后台
                </button>
              )}
              
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden text-white hover:text-white/80 p-1 sm:p-2"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              
              {/* Desktop User Dropdown */}
              <div className="relative hidden md:block user-dropdown-container">
                <button
                  onClick={() => {
                    // 如果在管理后台，打开用户菜单时隐藏管理员菜单
                    if (currentView === 'admin' && !userMenuOpen) {
                      setAdminMenuVisible(false)
                    }
                    setUserMenuOpen(!userMenuOpen)
                  }}
                  className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-2 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                    {userProfile?.avatar_url ? (
                      <img 
                        src={userProfile.avatar_url} 
                        alt={userProfile.full_name}
                        className="w-full h-full object-cover"
                        style={{
                          objectPosition: `${userProfile.avatar_position_x || 50}% ${userProfile.avatar_position_y || 50}%`
                        }}
                      />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {userProfile?.full_name || '未设置姓名'}
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div 
                    className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-[99999] max-h-96 overflow-y-auto transition-all duration-300 ease-out transform animate-in slide-in-from-top-2 fade-in" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* User Info Section */}
                    <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                        {userProfile?.avatar_url ? (
                          <img 
                            src={userProfile.avatar_url} 
                            alt={userProfile.full_name}
                            className="w-full h-full object-cover"
                            style={{
                              objectPosition: `${userProfile.avatar_position_x || 50}% ${userProfile.avatar_position_y || 50}%`
                            }}
                          />
                        ) : (
                          <User className="w-5 h-5 text-white" />
                        )}
                      </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {userProfile?.full_name || '未设置姓名'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user?.email}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setProfileModalOpen(true)
                          setUserMenuOpen(false)
                          // 恢复管理员菜单显示
                          if (currentView === 'admin') {
                            setAdminMenuVisible(true)
                          }
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <User className="w-4 h-4 mr-3" />
                        个人资料
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setChangePasswordModalOpen(true)
                          setUserMenuOpen(false)
                          // 恢复管理员菜单显示
                          if (currentView === 'admin') {
                            setAdminMenuVisible(true)
                          }
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Lock className="w-4 h-4 mr-3" />
                        修改密码
                      </button>
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setCurrentView('admin')
                            setUserMenuOpen(false)
                            setAdminMenuVisible(true)
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="w-4 h-4 mr-3" />
                          管理后台
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleSignOut()
                          setUserMenuOpen(false)
                          // 恢复管理员菜单显示
                          if (currentView === 'admin') {
                            setAdminMenuVisible(true)
                          }
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        退出登录
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Click outside to close dropdown */}
              {userMenuOpen && (
                <div 
                  className="fixed inset-0 z-[99998]" 
                  style={{ pointerEvents: 'auto' }}
                  onClick={() => {
                    setUserMenuOpen(false)
                    // 恢复管理员菜单显示
                    if (currentView === 'admin') {
                      setAdminMenuVisible(true)
                    }
                  }}
                ></div>
              )}
            </div>
          </div>

          {/* Mobile Navigation Menu - Side Drawer */}
          {/* Backdrop */}
          {mobileMenuOpen && (
            <div 
              className="lg:hidden fixed inset-0 bg-black/50 z-[100] transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            ></div>
          )}
          
          {/* Drawer */}
          <div className={`lg:hidden fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white shadow-xl z-[101] transform transition-transform duration-300 ease-out ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <div className="flex flex-col h-full overflow-y-auto">
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">菜单</h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Menu Items */}
              <div className="flex flex-col p-4 space-y-1 flex-1">
                <button 
                  onClick={() => {
                    setCurrentView('dashboard')
                    setMobileMenuOpen(false)
                  }}
                  className={`px-4 py-3 rounded-lg font-medium text-sm text-left transition-colors flex items-center space-x-3 ${
                    currentView === 'dashboard' 
                      ? 'bg-[#F15B98] text-white' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-[#F15B98]'
                  }`}
                >
                  <Calendar className="w-5 h-5" style={{ color: currentView === 'dashboard' ? '#FFFFFF' : '#1F2937' }} strokeWidth={2} />
                  <span>首页</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentView('information')
                    setMobileMenuOpen(false)
                  }}
                  className={`px-4 py-3 rounded-lg font-medium text-sm text-left transition-colors flex items-center space-x-3 ${
                    currentView === 'information'
                      ? 'bg-[#F15B98] text-white'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-[#F15B98]'
                  }`}
                >
                  <Bell className="w-5 h-5" style={{ color: currentView === 'information' ? '#FFFFFF' : '#1F2937' }} strokeWidth={2} />
                  <span>信息中心</span>
                </button>
                <button 
                  onClick={() => {
                    setCurrentView('events')
                    setMobileMenuOpen(false)
                  }}
                  className={`px-4 py-3 rounded-lg font-medium text-sm text-left transition-colors flex items-center space-x-3 ${
                    currentView === 'events' 
                      ? 'bg-[#F15B98] text-white' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-[#F15B98]'
                  }`}
                >
                  <Calendar className="w-5 h-5" style={{ color: currentView === 'events' ? '#FFFFFF' : '#1F2937' }} strokeWidth={2} />
                  <span>活动报名</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentView('reviews')
                    setMobileMenuOpen(false)
                  }}
                  className={`px-4 py-3 rounded-lg font-medium text-sm text-left transition-colors flex items-center space-x-3 ${
                    currentView === 'reviews'
                      ? 'bg-[#F15B98] text-white'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-[#F15B98]'
                  }`}
                >
                  <BookOpen className="w-5 h-5" style={{ color: currentView === 'reviews' ? '#FFFFFF' : '#1F2937' }} strokeWidth={2} />
                  <span>活动回顾</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentView('scores')
                    setMobileMenuOpen(false)
                  }}
                  className={`px-4 py-3 rounded-lg font-medium text-sm text-left transition-colors flex items-center space-x-3 ${
                    currentView === 'scores'
                      ? 'bg-[#F15B98] text-white'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-[#F15B98]'
                  }`}
                >
                  <Trophy className="w-5 h-5" style={{ color: currentView === 'scores' ? '#FFFFFF' : '#1F2937' }} strokeWidth={2} />
                  <span>成绩查询</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentView('investments')
                    setMobileMenuOpen(false)
                  }}
                  className={`px-4 py-3 rounded-lg font-medium text-sm text-left transition-colors flex items-center space-x-3 ${
                    currentView === 'investments'
                      ? 'bg-[#F15B98] text-white'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-[#F15B98]'
                  }`}
                >
                  <Heart className="w-5 h-5" style={{ color: currentView === 'investments' ? '#FFFFFF' : '#1F2937' }} strokeWidth={2} />
                  <span>捐赠与赞助</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentView('expenses')
                    setMobileMenuOpen(false)
                  }}
                  className={`px-4 py-3 rounded-lg font-medium text-sm text-left transition-colors flex items-center space-x-3 ${
                    currentView === 'expenses'
                      ? 'bg-[#F15B98] text-white'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-[#F15B98]'
                  }`}
                >
                  <Receipt className="w-5 h-5" style={{ color: currentView === 'expenses' ? '#FFFFFF' : '#1F2937' }} strokeWidth={2} />
                  <span>费用公示</span>
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => {
                      setCurrentView('admin')
                      setMobileMenuOpen(false)
                      setAdminMenuVisible(true)
                    }}
                    className={`px-4 py-3 rounded-lg font-medium text-sm text-left transition-colors flex items-center space-x-3 ${
                      currentView === 'admin' 
                        ? 'bg-[#F15B98] text-white' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-[#F15B98]'
                    }`}
                  >
                    <Settings className="w-5 h-5" style={{ color: currentView === 'admin' ? '#FFFFFF' : '#1F2937' }} strokeWidth={2} />
                    <span>管理后台</span>
                  </button>
                )}
                

                {/* Mobile User Info */}
                <div className="flex items-center space-x-3 px-3 py-4 border-t border-gray-200 mt-auto">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                    {userProfile?.avatar_url ? (
                      <img 
                        src={userProfile.avatar_url} 
                        alt={userProfile.full_name}
                        className="w-full h-full object-cover"
                        style={{
                          objectPosition: `${userProfile.avatar_position_x || 50}% ${userProfile.avatar_position_y || 50}%`
                        }}
                      />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {userProfile?.full_name || '未设置姓名'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </div>
                  </div>
                </div>
                
                {/* Mobile Profile Button */}
                <button
                  onClick={() => {
                    setProfileModalOpen(true)
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center space-x-3 px-3 py-3 text-gray-700 hover:bg-gray-50 hover:text-[#F15B98] font-medium text-sm text-left w-full rounded-lg transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span>个人资料</span>
                </button>
                
                {/* Mobile Change Password Button */}
                <button
                  onClick={() => {
                    setChangePasswordModalOpen(true)
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center space-x-3 px-3 py-3 text-gray-700 hover:bg-gray-50 hover:text-[#F15B98] font-medium text-sm text-left w-full rounded-lg transition-colors"
                >
                  <Lock className="w-5 h-5" />
                  <span>修改密码</span>
                </button>
                
                {/* Mobile Admin Button */}
                {isAdmin && (
                  <button
                    onClick={() => {
                      setCurrentView('admin')
                      setMobileMenuOpen(false)
                      setAdminMenuVisible(true)
                    }}
                    className="flex items-center space-x-3 px-3 py-3 text-gray-700 hover:bg-gray-50 hover:text-[#F15B98] font-medium text-sm text-left w-full rounded-lg transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                    <span>管理后台</span>
                  </button>
                )}
                
                {/* Mobile Logout Button */}
                <button
                  onClick={() => {
                    handleSignOut()
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center space-x-3 px-3 py-3 text-gray-700 hover:bg-gray-50 hover:text-[#F15B98] font-medium text-sm text-left w-full rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>退出登录</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-10 py-4 sm:py-6 lg:py-8">
        {currentView === 'dashboard' ? (
          <>
            {/* Welcome Banner - 高尔夫主题设计 */}
            <div 
              className="relative rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8 text-white overflow-hidden transition-all duration-300 welcome-card group"
              style={{ 
                background: 'linear-gradient(145deg, #F36C92, #F26B99)',
                boxShadow: 'inset 0 0 8px rgba(255,255,255,0.4), 0 6px 12px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.1)'
              }}
            >
              {/* 点状纹理叠加层 */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `
                    radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 1px, transparent 1px),
                    radial-gradient(circle at 40% 20%, rgba(255,255,255,0.1) 1px, transparent 1px),
                    radial-gradient(circle at 80% 40%, rgba(255,255,255,0.1) 1px, transparent 1px),
                    radial-gradient(circle at 60% 70%, rgba(255,255,255,0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: '60px 60px, 80px 80px, 100px 100px, 70px 70px'
                }}
              ></div>
              
              {/* 人物线稿右侧雾层 */}
              <div 
                className="absolute right-0 top-0 bottom-0 w-1/3 opacity-30 pointer-events-none"
                style={{
                  background: 'linear-gradient(to left, rgba(255,255,255,0.15), transparent)'
                }}
              ></div>
              
              {/* 主要内容 */}
              <div className="relative z-10">
                <div className="flex items-center mb-4 sm:mb-5">
                  <h2 
                    className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-extrabold mr-2 sm:mr-4 transition-all duration-300 group-hover:brightness-110"
                    style={{ 
                      letterSpacing: '0.02em',
                      color: '#FFFFFF',
                      textShadow: '0 2px 4px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)'
                    }}
                  >
                    欢迎回来，{userProfile?.full_name || '用户'}！
                  </h2>
                  <span 
                    className="px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm border"
                    style={{
                      background: 'rgba(255,255,255,0.25)',
                      borderColor: 'rgba(255,255,255,0.3)',
                      color: '#FFFFFF',
                      textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.4)'
                    }}
                  >
                    {getMembershipTypeText(userProfile?.membership_type || 'standard')}
                  </span>
                </div>
                <p 
                  className="text-sm sm:text-base lg:text-lg mb-4 sm:mb-5 transition-all duration-300 group-hover:brightness-105"
                  style={{ 
                    letterSpacing: '0.3px',
                    lineHeight: '1.6',
                    color: '#FFF8F5',
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}
                >
                  祝您今天有美好的高尔夫体验
                </p>
                <div className="text-xs flex items-center space-x-4" style={{ color: 'rgba(255, 248, 245, 0.9)' }}>
                  <span className="flex items-center">
                    <div className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: 'rgba(255, 248, 245, 0.8)' }}></div>
                    会员数量：{memberCount}
                  </span>
                  <span className="flex items-center">
                    <div className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: 'rgba(255, 248, 245, 0.8)' }}></div>
                    加入日期：{new Date().toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
              
              {/* 日期显示区域 - 右上角 */}
              <div 
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  padding: 0,
                  borderRadius: '12px',
                  background: 'linear-gradient(145deg, rgba(255, 160, 200, 0.4), rgba(255, 111, 168, 0.35))',
                  boxShadow: '0 4px 10px rgba(255, 120, 180, 0.3), 0 0 0 1px rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  zIndex: 20,
                  minWidth: '90px',
                  minHeight: '90px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}
                className="date-card-new group/date"
              >
                {/* 日期内容 */}
                <div 
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: showDateAvatar ? 0 : 1,
                    transition: 'opacity 1s ease-in-out',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: '12px 16px',
                    pointerEvents: showDateAvatar ? 'none' : 'auto'
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FFFFFF', marginBottom: '4px' }}>{year}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '6px' }}>{season}</div>
                  <div style={{ width: '100%', height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.4)', margin: '4px 0' }}></div>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.95)', fontWeight: '500' }}>GOLF DAY</div>
                </div>

                {/* 头像内容 */}
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: showDateAvatar ? 1 : 0,
                    transition: 'opacity 1s ease-in-out',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: '3px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    pointerEvents: showDateAvatar ? 'auto' : 'none'
                  }}
                >
                  {userProfile?.avatar_url ? (
                    <img 
                      src={userProfile.avatar_url} 
                      alt={userProfile.full_name || '用户头像'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        objectPosition: `${userProfile.avatar_position_x || 50}% ${userProfile.avatar_position_y || 50}%`
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: 'rgba(255, 255, 255, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '8px'
                    }}>
                      <User className="w-8 h-8" style={{ color: 'rgba(255, 255, 255, 0.8)' }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* 添加hover效果的样式 */}
            <style>{`
              .welcome-card:hover {
                transform: translateY(-3px);
                box-shadow: inset 0 0 8px rgba(255,255,255,0.4), 0 8px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.15) !important;
              }
              
              @keyframes shimmer {
                0% {
                  transform: translateX(-100%) skewX(-15deg);
                }
                100% {
                  transform: translateX(200%) skewX(-15deg);
                }
              }
              
              .date-shimmer {
                animation: shimmer 1.5s infinite;
              }
              
              .date-card:hover {
                box-shadow: 0 6px 15px rgba(255, 120, 180, 0.4), 0 0 0 1px rgba(255,255,255,0.3) !important;
                transform: translateY(-2px);
              }
            `}</style>

            {/* Quick Actions */}
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 lg:mb-6">快捷操作</h3>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                <div 
                  onClick={() => setCurrentView('information')}
                  className="rounded-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-6 lg:py-16 shadow-md hover:shadow-lg active:scale-[0.98] active:shadow-sm transition-all duration-150 cursor-pointer group relative overflow-hidden border border-gray-200/30 select-none"
                  style={{ backgroundColor: 'rgba(249, 246, 244, 0.4)', touchAction: 'manipulation' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 max-w-[60%] sm:max-w-[65%] ml-2 sm:ml-4">
                      <div className="flex items-center justify-start mb-2 sm:mb-3 lg:mb-4">
                        <Bell className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 ml-3 sm:ml-4" style={{ color: '#92c648', fill: '#08bf60', fillOpacity: 1 }} strokeWidth={2} />
                      </div>
                      <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 flex items-center">
                        信息中心
                        <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">查看公告通知和重要信息</p>
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end" style={{ transform: 'translateX(-10%)' }}>
                      <img 
                        src="/golf_gesture1.png" 
                        alt="Golf gesture" 
                        className="h-full max-h-32 sm:max-h-40 lg:max-h-52 w-auto object-contain select-none pointer-events-none" 
                        draggable="false"
                        onDragStart={(e) => e.preventDefault()}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => setCurrentView('events')}
                  className="rounded-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-6 lg:py-16 shadow-md hover:shadow-lg active:scale-[0.98] active:shadow-sm transition-all duration-150 cursor-pointer group relative overflow-hidden border border-gray-200/30 select-none"
                  style={{ backgroundColor: 'rgba(249, 246, 244, 0.4)', touchAction: 'manipulation' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 max-w-[60%] sm:max-w-[65%] ml-2 sm:ml-4">
                      <div className="flex items-center justify-start mb-2 sm:mb-3 lg:mb-4">
                        <Calendar className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 ml-3 sm:ml-4" style={{ color: '#92c648', fill: '#07bc5d', fillOpacity: 1 }} strokeWidth={2} />
                      </div>
                      <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 flex items-center">
                        活动报名
                        <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">查看并报名参加俱乐部活动</p>
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end" style={{ transform: 'translateX(-10%)' }}>
                      <img 
                        src="/golf_gesture2.png" 
                        alt="Golf gesture" 
                        className="h-full max-h-32 sm:max-h-40 lg:max-h-52 w-auto object-contain select-none pointer-events-none" 
                        draggable="false"
                        onDragStart={(e) => e.preventDefault()}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setCurrentView('reviews')}
                  className="rounded-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-6 lg:py-16 shadow-md hover:shadow-lg active:scale-[0.98] active:shadow-sm transition-all duration-150 cursor-pointer group relative overflow-hidden border border-gray-200/30 select-none"
                  style={{ backgroundColor: 'rgba(249, 246, 244, 0.4)', touchAction: 'manipulation' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 max-w-[60%] sm:max-w-[65%] ml-2 sm:ml-4">
                      <div className="flex items-center justify-start mb-2 sm:mb-3 lg:mb-4">
                        <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 ml-3 sm:ml-4" style={{ color: '#92c648', fill: '#08bf60', fillOpacity: 1 }} strokeWidth={2} />
                      </div>
                      <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 flex items-center">
                        精彩回顾
                        <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">浏览活动精彩回顾文章</p>
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end" style={{ transform: 'translateX(-10%)' }}>
                      <img 
                        src="/golf_gesture3.png" 
                        alt="Golf gesture" 
                        className="h-full max-h-32 sm:max-h-40 lg:max-h-52 w-auto object-contain select-none pointer-events-none" 
                        draggable="false"
                        onDragStart={(e) => e.preventDefault()}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setCurrentView('scores')}
                  className="rounded-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-6 lg:py-16 shadow-md hover:shadow-lg active:scale-[0.98] active:shadow-sm transition-all duration-150 cursor-pointer group relative overflow-hidden border border-gray-200/30 select-none"
                  style={{ backgroundColor: 'rgba(249, 246, 244, 0.4)', touchAction: 'manipulation' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 max-w-[60%] sm:max-w-[65%] ml-2 sm:ml-4">
                      <div className="flex items-center justify-start mb-2 sm:mb-3 lg:mb-4">
                        <Trophy className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 ml-3 sm:ml-4" style={{ color: '#92c648', fill: '#08bf60', fillOpacity: 1 }} strokeWidth={2} />
                      </div>
                      <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 flex items-center">
                        成绩查询
                        <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">查看您的比赛成绩和排名</p>
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end" style={{ transform: 'translateX(-10%)' }}>
                      <img 
                        src="/golf_gesture4.png" 
                        alt="Golf gesture" 
                        className="h-full max-h-32 sm:max-h-40 lg:max-h-52 w-auto object-contain select-none pointer-events-none" 
                        draggable="false"
                        onDragStart={(e) => e.preventDefault()}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setCurrentView('investments')}
                  className="rounded-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-6 lg:py-16 shadow-md hover:shadow-lg active:scale-[0.98] active:shadow-sm transition-all duration-150 cursor-pointer group relative overflow-hidden border border-gray-200/30 select-none"
                  style={{ backgroundColor: 'rgba(249, 246, 244, 0.4)', touchAction: 'manipulation' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 max-w-[60%] sm:max-w-[65%] ml-2 sm:ml-4">
                      <div className="flex items-center justify-start mb-2 sm:mb-3 lg:mb-4">
                        <Heart className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 ml-3 sm:ml-4" style={{ color: '#92c648', fill: '#08bf60', fillOpacity: 1 }} strokeWidth={2} />
                      </div>
                      <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 flex items-center">
                        捐赠与赞助
                        <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">捐赠与赞助俱乐部建设发展</p>
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end" style={{ transform: 'translateX(-10%)' }}>
                      <img 
                        src="/golf_gesture5.png" 
                        alt="Golf gesture" 
                        className="h-full max-h-32 sm:max-h-40 lg:max-h-52 w-auto object-contain select-none pointer-events-none" 
                        draggable="false"
                        onDragStart={(e) => e.preventDefault()}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setCurrentView('expenses')}
                  className="rounded-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-6 lg:py-16 shadow-md hover:shadow-lg active:scale-[0.98] active:shadow-sm transition-all duration-150 cursor-pointer group relative overflow-hidden border border-gray-200/30 select-none"
                  style={{ backgroundColor: 'rgba(249, 246, 244, 0.4)', touchAction: 'manipulation' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 max-w-[60%] sm:max-w-[65%] ml-2 sm:ml-4">
                      <div className="flex items-center justify-start mb-2 sm:mb-3 lg:mb-4">
                        <Receipt className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 ml-3 sm:ml-4" style={{ color: '#92c648', fill: '#08bf60', fillOpacity: 1 }} strokeWidth={2} />
                      </div>
                      <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 flex items-center">
                        费用公示
                        <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">查看俱乐部财务支出</p>
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end" style={{ transform: 'translateX(-10%)' }}>
                      <img 
                        src="/golf_gesture6.png" 
                        alt="Golf gesture" 
                        className="h-full max-h-32 sm:max-h-40 lg:max-h-52 w-auto object-contain select-none pointer-events-none" 
                        draggable="false"
                        onDragStart={(e) => e.preventDefault()}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setCurrentView('members')}
                  className="rounded-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-6 lg:py-16 shadow-md hover:shadow-lg active:scale-[0.98] active:shadow-sm transition-all duration-150 cursor-pointer group relative overflow-hidden border border-gray-200/30 select-none"
                  style={{ backgroundColor: 'rgba(249, 246, 244, 0.4)', touchAction: 'manipulation' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 max-w-[60%] sm:max-w-[65%] ml-2 sm:ml-4">
                      <div className="flex items-center justify-start mb-2 sm:mb-3 lg:mb-4">
                        <Users className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 ml-3 sm:ml-4" style={{ color: '#92c648', fill: '#08bf60', fillOpacity: 1 }} strokeWidth={2} />
                      </div>
                      <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 flex items-center">
                        会员照片
                        <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">浏览所有会员照片</p>
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end" style={{ transform: 'translateX(-10%)' }}>
                      <img 
                        src="/golf_gesture7.png" 
                        alt="Golf gesture" 
                        className="h-full max-h-32 sm:max-h-40 lg:max-h-52 w-auto object-contain select-none pointer-events-none" 
                        draggable="false"
                        onDragStart={(e) => e.preventDefault()}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              {/* 即将举行的活动 */}
              <div className="rounded-2xl p-4 sm:p-6 border border-gray-300/50" style={{ backgroundColor: 'rgba(249, 246, 244, 0.75)', boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.06), 0 1px 4px 0 rgba(0, 0, 0, 0.04)' }}>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 flex items-center">
                    <div className="w-1 h-6 bg-[#F15B98] mr-3"></div>
                    即将举行的活动
                  </h3>
                  <button 
                    onClick={() => setCurrentView('events')}
                    className="text-[#F15B98] hover:text-[#F15B98]/80 font-bold text-sm sm:text-base flex items-center"
                  >
                    查看全部
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                {loading ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F15B98] mx-auto"></div>
                    <p className="text-gray-500 mt-2 text-sm">加载中...</p>
                  </div>
                ) : upcomingEvents.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => (
                      <div key={event.id} className="flex items-start justify-between p-4 rounded-lg" style={{ backgroundColor: 'rgba(252, 250, 248, 0.95)' }}>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-sm sm:text-base mb-1">{event.title}</div>
                          <div className="text-xs sm:text-sm text-gray-600 mb-1">
                            日期: {new Date(event.start_time).toLocaleDateString('zh-CN')}
                          </div>
                          <div className="text-xs sm:text-sm text-[#F15B98]">
                            {event.location || '地点未设置'} · {event.max_participants || 0}人
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="text-center pt-2">
                      <button 
                        onClick={() => setCurrentView('events')}
                        className="text-[#F15B98] hover:text-[#F15B98]/80 font-bold text-sm"
                      >
                        查看更多活动
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <p className="text-gray-500 mb-3 sm:mb-4 text-sm sm:text-base">暂无即将举行的活动</p>
                    <button 
                      onClick={() => setCurrentView('events')}
                      className="text-[#F15B98] hover:text-[#F15B98]/80 font-bold text-sm sm:text-base"
                    >
                      查看更多活动
                    </button>
                  </div>
                )}
              </div>

              {/* 最新发布的成绩活动 */}
              <div className="rounded-2xl p-4 sm:p-6 border border-gray-300/50" style={{ backgroundColor: 'rgba(249, 246, 244, 0.75)', boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.06), 0 1px 4px 0 rgba(0, 0, 0, 0.04)' }}>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 flex items-center">
                    <div className="w-1 h-6 bg-[#F15B98] mr-3"></div>
                    最新发布的成绩活动
                  </h3>
                  <button 
                    onClick={() => setCurrentView('scores')}
                    className="text-[#F15B98] hover:text-[#F15B98]/80 font-bold text-sm sm:text-base flex items-center"
                  >
                    查看全部
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                {loading ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F15B98] mx-auto"></div>
                    <p className="text-gray-500 mt-2 text-sm">加载中...</p>
                  </div>
                ) : recentScores.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {recentScores.map((score) => (
                      <div key={score.id} className="flex items-start justify-between p-4 rounded-lg" style={{ backgroundColor: 'rgba(252, 250, 248, 0.95)' }}>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-sm sm:text-base mb-1">
                            {score.competition_name || '比赛'}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600">
                            日期: {new Date(score.competition_date).toLocaleDateString('zh-CN')}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="text-center pt-3 sm:pt-4">
                      <button 
                        onClick={() => setCurrentView('scores')}
                        className="text-[#F15B98] hover:text-[#F15B98]/80 font-medium text-sm sm:text-base"
                      >
                        查看完整成绩单
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <p className="text-gray-500 mb-3 sm:mb-4 text-sm sm:text-base">暂无成绩记录</p>
                    <button 
                      onClick={() => setCurrentView('scores')}
                      className="text-[#F15B98] hover:text-[#F15B98]/80 font-medium text-sm sm:text-base"
                    >
                      查看成绩查询
                    </button>
                  </div>
                )}
              </div>

              {/* 最新捐赠与赞助 */}
              <div className="rounded-2xl p-4 sm:p-6 border border-gray-300/50" style={{ backgroundColor: 'rgba(249, 246, 244, 0.75)', boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.06), 0 1px 4px 0 rgba(0, 0, 0, 0.04)' }}>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 flex items-center">
                    <div className="w-1 h-6 bg-[#F15B98] mr-3"></div>
                    最新捐赠与赞助
                  </h3>
                  <button 
                    onClick={() => setCurrentView('investments')}
                    className="text-[#F15B98] hover:text-[#F15B98]/80 font-bold text-sm sm:text-base flex items-center"
                  >
                    查看全部
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                {loading ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F15B98] mx-auto"></div>
                    <p className="text-gray-500 mt-2 text-sm">加载中...</p>
                  </div>
                ) : recentInvestments.length > 0 ? (
                  <div className="space-y-3">
                    {recentInvestments.map((investment) => (
                      <div key={investment.id} className="flex items-start justify-between p-4 rounded-lg" style={{ backgroundColor: 'rgba(252, 250, 248, 0.95)' }}>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-sm sm:text-base mb-1">{investment.title}</div>
                          <div className="text-xs sm:text-sm text-gray-600">
                            日期: {new Date(investment.created_at).toLocaleDateString('zh-CN')}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="text-center pt-2">
                      <button 
                        onClick={() => setCurrentView('investments')}
                        className="text-[#F15B98] hover:text-[#F15B98]/80 font-medium text-sm"
                      >
                        查看投资项目
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <p className="text-gray-500 mb-3 sm:mb-4 text-sm sm:text-base">暂无投资项目</p>
                    <button 
                      onClick={() => setCurrentView('investments')}
                      className="text-[#F15B98] hover:text-[#F15B98]/80 font-medium text-sm sm:text-base"
                    >
                      查看投资项目
                    </button>
                  </div>
                )}
              </div>

              {/* 最新费用公示 */}
              <div className="rounded-2xl p-4 sm:p-6 border border-gray-300/50" style={{ backgroundColor: 'rgba(249, 246, 244, 0.75)', boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.06), 0 1px 4px 0 rgba(0, 0, 0, 0.04)' }}>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 flex items-center">
                    <div className="w-1 h-6 bg-[#F15B98] mr-3"></div>
                    最新费用公示
                  </h3>
                  <button 
                    onClick={() => setCurrentView('expenses')}
                    className="text-[#F15B98] hover:text-[#F15B98]/80 font-bold text-sm sm:text-base flex items-center"
                  >
                    查看全部
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                {loading ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F15B98] mx-auto"></div>
                    <p className="text-gray-500 mt-2 text-sm">加载中...</p>
                  </div>
                ) : recentExpenses.length > 0 ? (
                  <div className="space-y-3">
                    {recentExpenses.map((expense) => (
                      <div key={expense.id} className="flex items-start justify-between p-4 rounded-lg" style={{ backgroundColor: 'rgba(252, 250, 248, 0.95)' }}>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-sm sm:text-base mb-1">{expense.title || '费用项目'}</div>
                          <div className="text-xs sm:text-sm text-gray-600">
                            日期: {new Date(expense.created_at).toLocaleDateString('zh-CN')}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="text-center pt-2">
                      <button 
                        onClick={() => setCurrentView('expenses')}
                        className="text-[#F15B98] hover:text-[#F15B98]/80 font-bold text-sm"
                      >
                        查看费用公示
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <p className="text-gray-500 mb-3 sm:mb-4 text-sm sm:text-base">暂无费用公示</p>
                    <button 
                      onClick={() => setCurrentView('expenses')}
                      className="text-[#F15B98] hover:text-[#F15B98]/80 font-bold text-sm sm:text-base"
                    >
                      查看费用公示
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : currentView === 'events' ? (
          <div>
            <div className="mb-6 text-center">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">活动报名</h2>
              <p className="text-gray-600">参加俱乐部精彩活动，与球友们一起享受高尔夫乐趣</p>
            </div>
            <EventList onEventSelect={setSelectedEvent} user={user} />
          </div>
        ) : currentView === 'scores' ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">成绩查询</h2>
              <p className="text-gray-600">查看您的比赛成绩和排名</p>
            </div>
            <UserScoreQuery />
          </div>
        ) : currentView === 'investments' ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">捐赠与赞助</h2>
              <p className="text-gray-600">支持俱乐部建设和发展，共创美好未来</p>
            </div>
            <InvestmentList onProjectSelect={setSelectedInvestment} userId={user?.id} />
          </div>
        ) : currentView === 'expenses' ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">费用公示</h2>
              <p className="text-gray-600">俱乐部财务透明，费用支出公开</p>
            </div>
            <ExpenseList />
          </div>
        ) : currentView === 'reviews' ? (
          <div className="space-y-6">
            <EventReviews />
          </div>
        ) : currentView === 'information' ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">信息中心</h2>
              <p className="text-gray-600">查看俱乐部公告、通知、重要资料和规则章程</p>
            </div>
            <InformationCenterList onItemSelect={setSelectedInformationItem} />
          </div>
        ) : currentView === 'admin' && isAdmin ? (
          <AdminPanel adminMenuVisible={adminMenuVisible} />
        ) : null}
      </main>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
      />

      {/* Change Password Modal */}
      {changePasswordModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80] p-4"
          onClick={() => setChangePasswordModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">修改密码</h2>
                <button
                  onClick={() => {
                    setChangePasswordModalOpen(false)
                    setOldPassword('')
                    setNewPassword('')
                    setConfirmPassword('')
                    setPasswordChangeMessage('')
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault()
                setPasswordChangeLoading(true)
                setPasswordChangeMessage('')

                try {
                  if (!oldPassword || !newPassword || !confirmPassword) {
                    setPasswordChangeMessage('请填写所有密码字段')
                    setPasswordChangeLoading(false)
                    return
                  }

                  if (newPassword !== confirmPassword) {
                    setPasswordChangeMessage('新密码和确认密码不一致')
                    setPasswordChangeLoading(false)
                    return
                  }

                  if (newPassword.length < 6) {
                    setPasswordChangeMessage('新密码长度至少为6位')
                    setPasswordChangeLoading(false)
                    return
                  }

                  if (oldPassword === newPassword) {
                    setPasswordChangeMessage('新密码不能与旧密码相同')
                    setPasswordChangeLoading(false)
                    return
                  }

                  if (!user?.email) {
                    setPasswordChangeMessage('无法获取用户邮箱')
                    setPasswordChangeLoading(false)
                    return
                  }

                  // 先验证旧密码是否正确（通过尝试登录）
                  const { error: verifyError } = await supabase.auth.signInWithPassword({
                    email: user.email,
                    password: oldPassword,
                  })

                  if (verifyError) {
                    setPasswordChangeMessage('旧密码错误，请重新输入')
                    setPasswordChangeLoading(false)
                    return
                  }

                  // 旧密码正确，更新密码
                  const { error: updateError } = await supabase.auth.updateUser({
                    password: newPassword
                  })

                  if (updateError) throw updateError

                  // 如果选择了记住新密码，保存到localStorage
                  if (rememberNewPassword) {
                    localStorage.setItem('rememberedPassword', newPassword)
                    localStorage.setItem('rememberPasswordChecked', 'true')
                  } else {
                    localStorage.removeItem('rememberedPassword')
                    localStorage.removeItem('rememberPasswordChecked')
                  }

                  setPasswordChangeMessage('密码修改成功！系统将自动退出，请使用新密码重新登录。')

                  // 等待2秒后登出并返回登录页面
                  setTimeout(async () => {
                    await supabase.auth.signOut()
                    setChangePasswordModalOpen(false)
                    setOldPassword('')
                    setNewPassword('')
                    setConfirmPassword('')
                    setPasswordChangeMessage('')
                  }, 2000)

                } catch (error: any) {
                  console.error('修改密码失败:', error)
                  setPasswordChangeMessage(error.message || '修改密码失败，请重试')
                } finally {
                  setPasswordChangeLoading(false)
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    旧密码
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showOldPassword ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-[#F15B98] transition-all"
                      placeholder="请输入您的旧密码"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showOldPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    新密码
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-[#F15B98] transition-all"
                      placeholder="请输入您的新密码（至少6位）"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    确认新密码
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-[#F15B98] transition-all"
                      placeholder="请再次输入新密码"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    id="remember-new-password-checkbox"
                    type="checkbox"
                    checked={rememberNewPassword}
                    onChange={(e) => setRememberNewPassword(e.target.checked)}
                    className="h-4 w-4 text-[#F15B98] focus:ring-[#F15B98] border-gray-300 rounded"
                  />
                  <label htmlFor="remember-new-password-checkbox" className="ml-2 block text-sm text-gray-700">
                    记住新密码
                  </label>
                </div>

                {passwordChangeMessage && (
                  <div className={`p-3 rounded-lg text-sm border ${
                    passwordChangeMessage.includes('成功')
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {passwordChangeMessage}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setChangePasswordModalOpen(false)
                      setOldPassword('')
                      setNewPassword('')
                      setConfirmPassword('')
                      setPasswordChangeMessage('')
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={passwordChangeLoading}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={passwordChangeLoading || !oldPassword || !newPassword || !confirmPassword}
                    className="px-4 py-2 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {passwordChangeLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                        修改中...
                      </>
                    ) : (
                      '确认修改'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          user={user}
          userProfile={userProfile}
        />
      )}

      {/* Poster Detail Modal - 暂时隐藏 */}
      {/* {selectedPoster && (
        <PosterDetail
          poster={selectedPoster}
          onClose={() => setSelectedPoster(null)}
        />
      )} */}

      {selectedScore && (
        <ScoreDetail
          score={selectedScore}
          onClose={() => setSelectedScore(null)}
        />
      )}

      {selectedInvestment && (
        <InvestmentDetail
          project={selectedInvestment}
          onClose={() => setSelectedInvestment(null)}
          user={user}
        />
      )}

      {/* Information Center Detail Modal */}
      {selectedInformationItem && (
        <InformationCenterDetail
          item={selectedInformationItem}
          onClose={() => setSelectedInformationItem(null)}
        />
      )}
    </div>
  )
}