import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, Trophy, Image, Heart, LogOut, User, Menu, X, Settings, ChevronDown, ArrowRight, Receipt, BookOpen, Bell } from 'lucide-react'
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
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [adminMenuVisible, setAdminMenuVisible] = useState(true)
  const [currentView, setCurrentView] = useState<'dashboard' | 'events' | 'posters' | 'scores' | 'investments' | 'expenses' | 'reviews' | 'information' | 'admin'>('dashboard')

  // 监听用户菜单状态变化
  useEffect(() => {
    if (!userMenuOpen && currentView === 'admin') {
      setAdminMenuVisible(true)
    }
  }, [userMenuOpen, currentView])
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

  // 检查是否为管理员
  const isAdmin = userProfile?.role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            {/* Logo and Brand */}
            <div 
              className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setCurrentView('dashboard')}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 border-2 border-golf-600 rounded-full flex items-center justify-center">
                <img 
                  src="/golf-club-logo.png" 
                  alt="绿茵高尔夫俱乐部" 
                  className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 object-contain"
                />
              </div>
              <div className="ml-2 sm:ml-3">
                <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900">绿茵高尔夫俱乐部</h1>
                <p className="text-xs text-golf-600 hidden md:block">绿色高尔夫俱乐部</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden lg:flex space-x-4 xl:space-x-8">
              <button 
                onClick={() => setCurrentView('dashboard')}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'dashboard' 
                    ? 'bg-golf-600 text-white' 
                    : 'text-gray-700 hover:text-golf-600'
                }`}
              >
                首页
              </button>
              <button
                onClick={() => setCurrentView('information')}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'information'
                    ? 'bg-golf-600 text-white'
                    : 'text-gray-700 hover:text-golf-600'
                }`}
              >
                信息中心
              </button>
              <button 
                onClick={() => setCurrentView('events')}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'events' 
                    ? 'bg-golf-600 text-white' 
                    : 'text-gray-700 hover:text-golf-600'
                }`}
              >
                活动报名
              </button>
              <button
                onClick={() => setCurrentView('reviews')}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'reviews'
                    ? 'bg-golf-600 text-white'
                    : 'text-gray-700 hover:text-golf-600'
                }`}
              >
                精彩回顾
              </button>
              <button
                onClick={() => setCurrentView('scores')}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'scores'
                    ? 'bg-golf-600 text-white'
                    : 'text-gray-700 hover:text-golf-600'
                }`}
              >
                成绩查询
              </button>
              <button
                onClick={() => setCurrentView('investments')}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'investments'
                    ? 'bg-golf-600 text-white'
                    : 'text-gray-700 hover:text-golf-600'
                }`}
              >
                捐赠与赞助
              </button>
              <button
                onClick={() => setCurrentView('expenses')}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'expenses'
                    ? 'bg-golf-600 text-white'
                    : 'text-gray-700 hover:text-golf-600'
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
                      ? 'bg-golf-600 text-white' 
                      : 'text-gray-700 hover:text-golf-600'
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
                className="lg:hidden text-gray-400 hover:text-gray-600 p-1 sm:p-2"
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

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 py-4">
              <div className="flex flex-col space-y-2">
                <button 
                  onClick={() => {
                    setCurrentView('dashboard')
                    setMobileMenuOpen(false)
                  }}
                  className={`px-3 py-2 rounded-lg font-medium text-sm text-left transition-colors ${
                    currentView === 'dashboard' 
                      ? 'bg-golf-600 text-white' 
                      : 'text-gray-700 hover:text-golf-600'
                  }`}
                >
                  首页
                </button>
                <button
                  onClick={() => {
                    setCurrentView('information')
                    setMobileMenuOpen(false)
                  }}
                  className={`px-3 py-2 rounded-lg font-medium text-sm text-left transition-colors ${
                    currentView === 'information'
                      ? 'bg-golf-600 text-white'
                      : 'text-gray-700 hover:text-golf-600'
                  }`}
                >
                  信息中心
                </button>
                <button 
                  onClick={() => {
                    setCurrentView('events')
                    setMobileMenuOpen(false)
                  }}
                  className={`px-3 py-2 rounded-lg font-medium text-sm text-left transition-colors ${
                    currentView === 'events' 
                      ? 'bg-golf-600 text-white' 
                      : 'text-gray-700 hover:text-golf-600'
                  }`}
                >
                  活动报名
                </button>
                <button
                  onClick={() => {
                    setCurrentView('reviews')
                    setMobileMenuOpen(false)
                  }}
                  className={`px-3 py-2 rounded-lg font-medium text-sm text-left transition-colors ${
                    currentView === 'reviews'
                      ? 'bg-golf-600 text-white'
                      : 'text-gray-700 hover:text-golf-600'
                  }`}
                >
                  活动回顾
                </button>
                <button
                  onClick={() => {
                    setCurrentView('scores')
                    setMobileMenuOpen(false)
                  }}
                  className={`px-3 py-2 rounded-lg font-medium text-sm text-left transition-colors ${
                    currentView === 'scores'
                      ? 'bg-golf-600 text-white'
                      : 'text-gray-700 hover:text-golf-600'
                  }`}
                >
                  成绩查询
                </button>
                <button
                  onClick={() => {
                    setCurrentView('investments')
                    setMobileMenuOpen(false)
                  }}
                  className={`px-3 py-2 rounded-lg font-medium text-sm text-left transition-colors ${
                    currentView === 'investments'
                      ? 'bg-golf-600 text-white'
                      : 'text-gray-700 hover:text-golf-600'
                  }`}
                >
                  捐赠与赞助
                </button>
                <button
                  onClick={() => {
                    setCurrentView('expenses')
                    setMobileMenuOpen(false)
                  }}
                  className={`px-3 py-2 rounded-lg font-medium text-sm text-left transition-colors ${
                    currentView === 'expenses'
                      ? 'bg-golf-600 text-white'
                      : 'text-gray-700 hover:text-golf-600'
                  }`}
                >
                  费用公示
                </button>
                <button
                  onClick={() => {
                    setCurrentView('information')
                    setMobileMenuOpen(false)
                  }}
                  className={`px-3 py-2 rounded-lg font-medium text-sm text-left transition-colors ${
                    currentView === 'information'
                      ? 'bg-golf-600 text-white'
                      : 'text-gray-700 hover:text-golf-600'
                  }`}
                >
                  信息中心
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => {
                      setCurrentView('admin')
                      setMobileMenuOpen(false)
                      setAdminMenuVisible(true)
                    }}
                    className={`px-3 py-2 rounded-lg font-medium text-sm text-left transition-colors ${
                      currentView === 'admin' 
                        ? 'bg-golf-600 text-white' 
                        : 'text-gray-700 hover:text-golf-600'
                    }`}
                  >
                    管理后台
                  </button>
                )}
                

                {/* Mobile User Info */}
                <div className="flex items-center space-x-3 px-3 py-2 border-t border-gray-200 mt-2 pt-4 md:hidden">
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
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {userProfile?.full_name || '未设置姓名'}
                    </div>
                    <div className="text-xs text-gray-500">
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
                  className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:text-golf-600 font-medium text-sm text-left w-full md:hidden"
                >
                  <User className="w-4 h-4" />
                  <span>个人资料</span>
                </button>
                
                {/* Mobile Admin Button */}
                {isAdmin && (
                  <button
                    onClick={() => {
                      setCurrentView('admin')
                      setMobileMenuOpen(false)
                    }}
                    className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:text-golf-600 font-medium text-sm text-left w-full md:hidden"
                  >
                    <Settings className="w-4 h-4" />
                    <span>管理后台</span>
                  </button>
                )}
                
                {/* Mobile Logout Button */}
                <button
                  onClick={() => {
                    handleSignOut()
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:text-golf-600 font-medium text-sm text-left w-full md:hidden"
                >
                  <LogOut className="w-4 h-4" />
                  <span>退出登录</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-1 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {currentView === 'dashboard' ? (
          <>
            {/* Welcome Banner - 高尔夫主题设计 */}
            <div className="relative rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8 text-white overflow-hidden shadow-2xl">
              {/* 背景渐变 + 草地纹理 */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-green-700 to-green-800"></div>
              
              {/* 草地纹理叠加层 */}
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
              
              {/* 高尔夫球轨迹线条 */}
              <div className="absolute inset-0">
                <svg className="w-full h-full opacity-30" viewBox="0 0 400 200">
                  <path 
                    d="M50,150 Q150,50 250,100 T350,80" 
                    stroke="rgba(255,255,255,0.3)" 
                    strokeWidth="2" 
                    fill="none"
                    strokeDasharray="5,5"
                  />
                  <path 
                    d="M80,160 Q180,60 280,110 T380,90" 
                    stroke="rgba(255,255,255,0.2)" 
                    strokeWidth="1.5" 
                    fill="none"
                    strokeDasharray="3,7"
                  />
                </svg>
              </div>
              
              
              {/* 高尔夫球窝点装饰 */}
              <div className="absolute top-4 right-4 w-8 h-8 sm:w-12 sm:h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 sm:w-6 sm:h-6 bg-white bg-opacity-40 rounded-full"></div>
              </div>
              
              
              {/* 主要内容 */}
              <div className="relative z-10">
                <div className="flex items-center mb-4">
                  <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold mr-2 sm:mr-4">
                    欢迎回来，{userProfile?.full_name || '用户'}！
                  </h2>
                  <span className="bg-white bg-opacity-25 px-3 py-1 rounded-full text-xs font-medium shadow-lg">
                    {getMembershipTypeText(userProfile?.membership_type || 'standard')}
                  </span>
                </div>
                <p className="text-green-100 text-sm sm:text-base lg:text-lg mb-3 sm:mb-4">
                  祝您今天有美好的高尔夫体验
                </p>
                <div className="text-xs text-green-100 flex items-center space-x-4">
                  <span className="flex items-center">
                    <div className="w-1.5 h-1.5 bg-green-200 rounded-full mr-2"></div>
                    会员数量：{memberCount}
                  </span>
                  <span className="flex items-center">
                    <div className="w-1.5 h-1.5 bg-green-200 rounded-full mr-2"></div>
                    加入日期：{new Date().toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
              
              {/* 日期显示区域 - 现代设计 */}
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-white bg-opacity-25 rounded-xl p-3 sm:p-4 text-center shadow-lg backdrop-blur-sm">
                <div className="text-sm sm:text-lg lg:text-2xl font-bold">{year}</div>
                <div className="text-xs text-green-100">{season}</div>
                <div className="w-full h-0.5 bg-white bg-opacity-30 my-1"></div>
                <div className="text-xs text-green-200 font-medium">GOLF DAY</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 lg:mb-6">快捷操作</h3>
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
                <div 
                  onClick={() => setCurrentView('information')}
                  className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-3 lg:mb-4">
                    <Bell className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
                  </div>
                  <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 flex items-center">
                    信息中心
                    <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">查看公告通知和重要信息</p>
                </div>

                <div 
                  onClick={() => setCurrentView('events')}
                  className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-blue-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-3 lg:mb-4">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
                  </div>
                  <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 flex items-center">
                    活动报名
                    <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">查看并报名参加俱乐部活动</p>
                </div>

                <div
                  onClick={() => setCurrentView('reviews')}
                  className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-orange-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-3 lg:mb-4">
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
                  </div>
                  <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 flex items-center">
                    精彩回顾
                    <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">浏览活动精彩回顾文章</p>
                </div>

                <div
                  onClick={() => setCurrentView('scores')}
                  className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-yellow-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-3 lg:mb-4">
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
                  </div>
                  <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 flex items-center">
                    成绩查询
                    <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">查看您的比赛成绩和排名</p>
                </div>

                <div
                  onClick={() => setCurrentView('investments')}
                  className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-red-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-3 lg:mb-4">
                    <Heart className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
                  </div>
                  <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 flex items-center">
                    捐赠与赞助
                    <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">捐赠与赞助俱乐部建设发展</p>
                </div>

                <div
                  onClick={() => setCurrentView('expenses')}
                  className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-green-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-3 lg:mb-4">
                    <Receipt className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
                  </div>
                  <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 flex items-center">
                    费用公示
                    <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">查看俱乐部财务支出</p>
                </div>
              </div>
            </div>

            {/* Main Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              {/* 即将举行的活动 */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 flex items-center">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 mr-2" />
                    即将举行的活动
                  </h3>
                  <button 
                    onClick={() => setCurrentView('events')}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm sm:text-base flex items-center"
                  >
                    查看全部
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                {loading ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2 text-sm">加载中...</p>
                  </div>
                ) : upcomingEvents.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                            <Calendar className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{event.title}</div>
                            <div className="text-xs text-gray-600">
                              {new Date(event.start_time).toLocaleDateString('zh-CN')}
                            </div>
                            <div className="text-xs text-golf-600 font-medium mt-1">
                              {event.event_type}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-blue-600">{event.location}</div>
                          <div className="text-xs text-gray-600">{event.max_participants}人</div>
                        </div>
                      </div>
                    ))}
                    <div className="text-center pt-2">
                      <button 
                        onClick={() => setCurrentView('events')}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
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
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm sm:text-base"
                    >
                      查看更多活动
                    </button>
                  </div>
                )}
              </div>

              {/* 最新发布的成绩活动 */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 flex items-center">
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 mr-2" />
                    最新发布的成绩活动
                  </h3>
                  <button 
                    onClick={() => setCurrentView('scores')}
                    className="text-yellow-600 hover:text-yellow-700 font-medium text-sm sm:text-base flex items-center"
                  >
                    查看全部
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                {loading ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2 text-sm">加载中...</p>
                  </div>
                ) : recentScores.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {recentScores.map((score) => (
                      <div key={score.id} className="flex items-center justify-between p-3 sm:p-4 bg-yellow-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-500 rounded-full flex items-center justify-center mr-2 sm:mr-3">
                            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm sm:text-base">
                              {score.competition_name || '比赛'}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600">
                              {new Date(score.competition_date).toLocaleDateString('zh-CN')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg sm:text-2xl font-bold text-yellow-600">{score.total_strokes}</div>
                          <div className="text-xs sm:text-sm text-gray-600">{score.holes_played}洞</div>
                        </div>
                      </div>
                    ))}
                    <div className="text-center pt-3 sm:pt-4">
                      <button 
                        onClick={() => setCurrentView('scores')}
                        className="text-yellow-600 hover:text-yellow-700 font-medium text-sm sm:text-base"
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
                      className="text-yellow-600 hover:text-yellow-700 font-medium text-sm sm:text-base"
                    >
                      查看成绩查询
                    </button>
                  </div>
                )}
              </div>

              {/* 最新捐赠与赞助 */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 flex items-center">
                    <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 mr-2" />
                    最新捐赠与赞助
                  </h3>
                  <button 
                    onClick={() => setCurrentView('investments')}
                    className="text-red-600 hover:text-red-700 font-medium text-sm sm:text-base flex items-center"
                  >
                    查看全部
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                {loading ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2 text-sm">加载中...</p>
                  </div>
                ) : recentInvestments.length > 0 ? (
                  <div className="space-y-3">
                    {recentInvestments.map((investment) => (
                      <div key={investment.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
                            <Heart className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{investment.title}</div>
                            <div className="text-xs text-gray-600">
                              目标: CA${investment.target_amount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-red-600">
                            CA${(investment.current_amount || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600">
                            {Math.round(((investment.current_amount || 0) / investment.target_amount) * 100)}%
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="text-center pt-2">
                      <button 
                        onClick={() => setCurrentView('investments')}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
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
                      className="text-red-600 hover:text-red-700 font-medium text-sm sm:text-base"
                    >
                      查看投资项目
                    </button>
                  </div>
                )}
              </div>

              {/* 最新费用公示 */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 flex items-center">
                    <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 mr-2" />
                    最新费用公示
                  </h3>
                  <button 
                    onClick={() => setCurrentView('expenses')}
                    className="text-green-600 hover:text-green-700 font-medium text-sm sm:text-base flex items-center"
                  >
                    查看全部
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                {loading ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2 text-sm">加载中...</p>
                  </div>
                ) : recentExpenses.length > 0 ? (
                  <div className="space-y-3">
                    {recentExpenses.map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                            <Receipt className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{expense.title || '费用项目'}</div>
                            <div className="text-xs text-gray-600">
                              {new Date(expense.created_at).toLocaleDateString('zh-CN')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-green-600">
                            ¥{expense.amount?.toLocaleString() || '0'}
                          </div>
                          <div className="text-xs text-gray-600">{expense.category || '其他'}</div>
                        </div>
                      </div>
                    ))}
                    <div className="text-center pt-2">
                      <button 
                        onClick={() => setCurrentView('expenses')}
                        className="text-green-600 hover:text-green-700 font-medium text-sm"
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
                      className="text-green-600 hover:text-green-700 font-medium text-sm sm:text-base"
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
            <div className="mb-6">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">活动报名</h2>
              <p className="text-gray-600">参加俱乐部精彩活动，与球友们一起享受高尔夫乐趣</p>
            </div>
            <EventList onEventSelect={setSelectedEvent} user={user} />
          </div>
        ) : currentView === 'scores' ? (
          <UserScoreQuery />
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