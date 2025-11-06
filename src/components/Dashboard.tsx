import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Calendar, Trophy, Image, Heart, LogOut, User, Menu, X, Settings, ChevronDown, ArrowRight, Receipt, BookOpen, Bell, Users, Lock, Eye, EyeOff, ChevronUp, Plus, Minus, Medal, MapPin } from 'lucide-react'
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
  team_name?: string | null
  full_name?: string
}

interface CompetitionResult {
  competition_name: string
  competition_date: string
  event_type: '普通活动' | '个人赛' | '团体赛'
  location?: string
  image_url?: string | null // 活动图片
  team_colors?: Record<string, string> // 队伍颜色配置：队伍名称 -> 颜色代码
  // 个人赛前三名
  topThree?: Array<{
    name: string
    total_strokes: number
    net_strokes?: number | null
    rank: number
  }>
  // 团体赛队伍
  teams?: Array<{
    team_name: string
    score: number
    rank?: number
  }>
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
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, signOut } = useAuth()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [memberCount, setMemberCount] = useState<number>(0)
  const [unreadInformationCount, setUnreadInformationCount] = useState<number>(0)
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
  
  // 从URL参数读取view，如果没有则使用默认值
  const viewParam = searchParams.get('view')
  const [currentView, setCurrentView] = useState<'dashboard' | 'events' | 'posters' | 'scores' | 'investments' | 'expenses' | 'reviews' | 'information' | 'members' | 'admin'>(
    (viewParam as any) || 'dashboard'
  )
  
  // 当URL参数变化时，更新currentView
  useEffect(() => {
    if (viewParam && ['dashboard', 'events', 'posters', 'scores', 'investments', 'expenses', 'reviews', 'information', 'members', 'admin'].includes(viewParam)) {
      setCurrentView(viewParam as any)
      // 只清除 view 参数，保留其他参数（如 reviewId, eventId, informationId）
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('view')
      if (newParams.toString()) {
        setSearchParams(newParams, { replace: true })
      } else {
        setSearchParams({}, { replace: true })
      }
    }
  }, [viewParam, searchParams, setSearchParams])

  const [showDateAvatar, setShowDateAvatar] = useState(false) // false显示日期，true显示头像
  const [showMoreActions, setShowMoreActions] = useState(false) // 控制显示更多快捷操作，默认收缩

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

  const fetchEventById = async (eventId: string) => {
    try {
      if (!supabase) return
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()
      
      if (error || !data) {
        console.error('获取活动失败:', error)
        return
      }
      
      setSelectedEvent(data)
    } catch (error) {
      console.error('获取活动失败:', error)
    }
  }

  // 从 URL 参数读取 eventId 并自动打开模态框
  useEffect(() => {
    const eventId = searchParams.get('eventId')
    
    // 如果没有 eventId，且当前有打开的模态框，关闭它
    if (!eventId && selectedEvent) {
      setSelectedEvent(null)
      return
    }
    
    // 如果有 eventId 且当前没有打开模态框，尝试打开
    if (eventId && !selectedEvent) {
      fetchEventById(eventId)
    }
  }, [searchParams, selectedEvent])

  const [selectedPoster, setSelectedPoster] = useState<Poster | null>(null)
  const [selectedScore, setSelectedScore] = useState<Score | null>(null)
  const [selectedInvestment, setSelectedInvestment] = useState<InvestmentProject | null>(null)
  const [selectedInformationItem, setSelectedInformationItem] = useState<InformationItem | null>(null)

  const fetchInformationById = async (informationId: string) => {
    try {
      if (!supabase) return
      
      const { data, error } = await supabase
        .from('information_items')
        .select('*')
        .eq('id', informationId)
        .single()
      
      if (error || !data) {
        console.error('获取信息失败:', error)
        return
      }
      
      setSelectedInformationItem(data)
    } catch (error) {
      console.error('获取信息失败:', error)
    }
  }

  // 从 URL 参数读取 informationId 并自动打开模态框
  useEffect(() => {
    const informationId = searchParams.get('informationId')
    
    // 如果没有 informationId，且当前有打开的模态框，关闭它
    if (!informationId && selectedInformationItem) {
      setSelectedInformationItem(null)
      return
    }
    
    // 如果有 informationId 且当前没有打开模态框，尝试打开
    if (informationId && !selectedInformationItem) {
      fetchInformationById(informationId)
    }
  }, [searchParams, selectedInformationItem])
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [recentScores, setRecentScores] = useState<CompetitionResult[]>([])
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
      fetchUnreadInformationCount()
    }
    
  }, [user])

  // 当从信息中心返回dashboard时，重新获取未读数量
  useEffect(() => {
    if (user && currentView === 'dashboard') {
      fetchUnreadInformationCount()
    }
  }, [currentView, user])

  const fetchUnreadInformationCount = async () => {
    if (!user || !supabase) return
    
    try {
      // 只获取"通知"和"公告"分类的已发布信息
      const { data: items, error: itemsError } = await supabase
        .from('information_items')
        .select('id, read_by_users, expires_at, category')
        .eq('status', 'published')
        .in('category', ['通知', '公告'])
      
      if (itemsError) {
        console.error('获取信息列表失败:', itemsError)
        setUnreadInformationCount(0)
        return
      }
      
      if (!items || items.length === 0) {
        setUnreadInformationCount(0)
        return
      }
      
      // 过滤过期信息
      const now = new Date().toISOString()
      const validItems = items.filter(item => {
        return !item.expires_at || item.expires_at > now
      })
      
      // 检查每条信息的 read_by_users 数组字段中是否包含当前用户ID
      const unreadCount = validItems.filter(item => {
        if (!item.read_by_users || !Array.isArray(item.read_by_users)) return true // 如果没有 read_by_users 字段或为空数组，视为未读
        
        return !item.read_by_users.includes(user.id)
      }).length
      
      setUnreadInformationCount(unreadCount)
    } catch (error) {
      console.error('获取未读信息数量失败:', error)
      setUnreadInformationCount(0)
    }
  }

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

      // 获取最新活动的成绩信息
      // 1. 获取所有成绩（包括会员成绩和访客成绩，和UserScoreQuery一样）
      
      // 获取会员成绩
      const { data: memberScores, error: memberError } = await supabase
        .from('scores')
        .select(`
          *,
          events!left (
            id,
            title,
            start_time,
            end_time,
            location,
            event_type,
            team_colors,
            image_url,
            article_featured_image_url
          ),
          user_profiles(full_name)
        `)
        .order('created_at', { ascending: false })
      
      // 获取访客成绩
      const { data: guestScores, error: guestError } = await supabase
        .from('guest_scores')
        .select(`
          *,
          events!left (
            id,
            title,
            start_time,
            end_time,
            location,
            event_type,
            team_colors,
            image_url,
            article_featured_image_url
          )
        `)
        .order('created_at', { ascending: false })
      
      if (memberError) {
        console.error('Dashboard - 获取会员成绩失败:', memberError)
      }
      
      if (guestError) {
        console.error('Dashboard - 获取访客成绩失败:', guestError)
      }
      
      // 合并会员和访客成绩，统一格式
      const memberScoresFormatted = (memberScores || []).map(score => ({
        ...score,
        is_guest: false,
        player_name: score.user_profiles?.full_name || '未知'
      }))
      
      const guestScoresFormatted = (guestScores || []).map(score => ({
        ...score,
        is_guest: true,
        player_name: score.player_name || '未知',
        user_profiles: null,
        full_name: score.player_name || '未知'
      }))
      
      const allScores = [...memberScoresFormatted, ...guestScoresFormatted]
      
      if (allScores.length === 0) {
        console.log('Dashboard - 没有找到任何成绩数据')
        setRecentScores([])
      } else {
        // 2. 按event分组
        // 如果关联查询失败（events为null），需要手动查询events表匹配competition_name
        const competitionMap = new Map<string, any[]>()
        
        // 先分离有events关联和没有events关联的成绩
        const scoresWithEvents: any[] = []
        const scoresWithoutEvents: any[] = []
        
        allScores.forEach(score => {
          if (score.events?.id) {
            scoresWithEvents.push(score)
          } else if (score.event_id) {
            // guest_scores表有event_id，需要单独查询
            scoresWithoutEvents.push(score)
          } else if (score.competition_name) {
            // scores表可能有competition_name
            scoresWithoutEvents.push(score)
          }
        })
        
        // 对于没有events关联的成绩，批量查询events表
        if (scoresWithoutEvents.length > 0) {
          // 收集需要查询的event_id和competition_name
          const eventIds = [...new Set(scoresWithoutEvents.map(s => s.event_id).filter(Boolean))]
          const competitionNames = [...new Set(scoresWithoutEvents.map(s => s.competition_name).filter(Boolean))]
          
          const eventMap = new Map<string, any>()
          
          // 通过event_id查询
          if (eventIds.length > 0) {
            const { data: eventsById } = await supabase
              .from('events')
              .select('id, title, start_time, end_time, location, event_type, team_colors')
              .in('id', eventIds)
            
            eventsById?.forEach(event => {
              eventMap.set(event.id, event)
            })
          }
          
          // 通过competition_name匹配
          if (competitionNames.length > 0) {
            const { data: eventsByTitle } = await supabase
              .from('events')
              .select('id, title, start_time, end_time, location, event_type, team_colors')
              .in('title', competitionNames)
            
            eventsByTitle?.forEach(event => {
              eventMap.set(event.title, event)
            })
          }
          
          // 为没有关联的成绩添加event信息
          scoresWithoutEvents.forEach(score => {
            let matchedEvent = null
            if (score.event_id) {
              matchedEvent = eventMap.get(score.event_id)
            } else if (score.competition_name) {
              matchedEvent = eventMap.get(score.competition_name)
            }
            
            if (matchedEvent) {
              score.events = matchedEvent
              scoresWithEvents.push(score)
            }
          })
        }
        
        // 合并所有成绩（包括有events关联的和手动匹配的）
        const allScoresWithEvents = [...scoresWithEvents]
        
        // 按events.id分组
        allScoresWithEvents.forEach(score => {
          const key = score.events?.id
          if (!key) {
            return
          }
          
          if (!competitionMap.has(key)) {
            competitionMap.set(key, [])
          }
          competitionMap.get(key)!.push({
            ...score,
            full_name: score.is_guest ? score.player_name : (score.user_profiles?.full_name || score.full_name || '未知'),
            event: score.events || null
          })
        })

        // 3. 处理每个活动的成绩信息
        const competitionResults: CompetitionResult[] = []
        // 按活动结束时间排序，获取所有有成绩的活动（不限制数量）
        const competitionKeys = Array.from(competitionMap.keys())
          .map(key => {
            const scores = competitionMap.get(key) || []
            // 获取活动的end_time（从关联的events表），如果没有则使用created_at
            const event = scores[0]?.event || scores[0]?.events
            const endTime = event?.end_time || scores[0]?.created_at || new Date().toISOString()
            return {
              key,
              endTime: new Date(endTime),
              event: event
            }
          })
          .sort((a, b) => b.endTime.getTime() - a.endTime.getTime())
        
        // 过滤：只显示已结束的活动（end_time < 当前时间），并限制为最新2个
        const now = new Date()
        const endedCompetitionKeys = competitionKeys
          .filter(({ event }) => {
            if (!event?.end_time) return false
            return new Date(event.end_time) < now
          })
          .slice(0, 2) // 只取最新2个
        
        console.log('Dashboard - 已结束的活动数量:', endedCompetitionKeys.length)

        for (const { key, event: eventFromScores } of endedCompetitionKeys) {
          const scores = competitionMap.get(key) || []
          if (scores.length === 0) continue

          // 获取活动信息（从关联的events表或单独查询）
          let event = eventFromScores || scores[0]?.events
          
          // 如果没有从关联查询获取到，尝试单独查询
          if (!event) {
            // 如果key是event_id
            if (key.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
              const { data: eventData } = await supabase
                .from('events')
                .select('id, title, event_type, location, end_time, team_colors, image_url, article_featured_image_url')
                .eq('id', key)
                .single()
              event = eventData
            } else {
              // 如果key是title，尝试匹配
              const { data: eventData } = await supabase
                .from('events')
                .select('id, title, event_type, location, end_time, team_colors, image_url, article_featured_image_url')
                .eq('title', key)
                .limit(1)
              event = eventData?.[0]
            }
          }

          const competitionName = event?.title || scores[0]?.competition_name || key
          const competitionDate = event?.end_time || scores[0]?.created_at || new Date().toISOString()
          const eventType = event?.event_type || '个人赛' // 默认为个人赛

          if (eventType === '个人赛') {
            // 个人赛：按总杆数排序，取前三名
            const sortedScores = scores
              .filter(s => s.total_strokes != null)
              .sort((a, b) => a.total_strokes - b.total_strokes)
              .slice(0, 3)
              .map((s, index) => ({
                name: s.full_name || '未知',
                total_strokes: s.total_strokes,
                net_strokes: s.net_strokes,
                rank: index + 1
              }))

            // 即使没有前三名，只要有成绩就显示
            competitionResults.push({
              competition_name: competitionName,
              competition_date: competitionDate,
              event_type: eventType as '个人赛',
              location: event?.location,
              image_url: (event as any)?.image_url || (event as any)?.article_featured_image_url || null,
              topThree: sortedScores.length > 0 ? sortedScores : undefined
            })
          } else if (eventType === '团体赛') {
            // 团体赛：按team_name分组，计算每个队伍的净杆总数
            const teamMap = new Map<string, number[]>()
            scores.forEach(score => {
              if (score.team_name) {
                if (!teamMap.has(score.team_name)) {
                  teamMap.set(score.team_name, [])
                }
                // 使用净杆数，如果没有净杆数则使用总杆数
                const netStrokes = score.net_strokes != null ? score.net_strokes : score.total_strokes
                if (netStrokes != null) {
                  teamMap.get(score.team_name)!.push(netStrokes)
                }
              }
            })

            // 计算每个队伍的净杆总数
            const teams = Array.from(teamMap.entries())
              .map(([teamName, netStrokes]) => ({
                team_name: teamName,
                score: Math.round(netStrokes.reduce((sum, s) => sum + s, 0)) // 净杆总数，四舍五入为整数
              }))
              .sort((a, b) => a.score - b.score) // 按分数升序（分数越低越好）
              .map((team, index) => ({
                ...team,
                rank: index + 1
              }))

            // 即使没有队伍数据，只要有成绩就显示
            competitionResults.push({
              competition_name: competitionName,
              competition_date: competitionDate,
              event_type: eventType as '团体赛',
              location: event?.location,
              team_colors: (event as any)?.team_colors || {},
              image_url: (event as any)?.image_url || (event as any)?.article_featured_image_url || null,
              teams: teams.length > 0 ? teams : undefined
            })
          }
        }

        setRecentScores(competitionResults)
      }

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

  const getRoleText = (role: string | null | undefined) => {
    if (!role) return '会员'
    switch (role) {
      case 'admin':
        return '管理员'
      case 'member':
        return '会员'
      default:
        return role
    }
  }

  const getMembershipTypeText = (type: string) => {
    switch (type) {
      case 'premium': return '高级会员'
      case 'vip': return 'VIP会员'
      default: return '普通会员'
    }
  }

  // 获取中国阴历日期（简化版）
  const getLunarDate = (date: Date) => {
    // 使用简化的阴历转换算法
    // 这是一个基础实现，如果需要更准确可以使用专门的阴历库
    const lunarMonths = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊']
    const lunarDays = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
      '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
      '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十']
    
    // 这里使用一个简化的映射，实际应该使用完整的阴历转换算法
    // 为了演示，我们使用一个简单的计算
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    
    // 简化的阴历计算（仅作示例，实际应使用完整的阴历转换表）
    // 这里使用一个近似值，实际项目中应使用专业的阴历转换库
    const lunarMonthIndex = (month - 1) % 12
    const lunarDayIndex = (day - 1) % 30
    
    return `${lunarMonths[lunarMonthIndex]}月${lunarDays[lunarDayIndex]}`
  }

  const getCurrentDate = () => {
    const now = new Date()
    return {
      year: now.getFullYear(),
      season: `${now.getMonth() + 1}月${now.getDate()}日`,
      lunarDate: getLunarDate(now)
    }
  }

  const { year, season, lunarDate } = getCurrentDate()

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
      className="min-h-screen dashboard-background relative"
    >
      <style>{`
        .dashboard-background::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: url(/flower-pattern.png);
          background-repeat: repeat;
          background-size: 960px auto;
          background-position: -30px 30px;
          background-attachment: fixed;
          z-index: -1;
          pointer-events: none;
        }
        @media (max-width: 640px) {
          .dashboard-background::before {
            background-repeat: no-repeat !important;
            background-size: 480px auto !important;
            background-attachment: scroll !important;
            background-position: center center !important;
          }
        }
        @media (min-width: 641px) {
          .dashboard-background::before {
            background-size: 1600px auto !important;
            background-attachment: fixed !important;
          }
        }
      `}</style>
      {/* Header */}
      <header className="shadow-sm border-b sticky top-0 z-50" style={{ backgroundColor: '#68A85A', borderColor: 'rgba(255,255,255,0.2)' }}>
        <div className="max-w-[1280px] mx-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-3">
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
              <div className="ml-2 sm:ml-3 pt-1">
                <h1 className="text-sm sm:text-lg lg:text-lg xl:text-xl font-extrabold text-white">溫哥華華人女子高爾夫俱樂部</h1>
                <p className="text-xs font-bold text-white">
                  <span style={{ color: '#FF7DB3', fontSize: '0.875rem', fontWeight: '900' }}>V</span>ancouver <span style={{ color: '#FF7DB3', fontSize: '0.875rem', fontWeight: '900' }}>C</span>hinese <span style={{ color: '#FF7DB3', fontSize: '0.875rem', fontWeight: '900' }}>L</span>adies' Golf Club
                </p>
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
          <div 
            className={`lg:hidden fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white shadow-xl z-[101] transform ${
              mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{
              transition: 'transform 0.3s cubic-bezier(0, 0, 0.2, 1)'
            }}
          >
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
                  <Bell 
                    className="w-5 h-5" 
                    style={{ 
                      color: currentView === 'information' ? '#FFFFFF' : '#1F2937',
                      animation: unreadInformationCount > 0 ? 'bell-shake 0.5s ease-in-out 0s, bell-shake 0.5s ease-in-out 2s infinite' : 'none',
                      transformOrigin: 'top center'
                    }} 
                    strokeWidth={2} 
                  />
                  <span>信息中心</span>
                  {unreadInformationCount > 0 && (
                    <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-4.5 px-1 flex items-center justify-center">
                      {unreadInformationCount > 99 ? '99+' : unreadInformationCount}
                    </span>
                  )}
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
      <main className="max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-10 py-4 sm:py-6 lg:py-8 relative z-10">
        {currentView === 'dashboard' ? (
          <>
            {/* Welcome Banner - 高尔夫主题设计 */}
            <div 
              className="relative rounded-[20px] p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8 text-white overflow-hidden transition-all duration-300 welcome-card group"
              style={{
                background: 'linear-gradient(to bottom, #E0487A, #F15B98)',
                boxShadow: 'inset 0 0 8px rgba(255,255,255,0.4), 0 6px 12px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.1)',
                minHeight: '140px'
              }}
            >
              {/* 粉色波浪背景层 - 参考示例实现 */}
              <svg 
                className="absolute bottom-0 left-0 right-0"
                style={{ 
                  width: '100%',
                  height: '60%',
                  minHeight: '80px',
                  maxHeight: '120px',
                  zIndex: 0
                }}
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                viewBox="0 24 150 28"
                preserveAspectRatio="none"
                shapeRendering="auto"
              >
                <defs>
                  <path 
                    id="gentle-wave-pink" 
                    d="M-160 44c30 0 58-18 88-18s58 18 88 18 58-18 88-18 58 18 88 18v44h-352z" 
                  />
                </defs>
                <g className="parallax">
                  <use 
                    xlinkHref="#gentle-wave-pink" 
                    x="48" 
                    y="0" 
                    fill="rgba(255,125,179,0.4)" 
                  />
                  <use 
                    xlinkHref="#gentle-wave-pink" 
                    x="48" 
                    y="3" 
                    fill="rgba(255,91,152,0.3)" 
                  />
                  <use 
                    xlinkHref="#gentle-wave-pink" 
                    x="48" 
                    y="5" 
                    fill="rgba(255,125,179,0.2)" 
                  />
                  <use 
                    xlinkHref="#gentle-wave-pink" 
                    x="48" 
                    y="7" 
                    fill="rgba(224,72,122,0.15)" 
                  />
                </g>
              </svg>
              
              {/* 添加波浪动画CSS */}
              <style>{`
                .parallax > use {
                  animation: move-forever 40s cubic-bezier(.55, .5, .45, .5) infinite;
                }
                .parallax > use:nth-child(1) {
                  animation-delay: -2s;
                  animation-duration: 14s;
                }
                .parallax > use:nth-child(2) {
                  animation-delay: -3s;
                  animation-duration: 20s;
                }
                .parallax > use:nth-child(3) {
                  animation-delay: -4s;
                  animation-duration: 26s;
                }
                .parallax > use:nth-child(4) {
                  animation-delay: -5s;
                  animation-duration: 40s;
                }
                @keyframes move-forever {
                  0% { transform: translate3d(-90px, 0, 0); }
                  100% { transform: translate3d(85px, 0, 0); }
                }
                @media (max-width: 768px) {
                  .waves {
                    height: 40px;
                    min-height: 40px;
                  }
                }
              `}</style>
              
              {/* 顶部光泽漂移层 - 增加立体感 */}
              <div 
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ 
                  zIndex: 2,
                  background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.15) 0%, transparent 60%)',
                  mixBlendMode: 'soft-light',
                  opacity: 0.6
                }}
              ></div>
              
              {/* 艺术感装饰花纹背景 */}
              <svg 
                className="absolute inset-0 w-full h-full"
                style={{ opacity: 0.2, zIndex: 1 }}
                preserveAspectRatio="none"
                viewBox="0 0 1000 200"
              >
                <defs>
                  {/* 渐变定义 */}
                  <linearGradient id="lineGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.6)" stopOpacity="0.6" />
                    <stop offset="50%" stopColor="rgba(255,255,255,0.4)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.3)" stopOpacity="0.3" />
                  </linearGradient>
                  <linearGradient id="lineGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.4)" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="rgba(255,255,255,0.5)" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.35)" stopOpacity="0.35" />
                  </linearGradient>
                </defs>
                
              </svg>
              
              {/* 主要内容 */}
              <div className="relative z-10" style={{ position: 'relative', zIndex: 10 }}>
                <div className="mb-3 sm:mb-4">
                  <div className="mb-2">
                    <h2 
                      className="text-2xl sm:text-3xl lg:text-3xl xl:text-4xl font-extrabold transition-all duration-300 group-hover:brightness-110"
                      style={{ 
                        letterSpacing: '0.02em',
                        color: '#FFFFFF',
                        textShadow: '0 2px 4px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)'
                      }}
                    >
                      欢迎回来，{userProfile?.full_name || '用户'}
                    </h2>
                  </div>
                </div>
                <p 
                  className="text-sm sm:text-base lg:text-lg transition-all duration-300 group-hover:brightness-105"
                  style={{ 
                    letterSpacing: '0.3px',
                    lineHeight: '1.6',
                    color: '#FFF8F5',
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}
                >
                  祝您今天有美好的高尔夫体验
                </p>
              </div>
              
              {/* 日期显示区域 - 右上角 */}
              <div 
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  padding: 0,
                  borderRadius: '16px',
                  background: 'linear-gradient(145deg, rgba(255, 180, 220, 0.5), rgba(255, 130, 180, 0.45))',
                  boxShadow: '0 6px 16px rgba(255, 120, 180, 0.35), 0 2px 8px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255,255,255,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  zIndex: 20,
                  width: '100px',
                  height: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)'
                }}
                className="date-card-new group/date"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 10px 28px rgba(255, 120, 180, 0.5), 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255,255,255,0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 120, 180, 0.35), 0 2px 8px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255,255,255,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                }}
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
                    padding: '14px 16px',
                    pointerEvents: showDateAvatar ? 'none' : 'auto'
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF', marginBottom: '4px', letterSpacing: '0.5px' }}>{year}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.95)', marginBottom: '6px', fontWeight: '600' }}>{season}</div>
                  
                  {/* 装饰性过渡元素 */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    width: '100%', 
                    margin: '5px 0',
                    gap: '4px'
                  }}>
                    <div style={{ 
                      flex: 1, 
                      height: '1px', 
                      background: 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.4), transparent)',
                      borderRadius: '1px'
                    }}></div>
                    <div style={{
                      width: '3px',
                      height: '3px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.6)',
                      boxShadow: '0 0 3px rgba(255, 255, 255, 0.3)'
                    }}></div>
                    <div style={{ 
                      flex: 1, 
                      height: '1px', 
                      background: 'linear-gradient(to left, transparent, rgba(255, 255, 255, 0.4), transparent)',
                      borderRadius: '1px'
                    }}></div>
                  </div>
                  
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 1)', fontWeight: '700', letterSpacing: '0.5px', marginTop: '1px' }}>{lunarDate}</div>
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
                    padding: '4px',
                    borderRadius: '14px',
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
                        borderRadius: '14px',
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
                      borderRadius: '14px'
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
              
              @keyframes pulse-subtle {
                0%, 100% {
                  opacity: 1;
                }
                50% {
                  opacity: 0.95;
                }
              }
              
              @keyframes bell-shake {
                0%, 100% {
                  transform: rotate(0deg);
                }
                10%, 30%, 50%, 70%, 90% {
                  transform: rotate(-8deg);
                }
                20%, 40%, 60%, 80% {
                  transform: rotate(8deg);
                }
              }
              
              .animate-pulse-subtle {
                animation: pulse-subtle 3s ease-in-out infinite;
              }
              
              .bell-shake-animation {
                animation: bell-shake 0.5s ease-in-out;
                transform-origin: top center;
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
              <div className="flex items-center justify-between mb-3 sm:mb-4 lg:mb-6">
                <h3 className="hidden sm:block text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">快捷操作</h3>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                <div 
                  onClick={() => setCurrentView('information')}
                  className={`rounded-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-6 lg:py-16 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer group relative overflow-hidden border border-[#8CBF7F] border-2 select-none ${
                    unreadInformationCount > 0 ? 'animate-pulse-subtle' : ''
                  }`}
                  style={{ 
                    backgroundColor: 'rgba(249, 246, 244, 0.4)', 
                    touchAction: 'manipulation',
                    boxShadow: '0 2px 8px rgba(140, 191, 127, 0.3), 0 1px 2px rgba(0, 0, 0, 0.08)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 3px 10px rgba(140, 191, 127, 0.4), 0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(140, 191, 127, 0.3), 0 1px 2px rgba(0, 0, 0, 0.08)'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 max-w-[60%] sm:max-w-[65%] ml-2 sm:ml-4">
                      <div className="flex items-center justify-start mb-2 sm:mb-3 lg:mb-4 relative">
                        <Bell 
                          className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 ml-3 sm:ml-4 ${unreadInformationCount > 0 ? 'bell-shake-animation' : ''}`}
                          style={{ 
                            color: '#4B5563', 
                            fill: '#92c648',
                            animation: unreadInformationCount > 0 ? 'bell-shake 0.5s ease-in-out 0s, bell-shake 0.5s ease-in-out 2s infinite' : 'none',
                            transformOrigin: 'top center'
                          }} 
                          strokeWidth={2} 
                        />
                        {unreadInformationCount > 0 && (
                          <span 
                            className="absolute top-0 left-0 ml-3 sm:ml-4 -mt-1 -ml-1 sm:-mt-1.5 sm:-ml-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center min-w-[20px] h-5 sm:h-6 px-1.5 sm:px-2 shadow-lg z-10"
                            style={{ fontSize: '10px', lineHeight: '1' }}
                          >
                            {unreadInformationCount > 99 ? '99+' : unreadInformationCount}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 flex items-center">
                        信息中心
                        <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">
                        {unreadInformationCount > 0 
                          ? `查看公告通知和 ${unreadInformationCount} 条新信息`
                          : '查看公告通知和重要信息'
                        }
                      </p>
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
                  className="rounded-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-6 lg:py-16 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer group relative overflow-hidden border border-[#8CBF7F] border-2 select-none"
                  style={{ 
                    backgroundColor: 'rgba(249, 246, 244, 0.4)', 
                    touchAction: 'manipulation',
                    boxShadow: '0 2px 8px rgba(140, 191, 127, 0.3), 0 1px 2px rgba(0, 0, 0, 0.08)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 3px 10px rgba(140, 191, 127, 0.4), 0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(140, 191, 127, 0.3), 0 1px 2px rgba(0, 0, 0, 0.08)'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 max-w-[60%] sm:max-w-[65%] ml-2 sm:ml-4">
                      <div className="flex items-center justify-start mb-2 sm:mb-3 lg:mb-4">
                        <Calendar className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 ml-3 sm:ml-4" style={{ color: '#4B5563', fill: '#92c648' }} strokeWidth={2} />
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
                  className="rounded-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-6 lg:py-16 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer group relative overflow-hidden border border-[#8CBF7F] border-2 select-none"
                  style={{ 
                    backgroundColor: 'rgba(249, 246, 244, 0.4)', 
                    touchAction: 'manipulation',
                    boxShadow: '0 2px 8px rgba(140, 191, 127, 0.3), 0 1px 2px rgba(0, 0, 0, 0.08)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 3px 10px rgba(140, 191, 127, 0.4), 0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(140, 191, 127, 0.3), 0 1px 2px rgba(0, 0, 0, 0.08)'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 max-w-[60%] sm:max-w-[65%] ml-2 sm:ml-4">
                      <div className="flex items-center justify-start mb-2 sm:mb-3 lg:mb-4">
                        <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 ml-3 sm:ml-4" style={{ color: '#4B5563', fill: '#92c648' }} strokeWidth={2} />
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
                  className="rounded-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-6 lg:py-16 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer group relative overflow-hidden border border-[#8CBF7F] border-2 select-none"
                  style={{ 
                    backgroundColor: 'rgba(249, 246, 244, 0.4)', 
                    touchAction: 'manipulation',
                    boxShadow: '0 2px 8px rgba(140, 191, 127, 0.3), 0 1px 2px rgba(0, 0, 0, 0.08)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 3px 10px rgba(140, 191, 127, 0.4), 0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(140, 191, 127, 0.3), 0 1px 2px rgba(0, 0, 0, 0.08)'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 max-w-[60%] sm:max-w-[65%] ml-2 sm:ml-4">
                      <div className="flex items-center justify-start mb-2 sm:mb-3 lg:mb-4">
                        <Trophy className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 ml-3 sm:ml-4" style={{ color: '#4B5563', fill: '#92c648' }} strokeWidth={2} />
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

                {/* 可折叠的卡片容器 */}
                <div
                  className="col-span-2 lg:col-span-5"
                  style={{
                    maxHeight: showMoreActions ? '1000px' : '0px',
                    overflow: 'hidden',
                    transition: showMoreActions
                      ? 'max-height 0.5s cubic-bezier(0, 0, 0.2, 1)'
                      : 'max-height 0.5s cubic-bezier(0.4, 0, 1, 1)'
                  }}
                >
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 py-2 sm:py-3">
                    <div
                      onClick={() => showMoreActions && setCurrentView('investments')}
                      className="rounded-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-6 lg:py-16 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer group relative overflow-hidden border border-[#8CBF7F] border-2 select-none"
                      style={{ 
                        backgroundColor: 'rgba(249, 246, 244, 0.4)', 
                        touchAction: 'manipulation',
                        boxShadow: '0 2px 8px rgba(140, 191, 127, 0.3), 0 1px 2px rgba(0, 0, 0, 0.08)',
                        opacity: showMoreActions ? 1 : 0,
                        pointerEvents: showMoreActions ? 'auto' : 'none',
                        transition: 'opacity 0.5s cubic-bezier(0, 0, 0.2, 1)'
                      }}
                      onMouseEnter={(e) => {
                        if (showMoreActions) {
                          e.currentTarget.style.boxShadow = '0 3px 10px rgba(140, 191, 127, 0.4), 0 1px 3px rgba(0, 0, 0, 0.1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (showMoreActions) {
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(140, 191, 127, 0.3), 0 1px 2px rgba(0, 0, 0, 0.08)'
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 max-w-[60%] sm:max-w-[65%] ml-2 sm:ml-4">
                          <div className="flex items-center justify-start mb-2 sm:mb-3 lg:mb-4">
                            <Heart className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 ml-3 sm:ml-4" style={{ color: '#4B5563', fill: '#92c648' }} strokeWidth={2} />
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
                      onClick={() => showMoreActions && setCurrentView('expenses')}
                      className="rounded-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-6 lg:py-16 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer group relative overflow-hidden border border-[#8CBF7F] border-2 select-none"
                      style={{ 
                        backgroundColor: 'rgba(249, 246, 244, 0.4)', 
                        touchAction: 'manipulation',
                        boxShadow: '0 2px 8px rgba(140, 191, 127, 0.3), 0 1px 2px rgba(0, 0, 0, 0.08)',
                        opacity: showMoreActions ? 1 : 0,
                        pointerEvents: showMoreActions ? 'auto' : 'none',
                        transition: 'opacity 0.5s cubic-bezier(0, 0, 0.2, 1)'
                      }}
                      onMouseEnter={(e) => {
                        if (showMoreActions) {
                          e.currentTarget.style.boxShadow = '0 3px 10px rgba(140, 191, 127, 0.4), 0 1px 3px rgba(0, 0, 0, 0.1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (showMoreActions) {
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(140, 191, 127, 0.3), 0 1px 2px rgba(0, 0, 0, 0.08)'
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 max-w-[60%] sm:max-w-[65%] ml-2 sm:ml-4">
                          <div className="flex items-center justify-start mb-2 sm:mb-3 lg:mb-4">
                            <Receipt className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 ml-3 sm:ml-4" style={{ color: '#4B5563', fill: '#92c648' }} strokeWidth={2} />
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
                      onClick={() => showMoreActions && setCurrentView('members')}
                      className="rounded-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-6 lg:py-16 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer group relative overflow-visible border border-[#8CBF7F] border-2 select-none"
                      style={{ 
                        backgroundColor: 'rgba(249, 246, 244, 0.4)', 
                        touchAction: 'manipulation',
                        boxShadow: '0 2px 8px rgba(140, 191, 127, 0.3), 0 1px 2px rgba(0, 0, 0, 0.08)',
                        opacity: showMoreActions ? 1 : 0,
                        pointerEvents: showMoreActions ? 'auto' : 'none',
                        transition: 'opacity 0.5s cubic-bezier(0, 0, 0.2, 1)'
                      }}
                      onMouseEnter={(e) => {
                        if (showMoreActions) {
                          e.currentTarget.style.boxShadow = '0 3px 10px rgba(140, 191, 127, 0.4), 0 1px 3px rgba(0, 0, 0, 0.1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (showMoreActions) {
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(140, 191, 127, 0.3), 0 1px 2px rgba(0, 0, 0, 0.08)'
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 max-w-[60%] sm:max-w-[65%] ml-2 sm:ml-4">
                          <div className="flex items-center justify-start mb-2 sm:mb-3 lg:mb-4">
                            <Users className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 ml-3 sm:ml-4" style={{ color: '#4B5563', fill: '#92c648' }} strokeWidth={2} />
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
              </div>
              
              {/* 展开/收起按钮 */}
              <div className="flex justify-center -mt-2 sm:-mt-1">
                <button
                  onClick={() => setShowMoreActions(!showMoreActions)}
                  className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200"
                  style={{ 
                    backgroundColor: '#F36C92',
                    boxShadow: '0 2px 8px rgba(243, 108, 146, 0.3), 0 1px 3px rgba(0, 0, 0, 0.1)',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(243, 108, 146, 0.4), 0 2px 6px rgba(0, 0, 0, 0.15)'
                    e.currentTarget.style.backgroundColor = '#FF7BA3'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(243, 108, 146, 0.3), 0 1px 3px rgba(0, 0, 0, 0.1)'
                    e.currentTarget.style.backgroundColor = '#F36C92'
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.95)'
                    e.currentTarget.style.boxShadow = '0 1px 4px rgba(243, 108, 146, 0.3), inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(243, 108, 146, 0.4), 0 2px 6px rgba(0, 0, 0, 0.15)'
                  }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.transform = 'scale(0.95)'
                    e.currentTarget.style.boxShadow = '0 1px 4px rgba(243, 108, 146, 0.3), inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(243, 108, 146, 0.3), 0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                  title={showMoreActions ? '收起' : '更多'}
                  aria-label={showMoreActions ? '收起' : '更多'}
                >
                  {showMoreActions ? (
                    <Minus className="w-5 h-5 text-white" strokeWidth={3} />
                  ) : (
                    <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>

            {/* Main Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-3">
              {/* 即将举行的活动 */}
              <div className="p-4 sm:p-6 border border-gray-300/50" style={{ backgroundColor: 'rgba(249, 246, 244, 0.75)', boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.06), 0 1px 4px 0 rgba(0, 0, 0, 0.04)', borderRadius: '24px' }}>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 flex items-center">
                    <div className="w-1 h-6 bg-[#F15B98] mr-3"></div>
                    即将举行的活动
                  </h3>
                </div>
                {loading ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F15B98] mx-auto"></div>
                    <p className="text-gray-500 mt-2 text-sm">加载中...</p>
                  </div>
                ) : upcomingEvents.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => (
                      <div 
                        key={event.id} 
                        className="flex items-start gap-3 p-3 bg-white border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                        style={{ borderRadius: '20px' }}
                        onClick={() => navigate(`/event/${event.id}`)}
                      >
                        {/* 左侧小图 */}
                        <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-gray-100">
                          {event.image_url || event.article_featured_image_url ? (
                            <img
                              src={event.image_url || event.article_featured_image_url}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Calendar className="w-8 h-8 text-gray-300" />
                            </div>
                          )}
                        </div>
                        {/* 右侧文字 */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-sm sm:text-base mb-1.5 line-clamp-2">
                            {event.title}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600 mb-1 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{new Date(event.start_time).toLocaleDateString('zh-CN')} {new Date(event.start_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{event.location || '地点未设置'} · {event.max_participants || 0}人</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="text-center pt-2">
                      <button 
                        onClick={() => setCurrentView('events')}
                        className="px-4 py-2 bg-[#F15B98] hover:bg-[#F15B98]/90 text-white font-bold text-sm rounded-lg transition-colors"
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
                      className="px-4 py-2 bg-[#F15B98] hover:bg-[#F15B98]/90 text-white font-bold text-sm sm:text-base rounded-lg transition-colors"
                    >
                      查看更多活动
                    </button>
                  </div>
                )}
              </div>

              {/* 最新发布的成绩活动 */}
              <div className="p-4 sm:p-6 border border-gray-300/50" style={{ backgroundColor: 'rgba(249, 246, 244, 0.75)', boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.06), 0 1px 4px 0 rgba(0, 0, 0, 0.04)', borderRadius: '24px' }}>
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 flex items-center">
                    <div className="w-1 h-6 bg-[#F15B98] mr-3"></div>
                    最新发布的成绩活动
                  </h3>
                </div>
                {loading ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F15B98] mx-auto"></div>
                    <p className="text-gray-500 mt-2 text-sm">加载中...</p>
                  </div>
                ) : recentScores.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {recentScores.map((result, index) => (
                      <div key={index} className="bg-white p-3 border border-gray-200 flex gap-3 sm:gap-4" style={{ borderRadius: '20px' }}>
                        {/* 左侧图片或图标 */}
                        <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-gray-100">
                          {result.image_url ? (
                            <img
                              src={result.image_url}
                              alt={result.competition_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-[#F15B98]" />
                            </div>
                          )}
                        </div>
                        
                        {/* 右侧文字内容 */}
                        <div className="flex-1 min-w-0">
                          {/* 活动标题和日期 */}
                          <div>
                            <div className="font-semibold text-gray-900 text-base sm:text-lg mb-1.5 line-clamp-1">
                              {result.competition_name}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 mb-2.5 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{new Date(result.competition_date).toLocaleDateString('zh-CN')} {new Date(result.competition_date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                              {result.location && (
                                <>
                                  <span className="mx-1">·</span>
                                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span>{result.location}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* 成绩信息 - 一行显示 */}
                          {result.event_type === '个人赛' && result.topThree && result.topThree.length > 0 && (
                            <div className="flex items-center gap-2 text-xs sm:text-sm">
                              {result.topThree.slice(0, 3).map((player, idx) => {
                                const medalColors = [
                                  { color: '#FFD700', name: 'gold' }, // 金色
                                  { color: '#C0C0C0', name: 'silver' }, // 银色
                                  { color: '#CD7F32', name: 'bronze' } // 铜色
                                ]
                                const medal = medalColors[player.rank - 1]
                                return (
                                  <span key={idx} className="text-gray-700 flex items-center gap-1.5">
                                    {medal && (
                                      <Medal className="w-5 h-5 flex-shrink-0" style={{ color: medal.color }} />
                                    )}
                                    <span className="font-medium">{player.name}</span>
                                    {idx < Math.min(result.topThree.length, 3) - 1 && <span className="mx-1.5 text-gray-400">·</span>}
                                  </span>
                                )
                              })}
                            </div>
                          )}

                          {result.event_type === '团体赛' && result.teams && result.teams.length > 0 && (
                            <div className="flex items-center gap-2 text-xs flex-wrap">
                              {result.teams.slice(0, 4).map((team, idx) => {
                                // 根据队伍名称查找颜色，team_colors的key可能是原始名称或显示名称
                                const teamColors = result.team_colors || {}
                                let teamColor = '#6B7280' // 默认灰色
                                // 先尝试用team_name直接查找
                                if (teamColors[team.team_name]) {
                                  teamColor = teamColors[team.team_name]
                                }
                                return (
                                  <span key={idx} className="text-gray-700 flex items-center gap-1.5">
                                    <span 
                                      className="w-3 h-3 rounded flex-shrink-0" 
                                      style={{ backgroundColor: teamColor }}
                                    />
                                    {team.team_name} {Math.round(team.score)}分
                                    {idx < Math.min(result.teams.length, 4) - 1 && <span className="mx-1 text-gray-400">·</span>}
                                  </span>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="text-center pt-2">
                      <button 
                        onClick={() => setCurrentView('scores')}
                        className="px-4 py-2 bg-[#F15B98] hover:bg-[#F15B98]/90 text-white font-bold text-sm rounded-lg transition-colors"
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
          onClose={() => {
            setSelectedEvent(null)
            // URL 更新由 EventDetail 组件内部处理
          }}
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
          onClose={() => {
            setSelectedInformationItem(null)
            // URL 更新由 InformationCenterDetail 组件内部处理
          }}
        />
      )}
    </div>
  )
}