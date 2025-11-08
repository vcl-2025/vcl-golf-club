import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Users, Clock, DollarSign, ChevronRight, CheckCircle, AlertCircle, FileText, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getEventStatus, getEventStatusText, getEventStatusStyles, canRegister } from '../utils/eventStatus'
import { Event, EventStats } from '../types'
import UnifiedSearch from './UnifiedSearch'

interface EventListProps {
  onEventSelect: (event: Event) => void
  user?: any
}

export default function EventList({ onEventSelect, user }: EventListProps) {
  const navigate = useNavigate()
  const [events, setEvents] = useState<Event[]>([])
  const [eventStats, setEventStats] = useState<Record<string, EventStats>>({})
  const [userRegistrations, setUserRegistrations] = useState<Record<string, any>>({})
  const [participantAvatars, setParticipantAvatars] = useState<Record<string, Array<{ id: string, avatarUrl?: string, full_name?: string }>>>({})
  const [userAvatar, setUserAvatar] = useState<{ avatarUrl?: string, full_name?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  // 移除分页，显示所有活动
  
  // 搜索和筛选状态
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [locationTerm, setLocationTerm] = useState('')

  useEffect(() => {
    fetchEvents()
  }, [user])

  // 筛选活动
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesLocation = !locationTerm || 
                           event.location.toLowerCase().includes(locationTerm.toLowerCase())
    
    const eventDate = new Date(event.start_time)
    const matchesYear = !selectedYear || eventDate.getFullYear().toString() === selectedYear
    const matchesMonth = !selectedMonth || (eventDate.getMonth() + 1).toString() === selectedMonth
    
    return matchesSearch && matchesLocation && matchesYear && matchesMonth
  })

  // 获取可用年份
  const availableYears = [...new Set(events.map(e => new Date(e.start_time).getFullYear()))].sort((a, b) => b - a)

  const fetchEvents = async () => {
    try {
      // 1. 先获取活动列表（快速显示）
      const eventsResponse = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })

      if (eventsResponse.error) throw eventsResponse.error
      
      // 过滤出可以显示的活动（未开始、进行中、已完成）
      const displayableEvents = (eventsResponse.data || []).filter(event => {
        const status = getEventStatus(event)
        return status !== 'cancelled'
      })
      setEvents(displayableEvents)
      setLoading(false) // 活动列表加载完成，可以显示

      // 2. 异步加载统计数据和用户报名状态（懒加载）
      setStatsLoading(true)
      
      const [statsResponse, registrationsResponse] = await Promise.all([
        // 批量获取所有活动统计信息（避免N+1查询）
        supabase.rpc('get_batch_event_stats'),
        
        // 获取用户报名状态（如果有用户）
        user ? supabase
          .from('event_registrations')
          .select('event_id, payment_status, status, approval_status')
          .eq('user_id', user.id) : Promise.resolve({ data: null, error: null })
      ])

      // 处理统计数据
      if (statsResponse.error) {
        console.error('获取统计数据失败:', statsResponse.error)
      } else {
        // 将批量统计数据转换为对象格式
        const stats: Record<string, EventStats> = {}
        if (statsResponse.data) {
          statsResponse.data.forEach((stat: any) => {
            stats[stat.event_id] = {
              total_registrations: stat.total_registrations,
              paid_registrations: stat.paid_registrations,
              available_spots: stat.available_spots
            }
          })
        }
        setEventStats(stats)
      }

      // 处理用户报名状态
      if (user && registrationsResponse.data) {
        const regMap: Record<string, any> = {}
        registrationsResponse.data.forEach((reg: any) => {
          regMap[reg.event_id] = reg
        })
        setUserRegistrations(regMap)
      }

      // 获取当前用户头像信息
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('avatar_url, full_name')
          .eq('id', user.id)
          .maybeSingle()
        
        if (profile) {
          setUserAvatar({
            avatarUrl: profile.avatar_url || undefined,
            full_name: profile.full_name || undefined
          })
        }
      }

      // 3. 异步获取每个活动的前5个报名人头像（懒加载，不阻塞主列表显示）
      const fetchAvatars = async () => {
        const avatarsMap: Record<string, Array<{ id: string, avatarUrl?: string, full_name?: string }>> = {}
        
        // 并行获取所有活动的头像
        const avatarPromises = displayableEvents.map(async (event) => {
          try {
            const { data: registrations } = await supabase
              .from('event_registrations')
              .select('user_id')
              .eq('event_id', event.id)
              .eq('approval_status', 'approved')
              .limit(5)
              .order('registration_time', { ascending: true })

            if (registrations && registrations.length > 0) {
              const userIds = registrations.map(r => r.user_id)
              const { data: profiles } = await supabase
                .from('user_profiles')
                .select('id, avatar_url, full_name')
                .in('id', userIds)

              if (profiles) {
                return {
                  eventId: event.id,
                  avatars: profiles.map(p => ({
                    id: p.id,
                    avatarUrl: p.avatar_url || undefined,
                    full_name: p.full_name || undefined
                  }))
                }
              }
            }
            return { eventId: event.id, avatars: [] }
          } catch (error) {
            console.error(`获取活动 ${event.id} 报名人头像失败:`, error)
            return { eventId: event.id, avatars: [] }
          }
        })

        const results = await Promise.all(avatarPromises)
        results.forEach(({ eventId, avatars }) => {
          avatarsMap[eventId] = avatars
        })
        
        setParticipantAvatars(avatarsMap)
      }
      
      // 异步加载头像，不阻塞主列表
      fetchAvatars()
    } catch (error) {
      console.error('获取活动列表失败:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatEventDateTime = (event: Event) => {
    const startDate = new Date(event.start_time)
    const endDate = new Date(event.end_time)
    
    // 检查是否是同一天
    const isSameDay = startDate.toDateString() === endDate.toDateString()
    
    if (isSameDay) {
      // 同一天：显示日期 + 时间范围
      return {
        date: formatDate(event.start_time),
        time: `${formatTime(event.start_time)} - ${formatTime(event.end_time)}`
      }
    } else {
      // 跨天：显示开始日期时间 - 结束日期时间
      return {
        date: `${formatDate(event.start_time)} ${formatTime(event.start_time)}`,
        time: `至 ${formatDate(event.end_time)} ${formatTime(event.end_time)}`
      }
    }
  }

  // 格式化日期为卡片样式（月份、日期、星期）
  const formatDateForCard = (dateString: string) => {
    const date = new Date(dateString)
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
    const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    const month = monthNames[date.getMonth()]
    const day = date.getDate()
    const dayOfWeek = dayNames[date.getDay()]
    return { month, day, dayOfWeek }
  }

  const isRegistrationOpen = (deadline: string) => {
    return new Date() < new Date(deadline)
  }

  const isEventFull = (eventId: string) => {
    const stats = eventStats[eventId]
    return stats ? stats.available_spots <= 0 : false
  }

  const getUserRegistrationStatus = (eventId: string) => {
    if (!user) return null
    return userRegistrations[eventId]
  }

  const getRegistrationButtonText = (event: Event) => {
    const registration = getUserRegistrationStatus(event.id)
    const registrationOpen = isRegistrationOpen(event.registration_deadline)
    const eventFull = isEventFull(event.id)

    if (!user) {
      return { text: '请先登录', disabled: true, color: 'bg-gray-400' }
    }

    if (registration) {
      // console.log('活动列表状态调试:', {
      //   eventId: eventId,
      //   approval_status: registration.approval_status,
      //   payment_status: registration.payment_status,
      //   status: registration.status
      // })
      
      if (registration.approval_status === 'approved') {
        return { text: '已报名', disabled: true, color: 'bg-[#F15B98]' }
      } else if (registration.approval_status === 'pending') {
        return { text: '已申请待审批', disabled: true, color: 'bg-yellow-500' }
      } else if (registration.approval_status === 'rejected') {
        return { text: '已拒绝', disabled: true, color: 'bg-red-500' }
      } else {
        return { text: '待支付', disabled: false, color: 'bg-orange-500' }
      }
    }

    if (!registrationOpen) {
      return { text: '报名已截止', disabled: true, color: 'bg-gray-400' }
    }

    if (eventFull) {
      return { text: '名额已满', disabled: true, color: 'bg-red-400' }
    }

    return { text: '立即报名', disabled: false, color: 'bg-[#F15B98]' }
  }

  // 显示所有活动，不分页
  const currentEvents = filteredEvents

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-[#F15B98] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 统一搜索组件 */}
      <UnifiedSearch
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        availableYears={availableYears}
        placeholder="按活动名称或描述搜索..."
        showLocationFilter={true}
        locationTerm={locationTerm}
        onLocationChange={setLocationTerm}
        onClearFilters={() => {
          setSearchTerm('')
          setSelectedYear('')
          setSelectedMonth('')
          setLocationTerm('')
        }}
      />

      {/* 活动列表 */}
      <div className="space-y-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
        {currentEvents.map((event) => {
          const stats = eventStats[event.id]
          const registrationOpen = isRegistrationOpen(event.registration_deadline)
          const eventFull = isEventFull(event.id)

          return (
            <div
              key={event.id}
              className="bg-white rounded-2xl shadow-sm hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer overflow-hidden flex flex-col group"
              onClick={() => {
                // 使用 URL 参数打开模态框，支持分享
                const params = new URLSearchParams()
                params.set('view', 'events')
                params.set('eventId', event.id)
                navigate(`/dashboard?${params.toString()}`, { replace: true })
              }}
              style={{ 
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)'
              }}
            >
              {/* 活动图片区域 */}
              <div className="relative aspect-[3/4] sm:aspect-[2/3] overflow-hidden">
                <img
                  src={event.image_url || 'https://images.pexels.com/photos/1325735/pexels-photo-1325735.jpeg?auto=compress&cs=tinysrgb&w=800'}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
                
                {/* 底部渐变覆盖层 - 混合黑色和月份颜色 */}
                {(() => {
                  const monthIndex = new Date(event.start_time).getMonth()
                  const colorThemes = [
                    { color: 'blue' }, // 一月 - 蓝色
                    { color: 'pink' }, // 二月 - 粉色
                    { color: 'green' }, // 三月 - 绿色
                    { color: 'yellow' }, // 四月 - 黄色
                    { color: 'purple' }, // 五月 - 紫色
                    { color: 'teal' }, // 六月 - 青色
                    { color: 'red' }, // 七月 - 红色
                    { color: 'orange' }, // 八月 - 橙色
                    { color: 'indigo' }, // 九月 - 靛蓝
                    { color: 'amber' }, // 十月 - 琥珀
                    { color: 'rose' }, // 十一月 - 玫瑰
                    { color: 'cyan' } // 十二月 - 青色
                  ]
                  const monthColor = colorThemes[monthIndex].color
                  
                  // 根据月份颜色创建渐变 - 底部完全不透明，越往上越透明
                  const gradientColors = {
                    blue: 'from-blue-900 via-blue-900/70 to-transparent',
                    pink: 'from-pink-900 via-pink-900/70 to-transparent',
                    green: 'from-green-900 via-green-900/70 to-transparent',
                    yellow: 'from-yellow-900 via-yellow-900/70 to-transparent',
                    purple: 'from-purple-900 via-purple-900/70 to-transparent',
                    teal: 'from-teal-900 via-teal-900/70 to-transparent',
                    red: 'from-red-900 via-red-900/70 to-transparent',
                    orange: 'from-orange-900 via-orange-900/70 to-transparent',
                    indigo: 'from-indigo-900 via-indigo-900/70 to-transparent',
                    amber: 'from-amber-900 via-amber-900/70 to-transparent',
                    rose: 'from-rose-900 via-rose-900/70 to-transparent',
                    cyan: 'from-cyan-900 via-cyan-900/70 to-transparent'
                  }
                  
                  return (
                    <div className={`absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t ${gradientColors[monthColor as keyof typeof gradientColors]}`}></div>
                  )
                })()}
                
                {/* 参与人数统计 - 左上角 */}
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 items-start">
                  <div className="px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border-2 border-white/60 flex items-center justify-center whitespace-nowrap min-w-fit shadow-lg">
                    <span className="text-xs text-gray-900 font-semibold drop-shadow-sm">
                      {stats ? `${stats.total_registrations}/${event.max_participants}` : '0/50'}
                    </span>
                  </div>
                  
                  {/* 已报名用户头像 - 显示在参与人数下方，最多5个，叠加显示 */}
                  {(() => {
                    const avatars = participantAvatars[event.id] || []
                    const totalRegistrations = stats?.total_registrations || 0
                    const remainingCount = totalRegistrations > 5 ? totalRegistrations - 5 : 0
                    
                    if (avatars.length > 0) {
                      return (
                        <div className="flex items-center -space-x-2 relative w-fit">
                          {avatars.slice(0, 5).map((participant, idx) => (
                            <div
                              key={participant.id || idx}
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-green-200 overflow-hidden bg-white/20 flex items-center justify-center flex-shrink-0 shadow-md backdrop-blur-sm relative"
                              style={{ zIndex: 10 - idx }}
                            >
                              {participant.avatarUrl ? (
                                <img
                                  src={participant.avatarUrl}
                                  alt={participant.full_name || 'Participant'}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-4 h-4 sm:w-5 sm:h-5 text-green-300" />
                              )}
                            </div>
                          ))}
                          {/* 在最后一个头像的右侧外部显示剩余人数 */}
                          {remainingCount > 0 && (
                            <div 
                              className="ml-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/90 backdrop-blur-sm border-2 border-green-200 flex items-center justify-center flex-shrink-0 shadow-md z-30"
                            >
                              <span className="text-[10px] sm:text-xs text-green-600 font-semibold">
                                +{remainingCount}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
                
                {/* 点击提示箭头 - 右上角，始终显示 */}
                <div className="absolute top-3 right-3 z-30 bg-white/95 backdrop-blur-sm rounded-full p-2 shadow-xl pointer-events-none">
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-[#F15B98]" />
                </div>
                
                {/* 活动标题 - 在日期块上方 */}
                <div className="absolute bottom-28 sm:bottom-32 left-4 right-4 sm:right-auto sm:left-4 sm:max-w-[70%]">
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white line-clamp-2 drop-shadow-lg leading-tight">
                    {event.title}
                  </h3>
                </div>
                
                {/* 日期块和地址价格容器 - 在渐变底部左侧 */}
                <div className="absolute bottom-4 left-4 flex items-start gap-2 sm:gap-4 max-w-[calc(100%-8rem)] sm:max-w-none">
                  {/* 日期块 */}
                  {(() => {
                    const dateInfo = formatDateForCard(event.start_time)
                    // 根据月份选择颜色主题
                    const monthIndex = new Date(event.start_time).getMonth()
                    const colorThemes = [
                      { bg: 'bg-blue-500', border: 'border-blue-400' }, // 一月 - 蓝色
                      { bg: 'bg-pink-500', border: 'border-pink-400' }, // 二月 - 粉色
                      { bg: 'bg-green-500', border: 'border-green-400' }, // 三月 - 绿色
                      { bg: 'bg-yellow-500', border: 'border-yellow-400' }, // 四月 - 黄色
                      { bg: 'bg-purple-500', border: 'border-purple-400' }, // 五月 - 紫色
                      { bg: 'bg-teal-500', border: 'border-teal-400' }, // 六月 - 青色
                      { bg: 'bg-red-500', border: 'border-red-400' }, // 七月 - 红色
                      { bg: 'bg-orange-500', border: 'border-orange-400' }, // 八月 - 橙色
                      { bg: 'bg-indigo-500', border: 'border-indigo-400' }, // 九月 - 靛蓝
                      { bg: 'bg-amber-500', border: 'border-amber-400' }, // 十月 - 琥珀
                      { bg: 'bg-rose-500', border: 'border-rose-400' }, // 十一月 - 玫瑰
                      { bg: 'bg-cyan-500', border: 'border-cyan-400' } // 十二月 - 青色
                    ]
                    const theme = colorThemes[monthIndex]
                    
                    return (
                      <div 
                        className="w-[65px] sm:w-[75px] rounded-lg overflow-hidden flex-shrink-0"
                        style={{
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                          transform: 'translateZ(0)',
                          transformStyle: 'preserve-3d'
                        }}
                      >
                        {/* 上部分 - 有颜色的背景，显示月份 */}
                        <div 
                          className={`${theme.bg} ${theme.border} border-b-2 px-2 py-1 sm:px-3 sm:py-1.5`}
                          style={{
                            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1)'
                          }}
                        >
                          <div className="text-sm sm:text-base font-bold text-white text-center">{dateInfo.month}</div>
                        </div>
                        {/* 下部分 - 白色背景，显示日期和星期 */}
                        <div 
                          className="bg-white px-2 py-1.5 sm:px-3 sm:py-2"
                          style={{
                            boxShadow: 'inset 0 -1px 0 rgba(0, 0, 0, 0.05)'
                          }}
                        >
                          <div className="text-xl sm:text-2xl font-bold text-gray-900 text-center leading-none mb-0.5">{dateInfo.day}</div>
                          <div className="text-[10px] sm:text-xs font-semibold text-gray-700 text-center">{dateInfo.dayOfWeek}</div>
                        </div>
                      </div>
                    )
                  })()}
                  
                  {/* 时间、地址和价格 - 在日期块右侧 */}
                  <div className="flex flex-col gap-1.5 sm:gap-2 text-white min-w-0 flex-1">
                    {/* 时间 */}
                    <div className="flex items-center gap-2 text-sm sm:text-base drop-shadow-md">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span className="truncate">{formatTime(event.start_time)}</span>
                    </div>
                    {/* 地址 - 允许换行显示 */}
                    <div className="flex items-start gap-2 text-sm sm:text-base drop-shadow-md">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 text-white/80" />
                      <span className="line-clamp-2 break-words text-white/80">{event.location}</span>
                    </div>
                    {/* 价格 */}
                    <div className="flex items-center gap-1.5 text-sm sm:text-base drop-shadow-md">
                      <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span className="font-bold">{event.fee.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                {/* 活动详情信息 - 在渐变背景上，白色文字 */}
                <div className="absolute bottom-4 right-4 left-auto sm:right-4 sm:max-w-[40%] text-white space-y-1.5 sm:space-y-2">
                  {/* 报名按钮 */}
                  <div className="pt-2">
                    {(() => {
                      const registration = getUserRegistrationStatus(event.id)
                      const isRegistered = registration && registration.approval_status === 'approved'
                      
                      if (isRegistered) {
                        return (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              const params = new URLSearchParams()
                              params.set('view', 'events')
                              params.set('eventId', event.id)
                              navigate(`/dashboard?${params.toString()}`, { replace: true })
                            }}
                            className="px-3 py-1.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full text-xs sm:text-sm font-semibold hover:bg-white/30 transition-colors flex items-center gap-1.5"
                            disabled
                          >
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                            <span className="text-green-400">已报名</span>
                          </button>
                        )
                      } else {
                        if (!registrationOpen) {
                          return (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                const params = new URLSearchParams()
                                params.set('view', 'events')
                                params.set('eventId', event.id)
                                navigate(`/dashboard?${params.toString()}`, { replace: true })
                              }}
                              className="px-3 py-1.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full text-xs sm:text-sm font-semibold cursor-default"
                              disabled
                            >
                              <span className="text-red-400">报名已截止</span>
                            </button>
                          )
                        } else if (eventFull) {
                          return (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                const params = new URLSearchParams()
                                params.set('view', 'events')
                                params.set('eventId', event.id)
                                navigate(`/dashboard?${params.toString()}`, { replace: true })
                              }}
                              className="px-3 py-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-full text-xs sm:text-sm font-semibold cursor-default"
                              disabled
                            >
                              名额已满
                            </button>
                          )
                        } else {
                          return (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                const params = new URLSearchParams()
                                params.set('view', 'events')
                                params.set('eventId', event.id)
                                navigate(`/dashboard?${params.toString()}`, { replace: true })
                              }}
                              className="px-3 py-1.5 bg-white text-[#F15B98] rounded-full text-xs sm:text-sm font-semibold hover:bg-white/90 transition-colors shadow-md"
                            >
                              {statsLoading ? (
                                <span className="flex items-center">
                                  <div className="w-3 h-3 border-2 border-[#F15B98] border-t-transparent rounded-full animate-spin mr-2"></div>
                                  加载中...
                                </span>
                              ) : (
                                `还有 ${stats?.available_spots || 0} 个名额`
                              )}
                            </button>
                          )
                        }
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 移除分页，显示所有活动 */}

      {/* 空状态 */}
      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          {events.length === 0 ? (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无活动</h3>
              <p className="text-gray-500">目前没有可报名的活动，请稍后再来查看。</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-2">未找到匹配的活动</h3>
              <p className="text-gray-500">请尝试调整搜索条件或清除筛选器</p>
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedYear('')
                  setSelectedMonth('')
                  setLocationTerm('')
                }}
                className="mt-3 px-4 py-2 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80 transition-colors"
              >
                清除筛选器
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}