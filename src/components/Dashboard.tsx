import React, { useState, useEffect } from 'react'
import { Calendar, Trophy, Image, Heart, LogOut, User, Menu, X, Settings, ChevronDown, ArrowRight, Receipt, BookOpen } from 'lucide-react'
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
import AdminAnalytics from './AdminAnalytics'
import { Event } from '../types'

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
  const [currentView, setCurrentView] = useState<'dashboard' | 'events' | 'posters' | 'scores' | 'investments' | 'expenses' | 'reviews' | 'admin'>('dashboard')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedPoster, setSelectedPoster] = useState<Poster | null>(null)
  const [selectedScore, setSelectedScore] = useState<Score | null>(null)
  const [selectedInvestment, setSelectedInvestment] = useState<InvestmentProject | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [recentScores, setRecentScores] = useState<Score[]>([])
  const [recentInvestments, setRecentInvestments] = useState<InvestmentProject[]>([])
  const [recentExpenses, setRecentExpenses] = useState<any[]>([])
  const [recentPosters, setRecentPosters] = useState<Poster[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchUserProfile()
      fetchMemberCount()
      fetchDashboardData()
    }
  }, [user])

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
      // 查询状态为 'upcoming' 的活动，或者查询未来日期的活动
      // console.log('查询即将举行的活动...')
      
      const today = new Date().toISOString().split('T')[0]
      
      // 先尝试查询状态为 'upcoming' 的活动
      let { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'upcoming')
        .limit(2)
      
      // console.log('upcoming状态活动查询结果:', { events, eventsError })
      
      // 如果没有找到，尝试查询未来日期的活动
      if (!events || events.length === 0) {
        // console.log('没有找到upcoming状态的活动，尝试查询未来日期的活动...')
        // console.log('今天日期:', today)
        
        const { data: futureEvents, error: futureError } = await supabase
          .from('events')
          .select('*')
          .gte('start_time', today)
          .limit(2)
        
        // console.log('未来日期活动查询结果:', { futureEvents, futureError })
        events = futureEvents
        eventsError = futureError
      }
      
      // 如果还是没有找到，尝试查询所有活动看看数据结构
      if (!events || events.length === 0) {
        // console.log('没有找到未来日期的活动，查询所有活动看看数据结构...')
        const { data: allEvents, error: allError } = await supabase
          .from('events')
          .select('*')
          .limit(5)
        
        // console.log('所有活动查询结果:', { allEvents, allError })
        // console.log('所有活动的状态和日期:', allEvents?.map(e => ({ 
        //   id: e.id, 
        //   title: e.title, 
        //   status: e.status, 
        //   start_time: e.start_time,
        //   created_at: e.created_at 
        // })))
      }
      
      // 如果还是没有找到，就不显示任何活动
      if (!events || events.length === 0) {
        // console.log('没有找到即将举行的活动')
        events = []
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

      // 获取最近的投资项目 - 显示2个
      const { data: investments, error: investmentsError } = await supabase
        .from('investment_projects')
        .select('*')
        .limit(2)
      // console.log('投资项目查询结果:', { investments, investmentsError })
      setRecentInvestments(investments || [])

      // 获取最近的费用公示 - 显示2个
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .limit(2)
      // console.log('费用公示查询结果:', { expenses, expensesError })
      setRecentExpenses(expenses || [])

      // 获取最近的海报 - 显示2个
      const { data: posters, error: postersError } = await supabase
        .from('posters')
        .select('*')
        .limit(2)
      // console.log('海报查询结果:', { posters, postersError })
      setRecentPosters(posters || [])

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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            {/* Logo and Brand */}
            <div 
              className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setCurrentView('dashboard')}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-golf-600 rounded-full flex items-center justify-center">
                <span className="text-sm sm:text-lg lg:text-xl font-bold text-white">B</span>
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
                onClick={() => setCurrentView('posters')}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'posters'
                    ? 'bg-golf-600 text-white'
                    : 'text-gray-700 hover:text-golf-600'
                }`}
              >
                海报展示
              </button>
              <button
                onClick={() => setCurrentView('investments')}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'investments'
                    ? 'bg-golf-600 text-white'
                    : 'text-gray-700 hover:text-golf-600'
                }`}
              >
                投资支持
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
                  onClick={() => setCurrentView('admin')}
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
              <div className="relative hidden md:block">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
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
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
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
                        onClick={() => {
                          setProfileModalOpen(true)
                          setUserMenuOpen(false)
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <User className="w-4 h-4 mr-3" />
                        个人资料
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setCurrentView('admin')
                            setUserMenuOpen(false)
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="w-4 h-4 mr-3" />
                          管理后台
                        </button>
                      )}
                      <button
                        onClick={() => {
                          handleSignOut()
                          setUserMenuOpen(false)
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
                  className="fixed inset-0 z-40" 
                  onClick={() => setUserMenuOpen(false)}
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
                    setCurrentView('posters')
                    setMobileMenuOpen(false)
                  }}
                  className={`px-3 py-2 rounded-lg font-medium text-sm text-left transition-colors ${
                    currentView === 'posters'
                      ? 'bg-golf-600 text-white'
                      : 'text-gray-700 hover:text-golf-600'
                  }`}
                >
                  海报展示
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
                  投资支持
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
                {isAdmin && (
                  <button 
                    onClick={() => {
                      setCurrentView('admin')
                      setMobileMenuOpen(false)
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
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {currentView === 'dashboard' ? (
          <>
            {/* Welcome Banner - 自然风格设计 */}
            <div className="relative rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 lg:p-10 mb-4 sm:mb-6 lg:mb-8 text-white overflow-hidden shadow-lg">
              {/* 自然渐变背景 */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700"></div>
              
              {/* 自然纹理叠加 */}
              <div className="absolute inset-0">
                {/* 有机形状装饰 */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full blur-xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white bg-opacity-15 rounded-full blur-lg"></div>
                <div className="absolute top-1/3 left-1/4 w-16 h-16 bg-white bg-opacity-8 rounded-full blur-md"></div>
                <div className="absolute bottom-1/3 right-1/3 w-20 h-20 bg-white bg-opacity-12 rounded-full blur-lg"></div>
                
                {/* 自然纹理图案 */}
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `
                      radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 2px, transparent 2px),
                      radial-gradient(circle at 80% 80%, rgba(255,255,255,0.08) 1px, transparent 1px),
                      radial-gradient(circle at 40% 60%, rgba(255,255,255,0.12) 1.5px, transparent 1.5px),
                      radial-gradient(circle at 70% 30%, rgba(255,255,255,0.06) 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px, 60px 60px, 80px 80px, 50px 50px'
                  }}
                ></div>
                
                {/* 自然曲线装饰 */}
                <svg className="w-full h-full absolute inset-0 opacity-25" viewBox="0 0 400 200">
                  <path d="M0,100 Q100,50 200,100 T400,100" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none"/>
                  <path d="M0,150 Q150,100 300,150 T400,150" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none"/>
                  <circle cx="80" cy="60" r="8" fill="rgba(255,255,255,0.15)"/>
                  <circle cx="320" cy="140" r="6" fill="rgba(255,255,255,0.12)"/>
                  <circle cx="250" cy="80" r="4" fill="rgba(255,255,255,0.18)"/>
                </svg>
              </div>
              
              {/* 主要内容区域 */}
              <div className="relative z-10">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-4">
                      <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-semibold mr-4">
                        欢迎回来，<span className="font-bold text-white">{userProfile?.full_name || '用户'}</span>
                      </h2>
                      <div className="bg-white bg-opacity-20 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm border border-white border-opacity-30">
                        {getMembershipTypeText(userProfile?.membership_type || 'standard')}
                      </div>
                    </div>
                    
                    <p className="text-green-100 text-base sm:text-lg lg:text-xl mb-6 font-medium">
                      🌿 祝您今天有美好的高尔夫体验 🌿
                    </p>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-6">
                      <div className="flex items-center text-sm text-green-100">
                        <div className="w-2 h-2 bg-white bg-opacity-60 rounded-full mr-3"></div>
                        <span className="font-medium">会员数量：</span>
                        <span className="font-semibold text-white ml-1">{memberCount}</span>
                      </div>
                      <div className="flex items-center text-sm text-green-100">
                        <div className="w-2 h-2 bg-white bg-opacity-60 rounded-full mr-3"></div>
                        <span className="font-medium">加入日期：</span>
                        <span className="font-semibold text-white ml-1">{new Date().toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 自然风格日期显示区域 */}
                  <div className="mt-6 lg:mt-0 lg:ml-8">
                    <div className="bg-white bg-opacity-15 rounded-2xl p-6 text-center backdrop-blur-sm border border-white border-opacity-30 relative overflow-hidden">
                      {/* 内部自然装饰 */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white from-opacity-10 to-transparent rounded-2xl"></div>
                      <div className="relative z-10">
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">{year}</div>
                        <div className="text-sm text-green-100 mb-3">{season}</div>
                        <div className="w-12 h-0.5 bg-white bg-opacity-40 mx-auto mb-3 rounded-full"></div>
                        <div className="text-xs text-green-200 font-medium">NATURE DAY</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 自然装饰元素 */}
              <div className="absolute top-6 right-6 w-12 h-12 bg-white bg-opacity-10 rounded-full"></div>
              <div className="absolute bottom-6 left-6 w-8 h-8 bg-white bg-opacity-15 rounded-full"></div>
              <div className="absolute top-1/2 left-6 w-1 h-12 bg-white bg-opacity-30 rounded-full"></div>
              <div className="absolute top-1/2 right-6 w-1 h-12 bg-white bg-opacity-30 rounded-full"></div>
            </div>

            {/* Quick Actions */}
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 lg:mb-6">快捷操作</h3>
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
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
                  onClick={() => setCurrentView('posters')}
                  className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-3 lg:mb-4">
                    <Image className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
                  </div>
                  <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 flex items-center">
                    海报展示
                    <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">浏览俱乐部活动海报</p>
                </div>

                <div
                  onClick={() => setCurrentView('investments')}
                  className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-red-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-3 lg:mb-4">
                    <Heart className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
                  </div>
                  <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 flex items-center">
                    投资支持
                    <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">支持俱乐部建设发展</p>
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

              {/* 最新投资支持 */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 flex items-center">
                    <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 mr-2" />
                    最新投资支持
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
                              目标: ¥{investment.target_amount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-red-600">
                            ¥{(investment.current_amount || 0).toLocaleString()}
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

              {/* 最新海报 */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 flex items-center">
                    <Image className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500 mr-2" />
                    最新海报
                  </h3>
                  <button 
                    onClick={() => setCurrentView('posters')}
                    className="text-purple-600 hover:text-purple-700 font-medium text-sm sm:text-base flex items-center"
                  >
                    查看全部
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                {loading ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2 text-sm">加载中...</p>
                  </div>
                ) : recentPosters.length > 0 ? (
                  <div className="space-y-3">
                    {recentPosters.map((poster) => (
                      <div key={poster.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                            <Image className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{poster.title}</div>
                            <div className="text-xs text-gray-600">
                              {new Date(poster.created_at).toLocaleDateString('zh-CN')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-purple-600">
                            {poster.status === 'active' ? '已发布' : '草稿'}
                          </div>
                          <div className="text-xs text-gray-600">海报</div>
                        </div>
                      </div>
                    ))}
                    <div className="text-center pt-2">
                      <button 
                        onClick={() => setCurrentView('posters')}
                        className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                      >
                        查看海报展示
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <p className="text-gray-500 mb-3 sm:mb-4 text-sm sm:text-base">暂无海报</p>
                    <button 
                      onClick={() => setCurrentView('posters')}
                      className="text-purple-600 hover:text-purple-700 font-medium text-sm sm:text-base"
                    >
                      查看海报展示
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
        ) : currentView === 'posters' ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">海报展示</h2>
              <p className="text-gray-600">浏览俱乐部精彩活动海报和宣传资料</p>
            </div>
            <PosterList onPosterSelect={setSelectedPoster} />
          </div>
        ) : currentView === 'scores' ? (
          <UserScoreQuery />
        ) : currentView === 'investments' ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">投资支持</h2>
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
        ) : currentView === 'admin' && isAdmin ? (
          <AdminPanel />
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

      {/* Poster Detail Modal */}
      {selectedPoster && (
        <PosterDetail
          poster={selectedPoster}
          onClose={() => setSelectedPoster(null)}
        />
      )}

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
    </div>
  )
}