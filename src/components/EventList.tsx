import React, { useState, useEffect } from 'react'
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
  const [events, setEvents] = useState<Event[]>([])
  const [eventStats, setEventStats] = useState<Record<string, EventStats>>({})
  const [userRegistrations, setUserRegistrations] = useState<Record<string, any>>({})
  const [participantAvatars, setParticipantAvatars] = useState<Record<string, Array<{ id: string, avatarUrl?: string, full_name?: string }>>>({})
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
      <div className="space-y-4 lg:grid lg:grid-cols-4 lg:gap-6 lg:space-y-0">
        {currentEvents.map((event) => {
          const stats = eventStats[event.id]
          const registrationOpen = isRegistrationOpen(event.registration_deadline)
          const eventFull = isEventFull(event.id)

          return (
            <div
              key={event.id}
              className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer overflow-hidden flex flex-col lg:flex-col"
              onClick={() => onEventSelect(event)}
              style={{ 
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)'
              }}
            >
              {/* 活动图片 */}
              <div className="w-[calc(100%-0.5rem)] flex-shrink-0 relative aspect-[16/9] mt-1 mx-auto rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#F15B98]/20 to-[#F15B98]/30">
                  <img
                    src={event.image_url || 'https://images.pexels.com/photos/1325735/pexels-photo-1325735.jpeg?auto=compress&cs=tinysrgb&w=800'}
                    alt={event.title}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                </div>
                {/* 渐变遮罩 - 底部渐变，让文字更清晰 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-2xl"></div>
                
                {/* 活动标题 - 放在图片左下角 */}
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-white line-clamp-2">
                    {event.title}
                  </h3>
                </div>
                
                {/* 18洞标签 */}
                {event.event_type === '比赛' && (
                  <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                    18 Holes
                  </div>
                )}
                {/* 参与人数统计 */}
                <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                  <span className="text-xs text-white font-medium text-center">
                    {stats ? `${stats.total_registrations}/${event.max_participants}` : '0/50'}
                  </span>
                </div>
              </div>

              {/* 文字内容 */}
              <div className="flex-1 p-4 sm:p-6 flex flex-col justify-between">
                <div>

                  {/* 活动信息 */}
                  <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                    {/* 日期和时间 - 紧接在一起 */}
                    <div className="flex items-center text-base sm:text-lg text-gray-600">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-green-50 flex items-center justify-center mr-2 flex-shrink-0">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                      </div>
                      <span className="truncate">{formatEventDateTime(event).date}</span>
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-green-50 flex items-center justify-center ml-4 mr-2 flex-shrink-0">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                      </div>
                      <span>{formatTime(event.start_time)}</span>
                    </div>
                    <div className="flex items-center text-base sm:text-lg text-gray-600">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-green-50 flex items-center justify-center mr-2 flex-shrink-0">
                        <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                      </div>
                      <span className="break-words">{event.location}</span>
                    </div>
                    {/* 价格和人数头像在同一行 */}
                    <div className="flex items-center justify-between text-base sm:text-lg text-gray-600">
                      <div className="flex items-center">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-green-50 flex items-center justify-center mr-2 flex-shrink-0">
                          <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                        </div>
                        <span>{event.fee.toFixed(2)}</span>
                      </div>
                      {/* 报名人头像 */}
                      <div className="flex items-center -space-x-4">
                    {(participantAvatars[event.id] || []).slice(0, 5).map((participant, idx) => (
                      <div
                        key={participant.id || idx}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-gray-200 overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm"
                      >
                        {participant.avatarUrl ? (
                          <img
                            src={participant.avatarUrl}
                            alt={participant.full_name || 'Participant'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                        )}
                      </div>
                    ))}
                        {/* 显示"+更多"提示 */}
                        {stats && stats.total_registrations > 5 && (
                          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-gray-200 bg-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <span className="text-xs sm:text-sm text-gray-600 font-medium">
                              +{stats.total_registrations - 5}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* 分隔线 */}
                <div className="border-t border-gray-100 my-3 sm:my-4"></div>

                {/* 底部操作区域 */}
                <div className="flex items-center justify-end pt-2 sm:pt-3">
                  {/* 按钮 */}
                  {(() => {
                    const registration = getUserRegistrationStatus(event.id)
                    const isRegistered = registration && registration.approval_status === 'approved'
                    
                    if (isRegistered) {
                      // 已报名
                      return (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            onEventSelect(event)
                          }}
                          className="px-4 py-1.5 bg-gray-100 text-green-500 rounded-full text-sm font-bold cursor-default flex items-center gap-1.5"
                          disabled
                        >
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          已报名
                        </button>
                      )
                    } else {
                      // 未报名，显示剩余名额
                      if (!registrationOpen) {
                        return (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              onEventSelect(event)
                            }}
                            className="px-4 py-1.5 bg-gray-300 text-gray-500 rounded-full text-sm font-bold cursor-default"
                            disabled
                          >
                            报名已截止
                          </button>
                        )
                      } else if (eventFull) {
                        return (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              onEventSelect(event)
                            }}
                            className="px-4 py-1.5 bg-gray-400 text-white rounded-full text-sm font-medium cursor-default"
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
                              onEventSelect(event)
                            }}
                            className="px-4 py-1.5 bg-[#F15B98] text-white rounded-full text-sm font-medium hover:bg-[#F15B98]/80 transition-colors"
                          >
                            {statsLoading ? (
                              <span className="flex items-center">
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
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