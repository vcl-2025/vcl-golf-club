import React, { useState, useEffect } from 'react'
import {
  Plus, Edit, Trash2, Users, DollarSign, Calendar, MapPin, ChevronDown, ChevronRight,
  BarChart3, Settings, Eye, Download, Image as ImageIcon, Trophy, Receipt, Clock, Search, Filter, X, Pin, User, Menu, MoreVertical
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Event, EventRegistration } from '../types'
import EventForm from './EventForm'
import EventRegistrationAdmin from './EventRegistrationAdmin'
import PosterForm from './PosterForm'
import ScoreForm from './ScoreForm'
import InvestmentAdmin from './InvestmentAdmin'
import ExpenseAdmin from './ExpenseAdmin'
import MemberAdmin from './MemberAdmin'
import AdminAnalytics from './AdminAnalytics'
import InformationCenterForm from './InformationCenterForm'
import AuditLogViewer from './AuditLogViewer'
import RolePermissionsManager from './RolePermissionsManager'
import { useModal } from './ModalProvider'
import { getEventStatus, getEventStatusText, getEventStatusStyles } from '../utils/eventStatus'
import { InformationItem } from '../types'
import { FileText as FileTextIcon, Shield } from 'lucide-react'
import { deleteWithAudit, updateWithAudit, createAuditContext, logBatchOperation, type UserRole } from '../lib/audit'
import { useAuth } from '../hooks/useAuth'
import { getUserModulePermissions, type ModuleName, type ModulePermission } from '../lib/modulePermissions'

interface AdminStats {
  // 活动统计
  total_events: number
  upcoming_events: number
  active_events: number
  completed_events: number
  cancelled_events: number
  
  // 报名统计
  total_registrations: number
  paid_registrations: number
  pending_payments: number
  cancelled_registrations: number
  
  // 财务统计
  total_revenue: number
  pending_revenue: number
  average_event_fee: number
  
  // 会员统计
  total_members: number
  active_members: number
  new_members_this_month: number
  
  // 成绩统计
  total_scores: number
  average_score: number
  best_score: number
  
  // 投资统计
  total_investments: number
  total_investment_amount: number
  active_investment_projects: number
  
  // 费用统计
  total_expenses: number
  total_expense_amount: number
  monthly_expenses: number
}

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

interface AdminPanelProps {
  adminMenuVisible?: boolean
}

export default function AdminPanel({ adminMenuVisible = true }: AdminPanelProps) {
  const { user } = useAuth()
  const [headerHeight, setHeaderHeight] = useState(0)
  const [currentView, setCurrentView] = useState<'dashboard' | 'events' | 'registrations' | 'posters' | 'scores' | 'investments' | 'expenses' | 'members' | 'information' | 'audit' | 'role_permissions'>('dashboard')
  
  // 用户角色状态（用于检查是否为admin）
  const [userRole, setUserRole] = useState<string | null>(null)
  
  // 模块权限状态
  const [modulePermissions, setModulePermissions] = useState<Record<ModuleName, ModulePermission>>({
    members: { can_access: false, can_create: false, can_update: false, can_delete: false },
    events: { can_access: false, can_create: false, can_update: false, can_delete: false },
    scores: { can_access: false, can_create: false, can_update: false, can_delete: false },
    expenses: { can_access: false, can_create: false, can_update: false, can_delete: false },
    information: { can_access: false, can_create: false, can_update: false, can_delete: false },
    posters: { can_access: false, can_create: false, can_update: false, can_delete: false },
    investments: { can_access: false, can_create: false, can_update: false, can_delete: false },
    audit: { can_access: false, can_create: false, can_update: false, can_delete: false }
  })
  
  // 计算会员导航菜单的高度，用于设置管理端菜单的 top 值
  useEffect(() => {
    const calculateHeaderHeight = () => {
      // 查找 Dashboard 中的 header 元素（会员导航菜单）
      // 使用更精确的选择器：Dashboard 中的 header 有 sticky top-0 z-50
      const header = document.querySelector('header.shadow-sm.border-b.sticky.top-0.z-50') as HTMLElement
      if (header) {
        setHeaderHeight(header.offsetHeight)
      } else {
        // 如果找不到，使用默认值（大约 80-100px）
        setHeaderHeight(80)
      }
    }
    
    calculateHeaderHeight()
    window.addEventListener('resize', calculateHeaderHeight)
    
    // 延迟计算，确保 DOM 已渲染
    const timer = setTimeout(calculateHeaderHeight, 100)
    const timer2 = setTimeout(calculateHeaderHeight, 500) // 再次延迟，确保完全加载
    
    return () => {
      window.removeEventListener('resize', calculateHeaderHeight)
      clearTimeout(timer)
      clearTimeout(timer2)
    }
  }, [])

  // 隐藏的审计日志和角色权限访问方式：URL参数和快捷键（仅admin）
  useEffect(() => {
    // 检查URL参数（不依赖userRole，先检查URL）
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('audit') === '1' || urlParams.get('view') === 'audit') {
      // 延迟检查权限，等userRole加载后再验证
      if (userRole === 'admin') {
        setCurrentView('audit')
      }
    }
    if (urlParams.get('role_permissions') === '1' || urlParams.get('view') === 'role_permissions') {
      // 延迟检查权限，等userRole加载后再验证
      if (userRole === 'admin') {
        setCurrentView('role_permissions')
      }
    }

    // 快捷键处理（只有admin才能使用）
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果userRole还没加载，不处理快捷键
      if (userRole !== 'admin') return
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifierKey = isMac ? e.metaKey : e.ctrlKey
      
      // Ctrl+Shift+A (Windows/Linux) 或 Cmd+Shift+A (Mac) - 审计日志
      if (modifierKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setCurrentView(prev => {
          const newView = prev === 'audit' ? 'dashboard' : 'audit'
          const url = new URL(window.location.href)
          if (newView === 'audit') {
            url.searchParams.set('audit', '1')
          } else {
            url.searchParams.delete('audit')
            url.searchParams.delete('view')
          }
          window.history.pushState({}, '', url.toString())
          return newView
        })
      }
      
      // Ctrl+Shift+R (Windows/Linux) 或 Cmd+Shift+R (Mac) - 角色权限
      if (modifierKey && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault()
        setCurrentView(prev => {
          const newView = prev === 'role_permissions' ? 'dashboard' : 'role_permissions'
          const url = new URL(window.location.href)
          if (newView === 'role_permissions') {
            url.searchParams.set('role_permissions', '1')
          } else {
            url.searchParams.delete('role_permissions')
            url.searchParams.delete('view')
          }
          window.history.pushState({}, '', url.toString())
          return newView
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentView, userRole])
  
  const [selectedEventForRegistration, setSelectedEventForRegistration] = useState<Event | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [posters, setPosters] = useState<Poster[]>([])
  const [scores, setScores] = useState<any[]>([])
  const [guestScores, setGuestScores] = useState<any[]>([])
  const [eventRegistrations, setEventRegistrations] = useState<any[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedPoster, setSelectedPoster] = useState<Poster | null>(null)
  const [selectedScore, setSelectedScore] = useState<any>(null)
  const [informationItems, setInformationItems] = useState<InformationItem[]>([])
  const [selectedInformationItem, setSelectedInformationItem] = useState<InformationItem | null>(null)
  const [showEventForm, setShowEventForm] = useState(false)
  const [showPosterForm, setShowPosterForm] = useState(false)
  const [showScoreForm, setShowScoreForm] = useState(false)
  const [showInformationForm, setShowInformationForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'active' | 'cancelled' | 'completed'>('all')
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [scoreSearchTerm, setScoreSearchTerm] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null)
  const [informationSearchTerm, setInformationSearchTerm] = useState('')
  const [informationStatusFilter, setInformationStatusFilter] = useState<string>('all')
  const [informationCategoryFilter, setInformationCategoryFilter] = useState<string>('all')
  
  // 排序状态
  const [sortField, setSortField] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  const { confirmDelete, showSuccess, showError } = useModal()

  // 获取用户模块权限和角色
  useEffect(() => {
    if (user?.id) {
      // 获取用户角色
      supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setUserRole(data.role || 'member')
          }
        })
        .catch(error => {
          console.error('获取用户角色失败:', error)
        })
      
      // 获取模块权限
      getUserModulePermissions(user.id).then(permissions => {
        setModulePermissions(permissions)
      }).catch(error => {
        console.error('获取模块权限失败:', error)
      })
    }
  }, [user])

  useEffect(() => {
    fetchAdminData()
    
    // 监听来自AdminAnalytics的导航事件
    const handleAdminNavigate = (event: CustomEvent) => {
      const { view } = event.detail
      if (view === 'events' || view === 'investments') {
        setCurrentView(view)
      }
    }
    
    window.addEventListener('admin-navigate', handleAdminNavigate as EventListener)
    
    return () => {
      window.removeEventListener('admin-navigate', handleAdminNavigate as EventListener)
    }
  }, [])

  // 获取用户模块权限和角色
  useEffect(() => {
    if (user?.id) {
      // 获取用户角色
      supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setUserRole(data.role || 'member')
          }
        })
        .catch(error => {
          console.error('获取用户角色失败:', error)
        })
      
      // 获取模块权限
      getUserModulePermissions(user.id).then(permissions => {
        setModulePermissions(permissions)
      }).catch(error => {
        console.error('获取模块权限失败:', error)
      })
    }
  }, [user])

  // 点击外部关闭操作菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openActionMenuId) {
        const target = event.target as HTMLElement
        if (!target.closest('.action-menu-container')) {
          setOpenActionMenuId(null)
        }
      }
    }

    if (openActionMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openActionMenuId])

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
      }
      return newSet
    })
  }

  // 排序函数
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // 获取排序后的信息中心列表
  const getSortedInformationItems = () => {
    let sorted = [...informationItems]
    
    if (sortField && sortField.startsWith('information_')) {
      const field = sortField.replace('information_', '')
      sorted.sort((a, b) => {
        let aValue: any
        let bValue: any
        
        switch (field) {
          case 'title':
            aValue = a.title
            bValue = b.title
            break
          case 'published_at':
            aValue = a.published_at ? new Date(a.published_at).getTime() : 0
            bValue = b.published_at ? new Date(b.published_at).getTime() : 0
            break
          case 'view_count':
            aValue = a.view_count || 0
            bValue = b.view_count || 0
            break
          case 'display_order':
            aValue = a.display_order || 0
            bValue = b.display_order || 0
            break
          default:
            return 0
        }
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }
    
    return sorted
  }

  // 获取排序后的活动列表
  const getSortedEvents = () => {
    if (!sortField) return events

    return [...events].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'title':
          aValue = a.title
          bValue = b.title
          break
        case 'start_time':
          aValue = new Date(a.start_time).getTime()
          bValue = new Date(b.start_time).getTime()
          break
        case 'location':
          aValue = a.location
          bValue = b.location
          break
        case 'fee':
          aValue = a.fee
          bValue = b.fee
          break
        case 'status':
          aValue = getEventStatus(a)
          bValue = getEventStatus(b)
          break
        case 'registrations':
          // 报名情况排序 - 按已报名人数
          const aRegistrations = eventRegistrations.filter(reg => reg.event_id === a.id && reg.approval_status === 'approved').length
          const bRegistrations = eventRegistrations.filter(reg => reg.event_id === b.id && reg.approval_status === 'approved').length
          aValue = aRegistrations
          bValue = bRegistrations
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  // 过滤活动
  const filteredEvents = events.filter(e => {
    const status = getEventStatus(e)
    
    // 根据当前视图使用不同的筛选条件
    if (currentView === 'scores') {
      // 成绩管理：只显示已结束的活动，使用成绩搜索条件
      if (status !== 'completed') return false
      
      const matchesSearch = !scoreSearchTerm || 
        e.title.toLowerCase().includes(scoreSearchTerm.toLowerCase()) ||
        e.location?.toLowerCase().includes(scoreSearchTerm.toLowerCase())
      
      const matchesYear = !selectedYear || 
        new Date(e.start_time).getFullYear().toString() === selectedYear
      
      const matchesMonth = !selectedMonth || 
        (new Date(e.start_time).getMonth() + 1).toString() === selectedMonth
      
      return matchesSearch && matchesYear && matchesMonth
    } else {
      // 其他视图：使用原来的筛选逻辑
      const matchesStatus = statusFilter === 'all' || status === statusFilter
      const matchesSearch = !searchTerm || 
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.location?.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesStatus && matchesSearch
    }
  })

  // 获取可用的年份和月份
  const availableYears = [...new Set(events
    .filter(e => getEventStatus(e) === 'completed')
    .map(e => {
      const date = new Date(e.start_time)
      return isNaN(date.getTime()) ? null : date.getFullYear()
    })
    .filter(year => year !== null)
  )].sort((a, b) => b - a)

  const availableMonths = [
    { value: '1', label: '1月' },
    { value: '2', label: '2月' },
    { value: '3', label: '3月' },
    { value: '4', label: '4月' },
    { value: '5', label: '5月' },
    { value: '6', label: '6月' },
    { value: '7', label: '7月' },
    { value: '8', label: '8月' },
    { value: '9', label: '9月' },
    { value: '10', label: '10月' },
    { value: '11', label: '11月' },
    { value: '12', label: '12月' }
  ]


  const fetchAdminData = async () => {
    try {
      // 获取统计数据
      const { data: statsData } = await supabase.rpc('get_admin_event_stats')
      setStats(statsData)

      // 获取所有活动
      const { data: eventsData, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setEvents(eventsData || [])

      // 获取所有海报
      const { data: postersData, error: postersError } = await supabase
        .from('posters')
        .select('*')
        .order('display_order', { ascending: true })
        .order('event_date', { ascending: false })

      if (postersError) throw postersError
      setPosters(postersData || [])

      // 获取信息中心数据
      const { data: informationData, error: informationError } = await supabase
        .from('information_items')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('display_order', { ascending: true })
        .order('published_at', { ascending: false })

      if (informationError) throw informationError
      setInformationItems(informationData || [])

      // 获取所有报名记录
      const { data: registrationsData, error: registrationsError } = await supabase
        .from('event_registrations')
        .select('event_id, user_id, payment_status, approval_status')

      if (registrationsError) throw registrationsError
      // console.log('获取到的报名记录:', registrationsData)
      setEventRegistrations(registrationsData || [])

      // 获取所有成绩（包括团体赛需要的字段）
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select(`
          *,
          user_profiles (
            id,
            full_name,
            avatar_url,
            avatar_position_x,
            avatar_position_y
          )
        `)
        .order('created_at', { ascending: false })


      if (scoresError) {
        console.error('获取成绩数据失败:', scoresError)
        setScores([])
      } else {
        // 直接使用 JOIN 查询的结果，user_profiles 已经在 scoresData 中了
        // 如果某些记录缺少 user_profiles，使用默认值
        const scoresWithProfiles = (scoresData || []).map(score => {
          // 确保 user_profiles 对象存在，如果不存在或缺少字段，使用默认值
          const userProfile = score.user_profiles || {}
          return {
            ...score,
            user_profiles: {
              id: userProfile.id || score.user_id,
              full_name: userProfile.full_name || '未知',
              avatar_url: userProfile.avatar_url || null,
              avatar_position_x: userProfile.avatar_position_x || 50,
              avatar_position_y: userProfile.avatar_position_y || 50
            }
          }
        })

        setScores(scoresWithProfiles)
      }

      // 获取所有访客成绩
      const { data: guestScoresData, error: guestScoresError } = await supabase
        .from('guest_scores')
        .select('*')
        .order('created_at', { ascending: false })

      if (guestScoresError) {
        console.error('获取访客成绩数据失败:', guestScoresError)
        setGuestScores([])
      } else {
        setGuestScores(guestScoresData || [])
      }
    } catch (error) {
      console.error('获取管理数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    confirmDelete('确定要删除这个活动吗？这将同时删除所有相关的报名记录。', async () => {
      try {
        if (!user || !supabase) {
          showError('请先登录')
          return
        }

        // 获取用户角色
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        const userRole = (profile?.role || 'member') as UserRole

        // 创建审计上下文
        const context = await createAuditContext(user.id)

        // 使用审计功能删除
        const { error } = await deleteWithAudit(
          'events',
          eventId,
          context,
          userRole
        )

        if (error) throw error

        setEvents(events.filter(e => e.id !== eventId))
        showSuccess('活动删除成功')
      } catch (error: any) {
        console.error('删除活动失败:', error)
        showError(`删除失败: ${error.message || '请重试'}`)
      }
    })
  }

  const handleUpdateEventStatus = async (eventId: string, status: string) => {
    try {
      if (!user || !supabase) {
        showError('请先登录')
        return
      }

      // 获取用户角色
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const userRole = (profile?.role || 'member') as UserRole

      // 创建审计上下文
      const context = await createAuditContext(user.id)

      // 使用审计功能更新
      const { error } = await updateWithAudit(
        'events',
        eventId,
        { status },
        context,
        userRole
      )

      if (error) throw error

      setEvents(events.map(e =>
        e.id === eventId ? { ...e, status } : e
      ))
      showSuccess('状态更新成功')
    } catch (error: any) {
      console.error('更新状态失败:', error)
      showError(`更新失败: ${error.message || '请重试'}`)
    }
  }

  const handleDeletePoster = async (posterId: string) => {
    confirmDelete('确定要删除这张海报吗？', async () => {
      try {
        if (!user || !supabase) {
          showError('请先登录')
          return
        }

        // 获取用户角色
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        const userRole = (profile?.role || 'member') as UserRole

        // 创建审计上下文
        const context = await createAuditContext(user.id)

        // 使用审计功能删除
        const { error } = await deleteWithAudit(
          'posters',
          posterId,
          context,
          userRole
        )

        if (error) throw error

        setPosters(posters.filter(p => p.id !== posterId))
        showSuccess('海报删除成功')
      } catch (error: any) {
        console.error('删除海报失败:', error)
        showError(`删除失败: ${error.message || '请重试'}`)
      }
    })
  }

  const handleDeleteScore = async (scoreId: string) => {
    confirmDelete('确定要删除这条成绩记录吗？', async () => {
      try {
        if (!user || !supabase) {
          showError('请先登录')
          return
        }

        // 成绩管理删除不记录审计日志
        const { error } = await supabase
          .from('scores')
          .delete()
          .eq('id', scoreId)

        if (error) throw error

        setScores(scores.filter(s => s.id !== scoreId))
        showSuccess('成绩删除成功')
      } catch (error: any) {
        console.error('删除成绩失败:', error)
        showError(`删除失败: ${error.message || '请重试'}`)
      }
    })
  }

  // 删除整个活动的所有成绩（包括scores和guest_scores）
  const handleDeleteAllScoresForEvent = async (eventId: string) => {
    const event = events.find(e => e.id === eventId)
    const eventTitle = event?.title || '该活动'
    
    confirmDelete(`确定要删除"${eventTitle}"的所有成绩记录吗？\n这将删除会员成绩和访客成绩，删除后可以重新导入。`, async () => {
      try {
        setLoading(true)
        
        if (!user || !supabase) {
          showError('请先登录')
          return
        }

        // 获取用户角色
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        const userRole = (profile?.role || 'member') as UserRole

        // 创建审计上下文
        const context = await createAuditContext(user.id)

        // 先获取所有要删除的记录数量（用于审计日志）
        const { data: scoresToDelete, error: fetchScoresError } = await supabase
          .from('scores')
          .select('id')
          .eq('event_id', eventId)

        if (fetchScoresError) {
          console.error('获取会员成绩失败:', fetchScoresError)
          throw fetchScoresError
        }

        const { data: guestScoresToDelete, error: fetchGuestScoresError } = await supabase
          .from('guest_scores')
          .select('id')
          .eq('event_id', eventId)

        if (fetchGuestScoresError) {
          console.error('获取访客成绩失败:', fetchGuestScoresError)
          throw fetchGuestScoresError
        }

        const memberScoreCount = scoresToDelete?.length || 0
        const guestScoreCount = guestScoresToDelete?.length || 0

        // 批量删除会员成绩（不逐条记录审计）
        if (memberScoreCount > 0) {
          const { error: deleteScoresError } = await supabase
            .from('scores')
            .delete()
            .eq('event_id', eventId)

          if (deleteScoresError) {
            console.error('删除会员成绩失败:', deleteScoresError)
            throw deleteScoresError
          }
        }

        // 批量删除访客成绩（不逐条记录审计）
        if (guestScoreCount > 0) {
          const { error: deleteGuestScoresError } = await supabase
            .from('guest_scores')
            .delete()
            .eq('event_id', eventId)

          if (deleteGuestScoresError) {
            console.error('删除访客成绩失败:', deleteGuestScoresError)
            throw deleteGuestScoresError
          }
        }

        // 记录批量删除操作审计日志（只记录一条）
        if (memberScoreCount > 0 || guestScoreCount > 0) {
          await logBatchOperation(
            'scores',
            'BATCH_DELETE',
            memberScoreCount + guestScoreCount,
            context,
            {
              event_id: eventId,
              event_title: eventTitle,
              member_count: memberScoreCount,
              guest_count: guestScoreCount,
            }
          )
        }

        // 更新本地状态
        setScores(scores.filter(s => s.event_id !== eventId))
        
        // 刷新数据
        await fetchAdminData()
        
        showSuccess('所有成绩记录已删除，可以重新导入')
      } catch (error: any) {
        console.error('删除成绩失败:', error)
        showError(`删除失败: ${error.message || '请重试'}`)
      } finally {
        setLoading(false)
      }
    })
  }

  const handleDeleteInformation = async (itemId: string) => {
    confirmDelete('确定要删除这条信息吗？', async () => {
      try {
        if (!user || !supabase) {
          showError('请先登录')
          return
        }

        // 获取用户角色
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        const userRole = (profile?.role || 'member') as UserRole

        // 创建审计上下文
        const context = await createAuditContext(user.id)

        // 使用审计功能删除
        const { error } = await deleteWithAudit(
          'information_items',
          itemId,
          context,
          userRole
        )

        if (error) throw error

        setInformationItems(informationItems.filter(item => item.id !== itemId))
        showSuccess('信息删除成功')
      } catch (error: any) {
        console.error('删除信息失败:', error)
        showError(`删除失败: ${error.message || '请重试'}`)
      }
    })
  }


  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '¥0.00'
    }
    return `¥${amount.toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 管理员导航 */}
      <div 
        className={`rounded-3xl p-4 shadow-lg sticky z-[60] transition-all duration-400 ease-in-out ${
          adminMenuVisible 
            ? 'opacity-100 transform translate-y-0 scale-100' 
            : 'opacity-0 transform -translate-y-4 scale-95 pointer-events-none'
        }`}
        style={{
          backgroundColor: '#619f56',
          borderColor: 'rgba(255,255,255,0.2)',
          transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out',
          top: headerHeight > 0 ? `${headerHeight}px` : '0px'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-500/30 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">管理员控制台</h1>
              <p className="text-xs text-green-200 font-medium">系统管理中心</p>
            </div>
          </div>
          
          {/* 手机端菜单按钮 */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden px-3 py-2 rounded-xl font-medium transition-all duration-300 flex items-center text-white/90 hover:bg-green-500/20 hover:text-white"
          >
            <Menu className="w-5 h-5 mr-2" />
            <span>菜单</span>
          </button>
          
          {/* 桌面端横向菜单 */}
          <div className="hidden lg:flex space-x-3">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`px-3 py-2 rounded-xl font-medium transition-all duration-300 flex items-center ${
                currentView === 'dashboard'
                  ? 'bg-green-500/40 text-white shadow-lg transform scale-105'
                  : 'text-white/90 hover:bg-green-500/20 hover:text-white hover:shadow-md'
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              数据统计
            </button>
            {modulePermissions.information.can_access && (
              <button
                onClick={() => setCurrentView('information')}
                className={`px-3 py-2 rounded-xl font-medium transition-all duration-300 flex items-center ${
                  currentView === 'information'
                    ? 'bg-green-500/40 text-white shadow-lg transform scale-105'
                    : 'text-white/90 hover:bg-green-500/20 hover:text-white hover:shadow-md'
                }`}
              >
                <FileTextIcon className="w-4 h-4 mr-2" />
                信息中心管理
              </button>
            )}
            {modulePermissions.events.can_access && (
              <button
                onClick={() => setCurrentView('events')}
                className={`px-3 py-2 rounded-xl font-medium transition-all duration-300 flex items-center ${
                  currentView === 'events'
                    ? 'bg-green-500/40 text-white shadow-lg transform scale-105'
                    : 'text-white/90 hover:bg-green-500/20 hover:text-white hover:shadow-md'
                }`}
              >
                <Calendar className="w-4 h-4 mr-2" />
                活动管理
              </button>
            )}
            {modulePermissions.scores.can_access && (
              <button
                onClick={() => setCurrentView('scores')}
                className={`px-3 py-2 rounded-xl font-medium transition-all duration-300 flex items-center ${
                  currentView === 'scores'
                    ? 'bg-green-500/40 text-white shadow-lg transform scale-105'
                    : 'text-white/90 hover:bg-green-500/20 hover:text-white hover:shadow-md'
                }`}
              >
                <Trophy className="w-4 h-4 mr-2" />
                成绩管理
              </button>
            )}
            {modulePermissions.investments.can_access && (
              <button
                onClick={() => setCurrentView('investments')}
                className={`px-3 py-2 rounded-xl font-medium transition-all duration-300 flex items-center ${
                  currentView === 'investments'
                    ? 'bg-green-500/40 text-white shadow-lg transform scale-105'
                    : 'text-white/90 hover:bg-green-500/20 hover:text-white hover:shadow-md'
                }`}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                捐赠管理
              </button>
            )}
            {modulePermissions.expenses.can_access && (
              <button
                onClick={() => setCurrentView('expenses')}
                className={`px-3 py-2 rounded-xl font-medium transition-all duration-300 flex items-center ${
                  currentView === 'expenses'
                    ? 'bg-green-500/40 text-white shadow-lg transform scale-105'
                    : 'text-white/90 hover:bg-green-500/20 hover:text-white hover:shadow-md'
                }`}
              >
                <Receipt className="w-4 h-4 mr-2" />
                费用管理
              </button>
            )}
            {modulePermissions.members.can_access && (
              <button
                onClick={() => setCurrentView('members')}
                className={`px-3 py-2 rounded-xl font-medium transition-all duration-300 flex items-center ${
                  currentView === 'members'
                    ? 'bg-green-500/40 text-white shadow-lg transform scale-105'
                    : 'text-white/90 hover:bg-green-500/20 hover:text-white hover:shadow-md'
                }`}
              >
                <Users className="w-4 h-4 mr-2" />
                会员管理
              </button>
            )}
          </div>
        </div>
        
        {/* 手机端下拉菜单 */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-4 space-y-2">
            <button
              onClick={() => {
                setCurrentView('dashboard')
                setMobileMenuOpen(false)
              }}
              className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-between ${
                currentView === 'dashboard' 
                  ? 'bg-green-500/40 text-white shadow-lg' 
                  : 'text-white/90 hover:bg-green-500/20 hover:text-white'
              }`}
            >
              <div className="flex items-center">
                <BarChart3 className="w-4 h-4 mr-2" />
                数据统计
              </div>
              {currentView === 'dashboard' && <ChevronRight className="w-4 h-4" />}
            </button>
            {modulePermissions.information.can_access && (
              <button
                onClick={() => {
                  setCurrentView('information')
                  setMobileMenuOpen(false)
                }}
                className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-between ${
                  currentView === 'information'
                    ? 'bg-green-500/40 text-white shadow-lg'
                    : 'text-white/90 hover:bg-green-500/20 hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <FileTextIcon className="w-4 h-4 mr-2" />
                  信息中心管理
                </div>
                {currentView === 'information' && <ChevronRight className="w-4 h-4" />}
              </button>
            )}
            {modulePermissions.events.can_access && (
              <button
                onClick={() => {
                  setCurrentView('events')
                  setMobileMenuOpen(false)
                }}
                className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-between ${
                  currentView === 'events'
                    ? 'bg-green-500/40 text-white shadow-lg'
                    : 'text-white/90 hover:bg-green-500/20 hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  活动管理
                </div>
                {currentView === 'events' && <ChevronRight className="w-4 h-4" />}
              </button>
            )}
            {modulePermissions.scores.can_access && (
              <button
                onClick={() => {
                  setCurrentView('scores')
                  setMobileMenuOpen(false)
                }}
                className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-between ${
                  currentView === 'scores'
                    ? 'bg-green-500/40 text-white shadow-lg'
                    : 'text-white/90 hover:bg-green-500/20 hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <Trophy className="w-4 h-4 mr-2" />
                  成绩管理
                </div>
                {currentView === 'scores' && <ChevronRight className="w-4 h-4" />}
              </button>
            )}
            {modulePermissions.investments.can_access && (
              <button
                onClick={() => {
                  setCurrentView('investments')
                  setMobileMenuOpen(false)
                }}
                className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-between ${
                  currentView === 'investments'
                    ? 'bg-green-500/40 text-white shadow-lg'
                    : 'text-white/90 hover:bg-green-500/20 hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  捐赠管理
                </div>
                {currentView === 'investments' && <ChevronRight className="w-4 h-4" />}
              </button>
            )}
            {modulePermissions.expenses.can_access && (
              <button
                onClick={() => {
                  setCurrentView('expenses')
                  setMobileMenuOpen(false)
                }}
                className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-between ${
                  currentView === 'expenses'
                    ? 'bg-green-500/40 text-white shadow-lg'
                    : 'text-white/90 hover:bg-green-500/20 hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <Receipt className="w-4 h-4 mr-2" />
                  费用管理
                </div>
                {currentView === 'expenses' && <ChevronRight className="w-4 h-4" />}
              </button>
            )}
            {modulePermissions.members.can_access && (
              <button
                onClick={() => {
                  setCurrentView('members')
                  setMobileMenuOpen(false)
                }}
                className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-between ${
                  currentView === 'members'
                    ? 'bg-green-500/40 text-white shadow-lg'
                    : 'text-white/90 hover:bg-green-500/20 hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  会员管理
                </div>
                {currentView === 'members' && <ChevronRight className="w-4 h-4" />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 数据统计 */}
      {currentView === 'dashboard' && (
        <div className="p-[5px] lg:p-0 m-0.5 lg:m-0">
          <div className="flex items-center mb-6">
            <BarChart3 className="w-6 h-6 text-golf-600 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">数据统计</h2>
          </div>
          <AdminAnalytics />
        </div>
      )}

      {/* 角色权限管理 - 仅admin可通过URL参数或快捷键访问 */}
      {currentView === 'role_permissions' && userRole === 'admin' && (
        <RolePermissionsManager />
      )}

      {/* 活动管理 */}
      {currentView === 'events' && modulePermissions.events.can_access && (
        <div className="bg-white rounded-2xl p-[5px] lg:p-6 m-0.5 lg:m-0 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-gray-900">活动管理</h2>
              {(() => {
                const totalPending = eventRegistrations.filter(reg => reg.approval_status === 'pending').length
                return totalPending > 0 ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 animate-pulse">
                    {totalPending} 个待审批申请
                  </span>
                ) : null
              })()}
            </div>
            {modulePermissions.events.can_create && (
              <button
                onClick={() => {
                  setSelectedEvent(null)
                  setShowEventForm(true)
                }}
                className="btn-primary flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                创建活动
              </button>
            )}
          </div>

          {/* 搜索和筛选 */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜索活动名称或地点..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">所有状态</option>
                <option value="upcoming">未开始</option>
                <option value="active">进行中</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
            
            {/* 清除筛选按钮 - 只在有筛选条件时显示 */}
            {(searchTerm || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                清除所有筛选
              </button>
            )}
          </div>

          {/* 筛选状态提示 */}
          {(searchTerm || statusFilter !== 'all') && (
            <div className="text-sm text-gray-600 mb-4">
              共 {getSortedEvents().filter(e => {
                const status = getEventStatus(e)
                const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                     e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                     e.location?.toLowerCase().includes(searchTerm.toLowerCase())
                const matchesStatus = statusFilter === 'all' || status === statusFilter
                return matchesSearch && matchesStatus
              }).length} 个活动
              <span className="text-blue-600 ml-2">
                (已过滤，共 {events.length} 个活动)
              </span>
            </div>
          )}

          {/* 活动列表 */}
          <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-200">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-4 text-left text-base font-semibold text-gray-700 cursor-pointer hover:bg-green-100 select-none w-56"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>活动名称</span>
                      {sortField === 'title' && (
                        <span className="text-gray-400">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-base font-semibold text-gray-700 cursor-pointer hover:bg-green-100 select-none w-44"
                    onClick={() => handleSort('start_time')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>活动信息</span>
                      {sortField === 'start_time' && (
                        <span className="text-gray-400">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-center text-base font-semibold text-gray-700 cursor-pointer hover:bg-green-100 select-none w-28"
                    onClick={() => handleSort('event_type')}
                    style={{ writingMode: 'horizontal-tb', textOrientation: 'mixed' }}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>活动详情</span>
                      {sortField === 'event_type' && (
                        <span className="text-gray-400">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-center text-base font-semibold text-gray-700 cursor-pointer hover:bg-green-100 select-none w-20"
                    onClick={() => handleSort('registrations')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>报名情况</span>
                      {sortField === 'registrations' && (
                        <span className="text-gray-400">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-center text-base font-semibold text-gray-700 cursor-pointer hover:bg-green-100 select-none w-12"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>状态</span>
                      {sortField === 'status' && (
                        <span className="text-gray-400">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-2 md:px-6 py-4 text-center text-base font-semibold text-gray-700 w-24 md:w-24 min-w-[50px]">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getSortedEvents().filter(e => {
                  const status = getEventStatus(e)
                  const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                       e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                       e.location?.toLowerCase().includes(searchTerm.toLowerCase())
                  const matchesStatus = statusFilter === 'all' || status === statusFilter
                  return matchesSearch && matchesStatus
                }).map((event) => (
                  <tr key={event.id} className="hover:bg-green-50">
                    <td className="px-6 py-4 w-56">
                      <div className="font-medium text-gray-900 truncate" title={event.title}>{event.title}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 w-44">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium">{new Date(event.start_time).toLocaleDateString('zh-CN')}</span>
                          <span className="text-sm text-gray-500">{new Date(event.start_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                          <span className="text-sm text-gray-600 break-words">{event.location}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 w-28" style={{ writingMode: 'horizontal-tb', textOrientation: 'mixed' }}>
                      <div className="space-y-2">
                        <div className="text-center">
                          <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                            event.event_type === '个人赛' ? 'bg-blue-100 text-blue-800' :
                            event.event_type === '团体赛' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {event.event_type}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-sm font-bold text-red-600">{formatCurrency(event.fee)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 w-20">
                      <div className="text-center">
                        {(() => {
                          const allRegistrations = eventRegistrations.filter(reg => reg.event_id === event.id)
                          const approvedRegistrations = allRegistrations.filter(reg => reg.approval_status === 'approved')
                          const pendingRegistrations = allRegistrations.filter(reg => reg.approval_status === 'pending')
                          
                          return (
                            <div className="space-y-1">
                              <div className="text-sm font-medium">{approvedRegistrations.length}/{event.max_participants}</div>
                              {pendingRegistrations.length > 0 && (
                                <div className="text-xs text-yellow-600 font-medium animate-pulse">
                                  {pendingRegistrations.length} 待审批
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap w-12">
                      <div className="text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventStatusStyles(getEventStatus(event))}`}>
                          {getEventStatusText(getEventStatus(event))}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 md:px-6 py-4 whitespace-nowrap text-sm font-medium w-24 md:w-24 min-w-[50px]">
                      {/* 只有有操作权限时才显示操作列 */}
                      {(modulePermissions.events.can_update || modulePermissions.events.can_delete) && (
                        <>
                          {/* 桌面端：横向图标 */}
                          <div className="hidden md:flex items-center justify-center space-x-2">
                            {modulePermissions.events.can_update && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedEventForRegistration(event)
                                  }}
                                  className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50"
                                  title="报名管理"
                                >
                                  <Users className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedEvent(event)
                                    setShowEventForm(true)
                                  }}
                                  className="text-green-600 hover:text-green-800 p-2 rounded hover:bg-green-50"
                                  title="编辑"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {modulePermissions.events.can_delete && (
                              <button
                                onClick={() => handleDeleteEvent(event.id)}
                                className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          
                          {/* 手机端：三个点菜单 */}
                          <div className="md:hidden relative action-menu-container flex items-center justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenActionMenuId(openActionMenuId === event.id ? null : event.id)
                              }}
                              className="text-gray-600 hover:text-gray-800 p-1.5 rounded hover:bg-gray-50"
                              title="操作"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                            
                            {/* 下拉菜单 */}
                            {openActionMenuId === event.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[140px]">
                                {modulePermissions.events.can_update && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setSelectedEventForRegistration(event)
                                        setOpenActionMenuId(null)
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center space-x-2"
                                    >
                                      <Users className="w-4 h-4" />
                                      <span>报名管理</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedEvent(event)
                                        setShowEventForm(true)
                                        setOpenActionMenuId(null)
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center space-x-2"
                                    >
                                      <Edit className="w-4 h-4" />
                                      <span>编辑</span>
                                    </button>
                                  </>
                                )}
                                {modulePermissions.events.can_delete && (
                                  <button
                                    onClick={() => {
                                      handleDeleteEvent(event.id)
                                      setOpenActionMenuId(null)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>删除</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm || statusFilter !== 'all' ? '没有找到匹配的活动' : '暂无活动'}
            </div>
          )}
        </div>
      )}

      {/* 活动表单弹窗 */}
      {showEventForm && (
        <EventForm
          event={selectedEvent}
          onClose={() => {
            setShowEventForm(false)
            setSelectedEvent(null)
          }}
          onSuccess={() => {
            setShowEventForm(false)
            setSelectedEvent(null)
            fetchAdminData()
          }}
        />
      )}

      {/* 海报管理 */}
      {currentView === 'posters' && modulePermissions.posters.can_access && (
        <div className="bg-white rounded-2xl p-[5px] lg:p-6 m-0.5 lg:m-0 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">海报管理</h2>
            <button
              onClick={() => {
                setSelectedPoster(null)
                setShowPosterForm(true)
              }}
              className="btn-primary flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              添加海报
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posters.map((poster) => (
              <div key={poster.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-[3/4] bg-gray-100">
                  <img
                    src={poster.image_url}
                    alt={poster.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">{poster.title}</h3>
                  <div className="text-sm text-gray-600 mb-3">
                    排序: {poster.display_order} | {new Date(poster.event_date).toLocaleDateString('zh-CN')}
                  </div>
                  <div className="flex items-center space-x-2">
                    {modulePermissions.posters.can_update && (
                      <button
                        onClick={() => {
                          setSelectedPoster(poster)
                          setShowPosterForm(true)
                        }}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        编辑
                      </button>
                    )}
                    {modulePermissions.posters.can_delete && (
                      <button
                        onClick={() => handleDeletePoster(poster.id)}
                        className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {posters.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              暂无海报，点击"添加海报"开始创建
            </div>
          )}
        </div>
      )}

      {/* 成绩管理 */}
      {currentView === 'scores' && modulePermissions.scores.can_access && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-[5px] lg:p-6 m-0.5 lg:m-0">
          <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Trophy className="w-7 h-7 text-yellow-500 mr-3" />
                成绩管理
              </h2>
            </div>

            {/* 搜索和筛选 */}
            <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 mb-6">
              {/* 搜索框 */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="按活动名称或地点搜索..."
                    value={scoreSearchTerm}
                    onChange={(e) => setScoreSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500 text-sm"
                  />
                </div>
              </div>

              {/* 年份选择 */}
              <div className="w-32">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500 appearance-none bg-white text-sm"
                  >
                    <option value="">全部年份</option>
                    {availableYears.map(year => (
                      <option key={year} value={year.toString()}>{year}年</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 月份选择 */}
              <div className="w-32">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500 appearance-none bg-white text-sm"
                  >
                    <option value="">全部月份</option>
                    <option value="1">1月</option>
                    <option value="2">2月</option>
                    <option value="3">3月</option>
                    <option value="4">4月</option>
                    <option value="5">5月</option>
                    <option value="6">6月</option>
                    <option value="7">7月</option>
                    <option value="8">8月</option>
                    <option value="9">9月</option>
                    <option value="10">10月</option>
                    <option value="11">11月</option>
                    <option value="12">12月</option>
                  </select>
                </div>
              </div>

              {/* 清除筛选按钮 - 只在有筛选条件时显示 */}
              {(scoreSearchTerm || selectedYear || selectedMonth) && (
                <button
                  onClick={() => {
                    setScoreSearchTerm('')
                    setSelectedYear('')
                    setSelectedMonth('')
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  清除所有筛选
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-4 border-golf-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
            ) : (
            <>
            <div className="text-sm text-gray-600 mb-4">
              {scoreSearchTerm || selectedYear || selectedMonth ? (
                <>
                  共 {filteredEvents.length} 个已结束的活动
                  <span className="text-blue-600 ml-2">
                    (已过滤，共 {events.filter(e => getEventStatus(e) === 'completed').length} 个活动)
                  </span>
                </>
              ) : (
                `共 ${events.filter(e => getEventStatus(e) === 'completed').length} 个已结束的活动`
              )}
            </div>
            <div className="space-y-2">
              {filteredEvents.map((event) => {
                const eventScores = scores.filter(s => s.event_id === event.id)
                const eventGuestScores = guestScores.filter(s => s.event_id === event.id)
                // 统计所有成绩（会员+访客）
                const totalScoresCount = eventScores.length + eventGuestScores.length
                const participantsCount = eventScores.length
                const hasScores = totalScoresCount > 0
                const isExpanded = expandedEvents.has(event.id)
                
                // 计算该活动的总报名人数
                const totalRegistrations = eventRegistrations.filter(r => r.event_id === event.id).length
                const progressPercentage = totalRegistrations > 0 ? Math.round((participantsCount / totalRegistrations) * 100) : 0

                return (
                  <div
                    key={event.id}
                    className="bg-gray-50 rounded-2xl shadow-sm hover:shadow-lg transition-all border border-gray-100 hover:border-gray-200"
                  >
                    {/* 主卡片头部 */}
                    <div 
                      className="p-4 sm:p-6 cursor-pointer"
                      onClick={() => toggleEventExpansion(event.id)}
                    >
                      <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                              )}
                          <div className="flex-1">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900">{event.title}</h3>
                            
                            {/* 活动时间信息 */}
                            <div className="text-sm text-gray-500 mt-1 mb-2">
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                <span>
                                  {new Date(event.start_time).toLocaleString('zh-CN', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })} - {new Date(event.end_time).toLocaleString('zh-CN', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
          </div>

                            <div className="flex items-center text-sm text-gray-600 mt-1">
                              <Users className="w-4 h-4 mr-2" />
                              已录入成绩: {participantsCount}/{totalRegistrations}
                              {eventGuestScores.length > 0 && (
                                <span className="ml-2 text-xs text-gray-500">
                                  (访客: {eventGuestScores.length})
                                </span>
                              )}
                              {totalRegistrations > 0 && (
                                <div className="ml-3 flex items-center space-x-2">
                                  <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                    <div 
                                      className="bg-green-500 h-1.5 rounded-full transition-all"
                                      style={{ width: `${progressPercentage}%` }}
                                    ></div>
                      </div>
                                  <span className="text-xs text-gray-500">{progressPercentage}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            totalScoresCount === 0 
                              ? 'bg-gray-100 text-gray-800' 
                              : participantsCount === totalRegistrations && totalRegistrations > 0
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {totalScoresCount === 0 
                              ? '尚未录入' 
                              : participantsCount === totalRegistrations && totalRegistrations > 0
                              ? '录入完成' 
                              : '部分录入'
                            }
                          </span>
                          {totalScoresCount > 0 && modulePermissions.scores.can_delete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation() // 阻止触发卡片展开/折叠
                                handleDeleteAllScoresForEvent(event.id)
                              }}
                              className="flex items-center justify-center p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              title="删除该活动的所有成绩记录（包括会员和访客），可重新导入"
                            >
                              <Trash2 className="w-4 h-4 sm:w-4 sm:h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                        {/* 折叠内容 - 队员成绩列表 */}
                        {isExpanded && (
                          <div className="border-t border-gray-100 px-4 sm:px-6 pb-4 bg-white rounded-b-2xl">
                            <div className="space-y-3 mt-4">
                              {totalScoresCount > 0 ? (
                                (() => {
                                  // 合并会员和访客成绩，统一格式
                                  const allScores = [
                                    ...eventScores.map(score => ({ ...score, isGuest: false })),
                                    ...eventGuestScores.map(score => ({ ...score, isGuest: true }))
                                  ]
                                  
                                  // 统一排序
                                  const sortedScores = allScores.sort((a, b) => {
                                    // 按排名排序，有排名的在前，没有排名的在后
                                    if (a.rank && b.rank) {
                                      return a.rank - b.rank
                                    }
                                    if (a.rank && !b.rank) return -1
                                    if (!a.rank && b.rank) return 1
                                    // 如果都没有排名，按总杆数排序（杆数少的在前）
                                    return a.total_strokes - b.total_strokes
                                  })
                                  
                                  return sortedScores.map((score, index) => (
                                    <div key={score.id || index} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900 flex items-center gap-2">
                                          {score.isGuest ? (
                                            score.player_name || '未知访客'
                                          ) : (
                                            score.user_profiles?.full_name || '未知'
                                          )}
                                          {score.isGuest && (
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                              访客
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                          总杆数: {score.total_strokes} | 净杆数: {score.net_strokes || '-'} | 差点: {score.handicap || '-'}
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-4">
                                        {score.rank && (
                                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            score.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                                            score.rank === 2 ? 'bg-gray-100 text-gray-800' :
                                            score.rank === 3 ? 'bg-amber-100 text-amber-800' :
                                            'bg-blue-100 text-blue-800'
                                          }`}>
                                            #{score.rank}
                                          </span>
                                        )}
                                        {modulePermissions.scores.can_update && (
                                          <button
                                            onClick={() => {
                                              setSelectedEvent(event)
                                              setSelectedScore(score)
                                              setShowScoreForm(true)
                                            }}
                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="编辑成绩"
                                          >
                                            <Edit className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                })()
                              ) : (
                                <div className="text-center py-8 text-gray-500">
                                  <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                  <p>暂无成绩记录</p>
                                  {modulePermissions.scores.can_create && (
                                    <button
                                      onClick={() => {
                                        setSelectedEvent(event)
                                        setShowScoreForm(true)
                                      }}
                                      className="mt-3 px-4 py-2 bg-golf-600 text-white rounded-lg hover:bg-golf-700 transition-colors"
                                    >
                                      开始录入成绩
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* 操作按钮 */}
                            <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                              {totalScoresCount > 0 && modulePermissions.scores.can_delete && (
                                <button
                                  onClick={() => handleDeleteAllScoresForEvent(event.id)}
                                  className="flex items-center text-sm text-red-600 hover:text-red-700"
                                  title="删除该活动的所有成绩记录（包括会员和访客），可重新导入"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  删除所有成绩
                                </button>
                              )}
                              {modulePermissions.scores.can_create && (
                                <button
                                  onClick={() => {
                                    setSelectedEvent(event)
                                    setShowScoreForm(true)
                                  }}
                                  className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  批量录入成绩
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                  </div>
                )
              })}
                
                {filteredEvents.length === 0 && (
                  <div className="text-center py-12">
                    <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    {events.filter(e => getEventStatus(e) === 'completed').length === 0 ? (
                      <>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无已结束的活动</h3>
                        <p className="text-gray-600">等待活动结束后即可录入成绩</p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">未找到匹配的活动</h3>
                        <p className="text-gray-600">请尝试调整搜索条件或清除过滤器</p>
                        <button
                          onClick={() => {
                            setScoreSearchTerm('')
                            setSelectedYear('')
                            setSelectedMonth('')
                          }}
                          className="mt-3 px-4 py-2 bg-golf-600 text-white rounded-lg hover:bg-golf-700 transition-colors"
                        >
                          清除筛选
                        </button>
                      </>
                    )}
                  </div>
                )}
            </div>
            </>
            )}
          </div>
        </div>
      )}

      {/* 海报表单弹窗 */}
      {showPosterForm && (
        <PosterForm
          poster={selectedPoster}
          onClose={() => {
            setShowPosterForm(false)
            setSelectedPoster(null)
          }}
          onSuccess={() => {
            setShowPosterForm(false)
            setSelectedPoster(null)
            fetchAdminData()
          }}
        />
      )}

      {/* 成绩表单弹窗 */}
      {showScoreForm && (
        <ScoreForm
          preselectedEvent={selectedEvent}
          preselectedScore={selectedScore}
          onClose={() => {
            setShowScoreForm(false)
            setSelectedEvent(null)
            setSelectedScore(null)
          }}
          onSuccess={() => {
            setShowScoreForm(false)
            setSelectedEvent(null)
            setSelectedScore(null)
            fetchAdminData()
          }}
        />
      )}

      {/* 捐赠管理 */}
      {currentView === 'investments' && modulePermissions.investments.can_access && (
        <div className="p-[5px] lg:p-0 m-0.5 lg:m-0">
          <InvestmentAdmin />
        </div>
      )}

      {/* 费用管理 */}
      {currentView === 'expenses' && modulePermissions.expenses.can_access && (
        <div className="p-[5px] lg:p-0 m-0.5 lg:m-0">
          <ExpenseAdmin />
        </div>
      )}

      {/* 会员管理 */}
      {currentView === 'members' && modulePermissions.members.can_access && (
        <div className="p-[5px] lg:p-0 m-0.5 lg:m-0">
          <MemberAdmin />
        </div>
      )}

      {/* 审计日志 - 仅admin可通过URL参数或快捷键访问 */}
      {currentView === 'audit' && userRole === 'admin' && (
        <div className="p-[5px] lg:p-6 m-0.5 lg:m-0">
          <AuditLogViewer />
        </div>
      )}

      {/* 信息中心管理 */}
      {currentView === 'information' && modulePermissions.information.can_access && (
        <div className="bg-white rounded-2xl p-[5px] lg:p-6 m-0.5 lg:m-0 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">信息中心管理</h2>
            {modulePermissions.information.can_create && (
              <button
                onClick={() => {
                  setSelectedInformationItem(null)
                  setShowInformationForm(true)
                }}
                className="btn-primary flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                创建信息
              </button>
            )}
          </div>

          {/* 搜索和筛选 */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜索标题或内容..."
                value={informationSearchTerm}
                onChange={(e) => setInformationSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={informationStatusFilter}
                onChange={(e) => setInformationStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">所有状态</option>
                <option value="draft">草稿</option>
                <option value="published">已发布</option>
                <option value="archived">已归档</option>
              </select>
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={informationCategoryFilter}
                onChange={(e) => setInformationCategoryFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">全部分类</option>
                <option value="公告">公告</option>
                <option value="通知">通知</option>
                <option value="重要资料">重要资料</option>
                <option value="规则章程">规则章程</option>
              </select>
            </div>
            {(informationSearchTerm || informationStatusFilter !== 'all' || informationCategoryFilter !== 'all') && (
              <button
                onClick={() => {
                  setInformationSearchTerm('')
                  setInformationStatusFilter('all')
                  setInformationCategoryFilter('all')
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                清除筛选
              </button>
            )}
          </div>

          {/* 信息列表表格 */}
          <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-200">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-4 text-left text-base font-semibold text-gray-700 cursor-pointer hover:bg-green-100 select-none w-48"
                    onClick={() => {
                      setSortField('information_title')
                      setSortDirection(sortField === 'information_title' && sortDirection === 'asc' ? 'desc' : 'asc')
                    }}
                  >
                    <div className="flex items-center space-x-1">
                      <span>标题</span>
                      {sortField === 'information_title' && (
                        <span className="text-gray-400">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-base font-semibold text-gray-700 w-24">分类</th>
                  <th className="px-6 py-4 text-center text-base font-semibold text-gray-700 w-24">状态</th>
                  <th className="px-6 py-4 text-center text-base font-semibold text-gray-700 w-28">优先级</th>
                  <th 
                    className="px-6 py-4 text-center text-base font-semibold text-gray-700 cursor-pointer hover:bg-green-100 select-none w-32"
                    onClick={() => {
                      setSortField('information_published_at')
                      setSortDirection(sortField === 'information_published_at' && sortDirection === 'asc' ? 'desc' : 'asc')
                    }}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>发布时间</span>
                      {sortField === 'information_published_at' && (
                        <span className="text-gray-400">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-center text-base font-semibold text-gray-700 cursor-pointer hover:bg-green-100 select-none w-20"
                    onClick={() => {
                      setSortField('information_view_count')
                      setSortDirection(sortField === 'information_view_count' && sortDirection === 'asc' ? 'desc' : 'asc')
                    }}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>阅读数</span>
                      {sortField === 'information_view_count' && (
                        <span className="text-gray-400">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-base font-semibold text-gray-700 w-28">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getSortedInformationItems().filter(item => {
                  const matchesSearch = !informationSearchTerm || 
                    item.title.toLowerCase().includes(informationSearchTerm.toLowerCase()) ||
                    item.excerpt?.toLowerCase().includes(informationSearchTerm.toLowerCase()) ||
                    item.content?.toLowerCase().includes(informationSearchTerm.toLowerCase())
                  const matchesStatus = informationStatusFilter === 'all' || item.status === informationStatusFilter
                  const matchesCategory = informationCategoryFilter === 'all' || item.category === informationCategoryFilter
                  return matchesSearch && matchesStatus && matchesCategory
                }).map((item) => (
                  <tr key={item.id} className="hover:bg-green-50">
                    <td className="px-6 py-4 w-48">
                      <div className="flex items-center space-x-2">
                        {item.is_pinned && (
                          <Pin className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                        )}
                        <div className="font-medium text-gray-900 truncate" title={item.title}>
                          {item.title}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center w-24">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.category === '公告' ? 'bg-blue-100 text-blue-800' :
                        item.category === '通知' ? 'bg-yellow-100 text-yellow-800' :
                        item.category === '重要资料' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center w-24">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'published' ? 'bg-green-100 text-green-800' :
                        item.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.status === 'published' ? '已发布' : item.status === 'draft' ? '草稿' : '已归档'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center w-28">
                      <div className="space-y-1">
                        {item.priority > 0 && (
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            item.priority === 1 ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {item.priority === 1 ? '重要' : '紧急'}
                          </span>
                        )}
                        {item.is_pinned && (
                          <div className="text-xs text-yellow-600">置顶</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600 w-32">
                      {item.published_at ? (
                        <div>
                          <div>{new Date(item.published_at).toLocaleDateString('zh-CN')}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(item.published_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600 w-20">
                      {item.view_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium w-28">
                      <div className="flex items-center justify-center space-x-2">
                        {modulePermissions.information.can_update && (
                          <button
                            onClick={() => {
                              setSelectedInformationItem(item)
                              setShowInformationForm(true)
                            }}
                            className="text-green-600 hover:text-green-800 p-2 rounded hover:bg-green-50"
                            title="编辑"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {modulePermissions.information.can_delete && (
                          <button
                            onClick={() => handleDeleteInformation(item.id)}
                            className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {getSortedInformationItems().filter(item => {
            const matchesSearch = !informationSearchTerm || 
              item.title.toLowerCase().includes(informationSearchTerm.toLowerCase()) ||
              item.excerpt?.toLowerCase().includes(informationSearchTerm.toLowerCase()) ||
              item.content?.toLowerCase().includes(informationSearchTerm.toLowerCase())
            const matchesStatus = informationStatusFilter === 'all' || item.status === informationStatusFilter
            const matchesCategory = informationCategoryFilter === 'all' || item.category === informationCategoryFilter
            return matchesSearch && matchesStatus && matchesCategory
          }).length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {informationSearchTerm || informationStatusFilter !== 'all' || informationCategoryFilter !== 'all' 
                ? '没有找到匹配的信息' 
                : '暂无信息，点击"创建信息"开始创建'}
            </div>
          )}
        </div>
      )}

      {/* 信息中心表单弹窗 */}
      {showInformationForm && (
        <InformationCenterForm
          item={selectedInformationItem}
          onClose={() => {
            setShowInformationForm(false)
            setSelectedInformationItem(null)
          }}
          onSuccess={() => {
            setShowInformationForm(false)
            setSelectedInformationItem(null)
            fetchAdminData()
          }}
        />
      )}

      {/* 活动报名管理模态框 */}
      {selectedEventForRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl w-full max-w-[960px] max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-end mb-6">
                <button
                  onClick={() => setSelectedEventForRegistration(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <EventRegistrationAdmin
                eventId={selectedEventForRegistration.id}
                eventTitle={selectedEventForRegistration.title}
                onDataChange={() => {
                  // 批准或取消报名后，刷新活动列表数据
                  fetchAdminData()
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
