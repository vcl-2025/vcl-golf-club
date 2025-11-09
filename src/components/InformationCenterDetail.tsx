import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X, Calendar, Eye, FileText, Download, Clock, User, Pin, AlertCircle, Share2, ChevronLeft, ShoppingCart, MapPin, DollarSign } from 'lucide-react'
import { InformationItem, Event } from '../types'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import ShareModal from './ShareModal'
import BatchRegistrationCart from './BatchRegistrationCart'
import { canRegister, getEventStatus, getEventStatusText } from '../utils/eventStatus'

interface InformationCenterDetailProps {
  item: InformationItem
  onClose: () => void
}

const categoryColors = {
  '公告': 'bg-[#F15B98]/20 text-[#F15B98]',
  '通知': 'bg-[#F15B98]/20 text-[#F15B98]',
  '重要资料': 'bg-[#F15B98]/20 text-[#F15B98]',
  '规则章程': 'bg-[#F15B98]/20 text-[#F15B98]'
}

const priorityColors = {
  0: '',
  1: 'bg-[#F15B98]/30 text-[#F15B98]',
  2: 'bg-[#F15B98]/40 text-[#F15B98]'
}

export default function InformationCenterDetail({ item, onClose }: InformationCenterDetailProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [viewCount, setViewCount] = useState(item.view_count)
  const [copied, setCopied] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showBatchCart, setShowBatchCart] = useState(false)
  const [linkedEvents, setLinkedEvents] = useState<Event[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])
  const [eventStats, setEventStats] = useState<Record<string, { available_spots: number }>>({})
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    incrementViewCount()
    markAsRead()
    if (item.is_registration_notice && item.linked_events && item.linked_events.length > 0) {
      fetchLinkedEvents()
    }
  }, [item.id])

  // 重置关闭状态，当模态框重新打开时
  useEffect(() => {
    setIsClosing(false)
  }, [item.id])

  const fetchLinkedEvents = async () => {
    if (!supabase || !item.linked_events || item.linked_events.length === 0) return
    
    setLoadingEvents(true)
    try {
      if (!supabase) return
      const { data, error } = await supabase
        .from('events')
        .select('*, image_url, article_featured_image_url')
        .in('id', item.linked_events)
        .order('start_time', { ascending: true })
      
      if (error) throw error
      const events = data || []
      setLinkedEvents(events)
      // 默认不选中任何活动
      setSelectedEventIds([])
      
      // 获取活动报名统计
      if (events.length > 0) {
        try {
          const { data: statsData } = await supabase.rpc('get_batch_event_stats')
          if (statsData) {
            const statsMap: Record<string, { available_spots: number }> = {}
            statsData.forEach((stat: any) => {
              statsMap[stat.event_id] = {
                available_spots: stat.available_spots
              }
            })
            setEventStats(statsMap)
          }
        } catch (err) {
          console.warn('获取活动统计失败:', err)
        }
      }
    } catch (error) {
      console.error('获取关联活动失败:', error)
    } finally {
      setLoadingEvents(false)
    }
  }

  const isEventAvailable = (event: Event) => {
    // 检查是否可以报名
    if (!canRegister(event)) {
      return false
    }
    
    // 检查是否满员
    const stats = eventStats[event.id]
    if (stats && stats.available_spots <= 0) {
      return false
    }
    
    return true
  }

  const getEventUnavailableReason = (event: Event) => {
    const status = getEventStatus(event)
    const now = new Date()
    const registrationDeadline = new Date(event.registration_deadline)
    
    // 活动已结束
    if (status === 'completed') {
      return '活动已结束'
    }
    
    // 报名已截止
    if (now >= registrationDeadline) {
      return '报名已截止'
    }
    
    // 活动已取消
    if (status === 'cancelled') {
      return '活动已取消'
    }
    
    // 检查是否满员
    const stats = eventStats[event.id]
    if (stats && stats.available_spots <= 0) {
      return '名额已满'
    }
    
    return ''
  }

  const toggleEventSelection = (eventId: string) => {
    setSelectedEventIds(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    )
  }

  const markAsRead = async () => {
    if (!user || !supabase) return
    
    // 只对"通知"和"公告"分类标记为已读
    if (item.category !== '通知' && item.category !== '公告') {
      return
    }
    
    try {
      // 先获取当前记录的 read_by_users 字段
      const { data: currentItem, error: fetchError } = await supabase
        .from('information_items')
        .select('read_by_users')
        .eq('id', item.id)
        .single()
      
      if (fetchError) {
        console.error('获取信息失败:', fetchError)
        return
      }
      
      // 获取已读用户列表（UUID数组）
      const readUsers = currentItem?.read_by_users || []
      const readUsersArray = Array.isArray(readUsers) ? readUsers : []
      
      // 如果当前用户不在已读列表中，添加进去
      if (!readUsersArray.includes(user.id)) {
        const updatedReadUsers = [...readUsersArray, user.id]
        
        const { error: updateError } = await supabase
          .from('information_items')
          .update({ read_by_users: updatedReadUsers })
          .eq('id', item.id)
        
        if (updateError) {
          console.error('标记已读失败:', updateError)
        }
      }
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }

  const incrementViewCount = async () => {
    if (!supabase) return
    
    // 先尝试使用 RPC 函数
    const { error: rpcError } = await supabase.rpc('increment_information_item_views', {
      item_id: item.id
    })

    // 如果 RPC 不存在（404）或其他错误，直接更新
    if (rpcError) {
      try {
        const { data, error: updateError } = await supabase
          .from('information_items')
          .update({ view_count: (item.view_count || 0) + 1 })
        .eq('id', item.id)
        .select('view_count')
        .single()

      if (!updateError && data) {
        setViewCount(data.view_count)
      }
      } catch (updateErr) {
        console.error('更新浏览次数失败:', updateErr)
      }
    } else {
      // RPC 成功，更新本地状态
      setViewCount(prev => prev + 1)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // 去除 HTML 标签，只保留纯文本
  const stripHtml = (html: string) => {
    if (!html) return ''
    const tmp = document.createElement('DIV')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  const handleCloseModal = () => {
    // 先触发关闭动画
    setIsClosing(true)
    // 先更新 URL，但延迟关闭模态框，让动画完成
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('informationId')
    if (newParams.toString()) {
      navigate(`/dashboard?${newParams.toString()}`, { replace: true })
    } else {
      navigate('/dashboard?view=information', { replace: true })
    }
    // 延迟关闭，让动画完成后再关闭，避免 Dashboard 的 useEffect 立即关闭导致闪烁
    setTimeout(() => {
      onClose()
    }, 250)
  }

  const handleShare = async () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    // 使用公开的分享页面URL，这样社交媒体爬虫可以读取到meta标签
    const shareUrl = `${window.location.origin}/information/${item.id}`
    
    if (navigator.share && (isMobile || window.location.protocol === 'https:')) {
      try {
        await navigator.share({
          title: item.title || '信息中心',
          text: stripHtml(item.content || item.excerpt || ''),
          url: shareUrl,
        })
        return
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return
        }
      }
    }
    
    setShowShareModal(true)
  }

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-0 sm:p-4 z-[70] overflow-y-auto transition-opacity duration-200 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleCloseModal()
          }
        }}
      >
        <div className={`bg-white rounded-none sm:rounded-2xl max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col shadow-xl transition-transform duration-200 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}>
          {/* 固定头部 */}
          <div className="sticky top-0 bg-white border-b border-gray-200 z-20 flex items-center justify-between px-4 sm:px-6 py-4 rounded-t-none sm:rounded-t-2xl shadow-sm">
            <button
              onClick={handleCloseModal}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              <span className="text-base font-medium">返回列表</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center px-4 py-2 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80 transition-colors"
            >
              <Share2 className="w-4 h-4 mr-2" />
              分享
            </button>
          </div>

          {/* 可滚动内容 */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 sm:px-6 py-6">
              {/* 分类和优先级标签 */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${categoryColors[item.category]}`}>
                  {item.category}
                </span>
                {item.is_pinned && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-[#F15B98]/20 text-[#F15B98] flex items-center">
                    <Pin className="w-3 h-3 mr-1" />
                    置顶
                  </span>
                )}
                {item.priority > 0 && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    priorityColors[item.priority as keyof typeof priorityColors]
                  }`}>
                    {item.priority === 1 ? '重要' : '紧急'}
                  </span>
                )}
              </div>

              {/* 标题 */}
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
                {item.title}
              </h1>

              {/* 元信息 */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
                {item.published_at && (
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>发布时间：{formatDate(item.published_at)}</span>
                  </div>
                )}
                {item.expires_at && (
                  <div className="flex items-center text-[#F15B98]">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>有效期至：{formatDate(item.expires_at)}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-1" />
                  <span>{viewCount} 次阅读</span>
                </div>
                {item.author && (
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    <span>{item.author.full_name || item.author.email}</span>
                  </div>
                )}
        </div>

          {/* 封面图 */}
          {item.featured_image_url && (
            <div className="mb-6">
              <img
                src={item.featured_image_url}
                alt={item.title}
                className="w-full h-auto rounded-xl shadow-md"
              />
            </div>
          )}

          {/* 正文内容 */}
          <div className="prose max-w-none mb-6">
            {item.content ? (
              <div 
                className="text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            ) : (
              <p className="text-gray-600">{item.excerpt}</p>
            )}
          </div>

              {/* 关联活动（批量报名） */}
              {item.is_registration_notice && item.linked_events && item.linked_events.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <ShoppingCart className="w-5 h-5 mr-2 text-[#F15B98]" />
                    关联活动（可批量报名）
                  </h3>
                  {loadingEvents ? (
                    <div className="text-center py-8 text-gray-500">加载活动列表中...</div>
                  ) : linkedEvents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">暂无可用活动</div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                      {linkedEvents.map((event) => {
                        const isSelected = selectedEventIds.includes(event.id)
                        const isAvailable = isEventAvailable(event)
                        const unavailableReason = getEventUnavailableReason(event)
                        
                        return (
                          <div
                            key={event.id}
                            onClick={() => {
                              if (isAvailable) {
                                toggleEventSelection(event.id)
                              }
                            }}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              !isAvailable
                                ? 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed'
                                : isSelected
                                ? 'border-[#F15B98] bg-pink-50 cursor-pointer'
                                : 'border-gray-200 bg-gray-50 hover:border-gray-300 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!isAvailable}
                                onChange={() => {
                                  if (isAvailable) {
                                    toggleEventSelection(event.id)
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className={`w-5 h-5 text-[#F15B98] border-gray-300 rounded focus:ring-[#F15B98] mt-0.5 flex-shrink-0 ${
                                  !isAvailable ? 'cursor-not-allowed opacity-50' : ''
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <h4 className="font-semibold text-gray-900 line-clamp-2 flex-1">{event.title}</h4>
                                  {!isAvailable && unavailableReason && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded text-nowrap">
                                      {unavailableReason}
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate">{new Date(event.start_time).toLocaleDateString('zh-CN')} {new Date(event.start_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate">{event.location}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 flex-shrink-0" />
                                    <span className="font-semibold text-green-600">${event.fee}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {linkedEvents.length > 0 && user && (
                    <div className="space-y-3">
                      {selectedEventIds.length > 0 && (
                        <div className="text-sm text-gray-600 text-center">
                          已选择 {selectedEventIds.length} 个活动
                        </div>
                      )}
                      <button
                        onClick={() => {
                          if (selectedEventIds.length === 0) {
                            // 可以显示提示
                            return
                          }
                          setShowBatchCart(true)
                        }}
                        disabled={selectedEventIds.length === 0}
                        className="w-full px-6 py-3 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/90 transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        批量报名 ({selectedEventIds.length} 个活动)
                      </button>
                    </div>
                  )}
                </div>
              )}

          {/* 附件列表 */}
          {item.attachments && item.attachments.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                附件下载
              </h3>
              <div className="space-y-2">
                {item.attachments.map((attachment, index) => (
                  <a
                    key={index}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="w-10 h-10 bg-[#F15B98]/20 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                        <FileText className="w-5 h-5 text-[#F15B98]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {attachment.name}
                        </p>
                        {attachment.size && (
                          <p className="text-xs text-gray-500 mt-1">
                            {formatFileSize(attachment.size)}
                            {attachment.type && ` • ${attachment.type}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <Download className="w-5 h-5 text-gray-400 group-hover:text-[#F15B98] transition-colors ml-4 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
          </div>
        </div>
      </div>

      {/* 分享弹窗 */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={`${window.location.origin}/information/${item.id}`}
        title={item.title}
        description={stripHtml(item.content || item.excerpt || '')}
        imageUrl={item.featured_image_url}
      />

      {/* 批量报名购物车 */}
      {showBatchCart && selectedEventIds.length > 0 && (
        <BatchRegistrationCart
          events={linkedEvents.filter(e => selectedEventIds.includes(e.id))}
          noticeId={item.id}
          onClose={() => setShowBatchCart(false)}
          onSuccess={() => {
            // 报名成功后可以刷新页面或更新状态
            window.location.reload()
          }}
        />
      )}
    </>
  )
}

