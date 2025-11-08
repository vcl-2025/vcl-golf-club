import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  X, Calendar, MapPin, Users, Clock, DollarSign, 
  FileText, AlertCircle, CheckCircle, ArrowLeft, Edit3, Save, Eye, Maximize2, Minimize2, Share2, ChevronLeft
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Event, EventStats, EventRegistration } from '../types'
import EventRegistrationModal from './EventRegistrationModal'
import TinyMCEViewer from './TinyMCEViewer'
import TinyMCEEditor from './TinyMCEEditor'
import ShareModal from './ShareModal'
import { useModal } from './ModalProvider'
import { getEventStatus } from '../utils/eventStatus'

interface EventDetailProps {
  event: Event
  onClose: () => void
  user: any
  userProfile?: any
  isStandalonePage?: boolean // 是否为独立页面模式
}

export default function EventDetail({ event, onClose, user, userProfile, isStandalonePage = false }: EventDetailProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [stats, setStats] = useState<EventStats | null>(null)
  const [userRegistration, setUserRegistration] = useState<EventRegistration | null>(null)
  const [showRegistrationModal, setShowRegistrationModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isFullscreenEditing, setIsFullscreenEditing] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [articleContent, setArticleContent] = useState(event.article_content || '')
  const [articleExcerpt, setArticleExcerpt] = useState(event.article_excerpt || '')
  const [savingArticle, setSavingArticle] = useState(false)
  const [isArticlePublished, setIsArticlePublished] = useState(event.article_published || false)
  const [articlePublishedAt, setArticlePublishedAt] = useState(event.article_published_at || '')
  const [isPublic, setIsPublic] = useState(event.is_public || false)
  const { confirmAction, showError } = useModal()


  useEffect(() => {
    fetchEventData()
  }, [event.id, user])

  // 重置关闭状态，当模态框重新打开时
  useEffect(() => {
    setIsClosing(false)
  }, [event.id])

  // 防止背景滚动 - 更强力的方案（仅Modal模式）
  useEffect(() => {
    if (isStandalonePage) return // 独立页面不需要阻止滚动

    const originalStyle = window.getComputedStyle(document.body).overflow
    const originalPosition = window.getComputedStyle(document.body).position
    
    // 保存当前滚动位置
    const scrollY = window.scrollY
    
    // 应用样式
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    
    return () => {
      // 恢复样式
      document.body.style.overflow = originalStyle
      document.body.style.position = originalPosition
      document.body.style.top = ''
      document.body.style.width = ''
      
      // 恢复滚动位置
      window.scrollTo(0, scrollY)
    }
  }, [isStandalonePage])

  const fetchEventData = async () => {
    try {
      // 获取活动统计
      const statsResponse = await supabase
        ?.rpc('get_event_stats', { event_uuid: event.id })
      
      if (statsResponse?.data) {
        setStats(statsResponse.data)
      }

      // 获取最新的活动数据（包括 is_public）
      if (supabase) {
        const { data: eventData } = await supabase
          .from('events')
          .select('is_public, article_published, article_published_at')
          .eq('id', event.id)
          .single()

        if (eventData) {
          setIsPublic(eventData.is_public || false)
          setIsArticlePublished(eventData.article_published || false)
          if (eventData.article_published_at) {
            setArticlePublishedAt(eventData.article_published_at)
          }
        }
      }

      // 获取用户报名记录
      if (user) {
        const registrationResponse = await supabase
          ?.from('event_registrations')
          .select('*')
          .eq('event_id', event.id)
          .eq('user_id', user.id)
          .maybeSingle()

        setUserRegistration(registrationResponse?.data)
      }
    } catch (error) {
      console.error('获取活动数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveArticle = async () => {
    try {
      setSavingArticle(true)
      
      // console.log('开始保存文章...', {
      //   eventId: event.id,
      //   articleContent: articleContent?.substring(0, 100) + '...',
      //   articleExcerpt: articleExcerpt,
      //   userId: user?.id
      // })
      
      if (!supabase) {
        throw new Error('Supabase 未初始化')
      }

      const { error } = await supabase
        .from('events')
        .update({
          article_content: articleContent,
          article_excerpt: articleExcerpt,
          article_author_id: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id)

      if (error) {
        console.error('数据库更新错误:', error)
        throw error
      }

      // 更新本地状态以实时反映更改
      setArticleContent(articleContent)
      setArticleExcerpt(articleExcerpt)
      setIsFullscreenEditing(false)
      
      // console.log('文章保存成功')
      showError('文章保存成功！')
    } catch (error: any) {
      console.error('保存文章失败:', error)
      showError(`保存文章失败: ${error?.message || '请重试'}`)
    } finally {
      setSavingArticle(false)
    }
  }

  const handlePublishArticle = async () => {
    try {
      setSavingArticle(true)
      
      if (!supabase) {
        throw new Error('Supabase 未初始化')
      }
      
      // console.log('开始发布文章...', {
      //   eventId: event.id,
      //   articleContent: articleContent?.substring(0, 100) + '...',
      //   articleExcerpt: articleExcerpt,
      //   userId: user?.id
      // })
      
      const { error } = await supabase
        .from('events')
        .update({
          article_content: articleContent,
          article_excerpt: articleExcerpt,
          article_published: true,
          article_published_at: new Date().toISOString(),
          article_author_id: user?.id,
          is_public: isPublic,
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id)

      if (error) {
        console.error('数据库更新错误:', error)
        throw error
      }

      // 更新本地状态以实时反映更改
      setArticleContent(articleContent)
      setArticleExcerpt(articleExcerpt)
      setIsArticlePublished(true)
      setArticlePublishedAt(new Date().toISOString())
      setIsFullscreenEditing(false)
      
      // console.log('文章发布成功')
      showError('文章发布成功！')
    } catch (error: any) {
      console.error('发布文章失败:', error)
      showError(`发布文章失败: ${error?.message || '请重试'}`)
    } finally {
      setSavingArticle(false)
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

  const formatEventDateTime = () => {
    const startDate = new Date(event.start_time)
    const endDate = new Date(event.end_time)
    
    // 检查是否是同一天
    const isSameDay = startDate.toDateString() === endDate.toDateString()
    
    // 调试信息
    // console.log('活动时间调试:', {
    //   start_time: event.start_time,
    //   end_time: event.end_time,
    //   startDate: startDate.toDateString(),
    //   endDate: endDate.toDateString(),
    //   isSameDay
    // })
    
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isRegistrationOpen = () => {
    return new Date() < new Date(event.registration_deadline)
  }

  const isEventFull = () => {
    return stats ? stats.available_spots <= 0 : false
  }

  const canRegister = () => {
    return user && !userRegistration && isRegistrationOpen() && !isEventFull()
  }

  const canCancelRegistration = () => {
    return userRegistration && userRegistration.approval_status === 'pending' && isRegistrationOpen()
  }

  const handleCancelRegistration = async () => {
    if (!userRegistration) return

    confirmAction('确定要取消报名吗？', async () => {
      try {
        // console.log('开始删除报名记录，ID:', userRegistration.id)
        
        // 直接删除报名记录，就像没操作过一样
        const deleteResponse = await supabase
          ?.from('event_registrations')
          .delete()
          .eq('id', userRegistration.id)

        // console.log('删除响应:', deleteResponse)
        // console.log('删除的数据:', deleteResponse?.data)
        // console.log('删除的计数:', deleteResponse?.count)

        if (deleteResponse?.error) {
          console.error('删除失败:', deleteResponse.error)
          console.error('错误代码:', deleteResponse.error.code)
          console.error('错误消息:', deleteResponse.error.message)
          throw deleteResponse.error
        }

        if (deleteResponse?.count === 0) {
          console.warn('删除操作执行了，但没有删除任何记录')
          throw new Error('删除失败：没有找到要删除的记录')
        }

        // console.log('删除成功，清空本地状态')
        // 清空本地状态
        setUserRegistration(null)
      } catch (error) {
        console.error('取消报名失败:', error)
        showError('取消报名失败，请重试')
      }
    })
  }

  const getRegistrationStatus = () => {
    if (!user) {
      return { text: '请先登录', color: 'text-gray-500', icon: AlertCircle }
    }
    
    if (userRegistration) {
      // console.log('当前报名状态:', {
      //   approval_status: userRegistration.approval_status,
      //   payment_status: userRegistration.payment_status,
      //   status: userRegistration.status
      // })
      if (userRegistration.approval_status === 'approved') {
        return { text: '完成报名', color: 'text-green-600', icon: CheckCircle }
      } else if (userRegistration.approval_status === 'pending') {
        return { text: '已申请待审批', color: 'text-yellow-600', icon: AlertCircle }
      } else if (userRegistration.approval_status === 'rejected') {
        return { text: '已拒绝', color: 'text-red-600', icon: AlertCircle }
      }
    }

    if (!isRegistrationOpen()) {
      return { text: '报名已截止', color: 'text-red-600', icon: AlertCircle }
    }

    if (isEventFull()) {
      return { text: '名额已满', color: 'text-red-600', icon: AlertCircle }
    }

    return { text: '可以报名', color: 'text-green-600', icon: CheckCircle }
  }

  const status = getRegistrationStatus()
  const StatusIcon = status.icon

  // 如果是独立页面，使用不同的布局
  if (isStandalonePage) {
    return (
      <div className="bg-white rounded-2xl w-full overflow-y-auto relative">
        <div className="p-6">
          {/* 活动图片横幅 */}
          <div className="aspect-[16/9] bg-gradient-to-br from-golf-200 to-golf-300 rounded-2xl overflow-hidden mb-8">
            <img
              src={event.image_url || 'https://images.pexels.com/photos/1325735/pexels-photo-1325735.jpeg?auto=compress&cs=tinysrgb&w=800'}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 左侧：活动详情 */}
            <div className="space-y-8 lg:col-span-2">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-6">{event.title}</h1>
                <div className="text-gray-600 text-lg leading-relaxed">
                  <TinyMCEViewer content={event.description || ''} />
                </div>
              </div>

              {/* 活动规则 */}
              {event.rules && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-golf-600" />
                    活动规则
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <TinyMCEViewer content={event.rules} />
                  </div>
                </div>
              )}

              {/* 活动精彩文章 */}
              {userProfile?.role === 'admin' && getEventStatus(event) === 'completed' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-golf-600" />
                      活动精彩回顾
                    </h3>
                    <button
                      onClick={() => setIsFullscreenEditing(true)}
                      className="flex items-center px-4 py-2 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80 transition-colors"
                    >
                      <Maximize2 className="w-4 h-4 mr-2" />
                      {event.article_content ? '编辑文章' : '写精彩回顾'}
                    </button>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                      {articleContent ? (
                        <div>
                          <TinyMCEViewer content={articleContent} />
                          {isArticlePublished && (
                            <div className="mt-4 text-sm text-green-600 flex items-center">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              已发布 - {new Date(articlePublishedAt).toLocaleDateString('zh-CN')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-center py-8">
                          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>还没有写活动回顾</p>
                          <p className="text-sm">点击上方按钮开始写精彩回顾</p>
                        </div>
                      )}
                    </div>
                </div>
              )}
            </div>

            {/* 右侧：报名信息 */}
            <div className="space-y-6 lg:col-span-1">
              {/* 活动信息卡片 */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">活动信息</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <Calendar className="w-5 h-5 text-golf-600 mr-3 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {formatEventDateTime().date}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatEventDateTime().time}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <MapPin className="w-5 h-5 text-golf-600 mr-3 mt-0.5" />
                    <div className="font-medium text-gray-900">
                      {event.location}
                    </div>
                  </div>

                  <div className="flex items-start">
                    <DollarSign className="w-5 h-5 text-golf-600 mr-3 mt-0.5" />
                    <div className="font-medium text-gray-900">
                      ¥{event.fee.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Users className="w-5 h-5 text-golf-600 mr-3 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {loading ? '加载中...' : `${stats?.total_registrations || 0}/${event.max_participants}`}
                      </div>
                      <div className="text-sm text-gray-600">
                        还有 {stats?.available_spots || 0} 个名额
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Clock className="w-5 h-5 text-golf-600 mr-3 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">报名截止</div>
                      <div className="text-sm text-gray-600">
                        {formatDateTime(event.registration_deadline)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 报名状态按钮 */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
                <div className="flex items-center justify-center">
                  <StatusIcon className={`w-5 h-5 mr-2 ${status.color}`} />
                  <span className={`font-medium ${status.color}`}>
                    {status.text}
                  </span>
                </div>

                {/* 报名按钮 */}
                {canRegister() && (
                  <button
                    onClick={() => setShowRegistrationModal(true)}
                    className="w-full btn-primary py-3 text-lg mt-4"
                  >
                    立即报名
                  </button>
                )}

                {/* 取消报名按钮 */}
                {canCancelRegistration() && (
                  <div className="space-y-3 mt-4">
                    <div className="text-sm text-gray-600 text-center">
                      报名时间：{formatDateTime(userRegistration!.registration_time)}
                    </div>
                    <button
                      onClick={handleCancelRegistration}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg transition-colors"
                    >
                      取消报名
                    </button>
                  </div>
                )}

                {/* 登录提示 */}
                {!user && (
                  <div className="text-center text-gray-500 text-sm mt-4">
                    请先登录后再报名参加活动
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 报名弹窗 */}
        {showRegistrationModal && (
          <EventRegistrationModal
            event={event}
            user={user}
            onClose={() => setShowRegistrationModal(false)}
            onSuccess={() => {
              setShowRegistrationModal(false)
              fetchEventData()
            }}
          />
        )}

        {/* 全屏编辑模态窗口 */}
        {isFullscreenEditing && (
          <div className="fixed inset-0 bg-white z-[80] flex flex-col">
            {/* 全屏编辑器头部 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center">
                <button
                  onClick={() => setIsFullscreenEditing(false)}
                  className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  返回
                </button>
                <h2 className="text-xl font-semibold text-gray-900">
                  全屏编辑 - {event.title}
                </h2>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSaveArticle}
                  disabled={savingArticle}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {savingArticle ? '保存中...' : '保存草稿'}
                </button>
                <button
                  onClick={handlePublishArticle}
                  disabled={savingArticle}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {savingArticle ? '发布中...' : '发布文章'}
                </button>
                <button
                  onClick={() => setIsFullscreenEditing(false)}
                  className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <Minimize2 className="w-4 h-4 mr-2" />
                  退出全屏
                </button>
              </div>
            </div>

            {/* 全屏编辑器内容 */}
            <div className="flex-1 flex flex-col p-6">
              {/* 发布设置 */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4 text-golf-600 border-gray-300 rounded focus:ring-golf-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    公开可见（所有人可查看，不仅仅是会员）
                  </span>
                </label>
                <p className="ml-7 mt-1 text-xs text-gray-500">
                  勾选后，此活动回顾将在网站首页公开显示；不勾选则仅会员可见
                </p>
              </div>

              {/* 文章摘要 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  文章摘要
                </label>
                <textarea
                  value={articleExcerpt}
                  onChange={(e) => setArticleExcerpt(e.target.value)}
                  placeholder="请输入文章摘要，用于列表展示..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>

              {/* 文章内容 */}
              <div className="flex-1 flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  文章内容
                </label>
                <div className="flex-1">
                  <TinyMCEEditor
                    content={articleContent}
                    onChange={setArticleContent}
                    placeholder="请写下活动的精彩回顾..."
                    editorId="fullscreen-article-editor"
                    height={window.innerHeight - 300}
                  />
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    )
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
    newParams.delete('eventId')
    if (newParams.toString()) {
      navigate(`/dashboard?${newParams.toString()}`, { replace: true })
    } else {
      navigate('/dashboard?view=events', { replace: true })
    }
    // 延迟关闭，让动画完成后再关闭，避免 Dashboard 的 useEffect 立即关闭导致闪烁
    setTimeout(() => {
      onClose()
    }, 250)
  }

  const handleShare = async () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    // 使用公开的分享页面URL，这样社交媒体爬虫可以读取到meta标签
    const shareUrl = `${window.location.origin}/event/${event.id}`
    
    if (navigator.share && (isMobile || window.location.protocol === 'https:')) {
      try {
        await navigator.share({
          title: event.title || '活动详情',
          text: stripHtml(event.description || event.article_excerpt || ''),
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

  // Modal模式（原有代码）
  return (
    <>
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-0 sm:p-4 overflow-hidden transition-opacity duration-200 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onTouchMove={(e) => e.preventDefault()}
        onWheel={(e) => e.preventDefault()}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleCloseModal()
          }
        }}
      >
        <div className={`bg-white rounded-none sm:rounded-2xl w-full h-full sm:h-auto max-w-6xl sm:max-h-[90vh] flex flex-col relative mx-auto transition-transform duration-200 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}>
          {/* 固定头部 */}
          <div className="sticky top-0 bg-white border-b border-gray-200 z-20 flex items-center justify-between px-4 sm:px-6 py-4 shadow-sm">
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
            <div className="p-4 sm:p-6">
          {/* 活动图片横幅 */}
          <div className="aspect-[16/9] bg-gradient-to-br from-golf-200 to-golf-300 rounded-2xl overflow-hidden mb-8">
            <img
              src={event.image_url || 'https://images.pexels.com/photos/1325735/pexels-photo-1325735.jpeg?auto=compress&cs=tinysrgb&w=800'}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 左侧：活动详情 */}
            <div className="space-y-8 lg:col-span-2">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-6">{event.title}</h1>
                <div className="text-gray-600 text-lg leading-relaxed">
                  <TinyMCEViewer content={event.description || ''} />
                </div>
              </div>

              {/* 活动规则 */}
              {event.rules && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-golf-600" />
                    活动规则
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <TinyMCEViewer content={event.rules} />
                  </div>
                </div>
              )}

              {/* 活动精彩文章 */}
              {userProfile?.role === 'admin' && getEventStatus(event) === 'completed' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-golf-600" />
                      活动精彩回顾
                    </h3>
                    <button
                      onClick={() => setIsFullscreenEditing(true)}
                      className="flex items-center px-4 py-2 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80 transition-colors"
                    >
                      <Maximize2 className="w-4 h-4 mr-2" />
                      {event.article_content ? '编辑文章' : '写精彩回顾'}
                    </button>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                      {articleContent ? (
                        <div>
                          <TinyMCEViewer content={articleContent} />
                          {isArticlePublished && (
                            <div className="mt-4 text-sm text-green-600 flex items-center">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              已发布 - {new Date(articlePublishedAt).toLocaleDateString('zh-CN')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-center py-8">
                          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>还没有写活动回顾</p>
                          <p className="text-sm">点击上方按钮开始写精彩回顾</p>
                        </div>
                      )}
                    </div>
                </div>
              )}
            </div>

            {/* 右侧：报名信息 */}
            <div className="space-y-6 lg:col-span-1">
              {/* 活动信息卡片 */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">活动信息</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <Calendar className="w-5 h-5 text-golf-600 mr-3 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {formatEventDateTime().date}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatEventDateTime().time}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <MapPin className="w-5 h-5 text-golf-600 mr-3 mt-0.5" />
                    <div className="font-medium text-gray-900">
                      {event.location}
                    </div>
                  </div>

                  <div className="flex items-start">
                    <DollarSign className="w-5 h-5 text-golf-600 mr-3 mt-0.5" />
                    <div className="font-medium text-gray-900">
                      ¥{event.fee.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Users className="w-5 h-5 text-golf-600 mr-3 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {loading ? '加载中...' : `${stats?.total_registrations || 0}/${event.max_participants}`}
                      </div>
                      <div className="text-sm text-gray-600">
                        还有 {stats?.available_spots || 0} 个名额
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Clock className="w-5 h-5 text-golf-600 mr-3 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">报名截止</div>
                      <div className="text-sm text-gray-600">
                        {formatDateTime(event.registration_deadline)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 报名状态按钮 */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
                <div className="flex items-center justify-center">
                  <StatusIcon className={`w-5 h-5 mr-2 ${status.color}`} />
                  <span className={`font-medium ${status.color}`}>
                    {status.text}
                  </span>
                </div>

                {/* 报名按钮 */}
                {canRegister() && (
                  <button
                    onClick={() => setShowRegistrationModal(true)}
                    className="w-full btn-primary py-3 text-lg mt-4"
                  >
                    立即报名
                  </button>
                )}

                {/* 取消报名按钮 */}
                {canCancelRegistration() && (
                  <div className="space-y-3 mt-4">
                    <div className="text-sm text-gray-600 text-center">
                      报名时间：{formatDateTime(userRegistration!.registration_time)}
                    </div>
                    <button
                      onClick={handleCancelRegistration}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg transition-colors"
                    >
                      取消报名
                    </button>
                  </div>
                )}

                {/* 登录提示 */}
                {!user && (
                  <div className="text-center text-gray-500 text-sm mt-4">
                    请先登录后再报名参加活动
                  </div>
                )}
              </div>
            </div>
          </div>
            </div>
          </div>
        </div>
      </div>

      {/* 分享弹窗 */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={`${window.location.origin}/event/${event.id}`}
        title={event.title}
        description={stripHtml(event.description || event.article_excerpt || '')}
        imageUrl={event.image_url || event.article_featured_image_url}
      />

      {/* 报名弹窗 */}
      {showRegistrationModal && (
        <EventRegistrationModal
          event={event}
          user={user}
          onClose={() => setShowRegistrationModal(false)}
          onSuccess={() => {
            setShowRegistrationModal(false)
            fetchEventData()
          }}
        />
      )}

      {/* 全屏编辑模态窗口 */}
      {isFullscreenEditing && (
        <div className="fixed inset-0 bg-white z-[80] flex flex-col">
          {/* 全屏编辑器头部 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center">
              <button
                onClick={() => setIsFullscreenEditing(false)}
                className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                返回
              </button>
              <h2 className="text-xl font-semibold text-gray-900">
                全屏编辑 - {event.title}
              </h2>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSaveArticle}
                disabled={savingArticle}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {savingArticle ? '保存中...' : '保存草稿'}
              </button>
              <button
                onClick={handlePublishArticle}
                disabled={savingArticle}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Eye className="w-4 h-4 mr-2" />
                {savingArticle ? '发布中...' : '发布文章'}
              </button>
              <button
                onClick={() => setIsFullscreenEditing(false)}
                className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <Minimize2 className="w-4 h-4 mr-2" />
                退出全屏
              </button>
            </div>
          </div>

          {/* 全屏编辑器内容 */}
          <div className="flex-1 flex flex-col p-6">
            {/* 发布设置 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 text-golf-600 border-gray-300 rounded focus:ring-golf-500"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">
                  公开可见（所有人可查看，不仅仅是会员）
                </span>
              </label>
              <p className="ml-7 mt-1 text-xs text-gray-500">
                勾选后，此活动回顾将在网站首页公开显示；不勾选则仅会员可见
              </p>
            </div>

            {/* 文章摘要 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                文章摘要
              </label>
              <textarea
                value={articleExcerpt}
                onChange={(e) => setArticleExcerpt(e.target.value)}
                placeholder="请输入文章摘要，用于列表展示..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>

            {/* 文章内容 */}
            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                文章内容
              </label>
              <div className="flex-1">
                <TinyMCEEditor
                  content={articleContent}
                  onChange={setArticleContent}
                  placeholder="请写下活动的精彩回顾..."
                  editorId="fullscreen-article-editor"
                  height={window.innerHeight - 300}
                />
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}