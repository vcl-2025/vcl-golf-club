import React, { useState, useEffect } from 'react'
import { 
  X, Calendar, MapPin, Users, Clock, DollarSign, 
  FileText, AlertCircle, CheckCircle, ArrowLeft, Edit3, Save, Eye
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Event, EventStats, EventRegistration } from '../types'
import EventRegistrationModal from './EventRegistrationModal'
import TinyMCEViewer from './TinyMCEViewer'
import TinyMCEEditor from './TinyMCEEditor'
import { useModal } from './ModalProvider'
import { getEventStatus } from '../utils/eventStatus'

interface EventDetailProps {
  event: Event
  onClose: () => void
  user: any
  userProfile?: any
}

export default function EventDetail({ event, onClose, user, userProfile }: EventDetailProps) {
  const [stats, setStats] = useState<EventStats | null>(null)
  const [userRegistration, setUserRegistration] = useState<EventRegistration | null>(null)
  const [showRegistrationModal, setShowRegistrationModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isEditingArticle, setIsEditingArticle] = useState(false)
  const [articleContent, setArticleContent] = useState(event.article_content || '')
  const [articleExcerpt, setArticleExcerpt] = useState(event.article_excerpt || '')
  const [savingArticle, setSavingArticle] = useState(false)
  const [isArticlePublished, setIsArticlePublished] = useState(event.article_published || false)
  const [articlePublishedAt, setArticlePublishedAt] = useState(event.article_published_at || '')
  const { confirmAction, showError } = useModal()


  useEffect(() => {
    fetchEventData()
  }, [event.id, user])

  // 防止背景滚动 - 更强力的方案
  useEffect(() => {
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
  }, [])

  const fetchEventData = async () => {
    try {
      // 获取活动统计
      const statsResponse = await supabase
        ?.rpc('get_event_stats', { event_uuid: event.id })
      
      if (statsResponse?.data) {
        setStats(statsResponse.data)
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
      setIsEditingArticle(false)
      
      // console.log('文章保存成功')
      showError('文章保存成功！')
    } catch (error) {
      console.error('保存文章失败:', error)
      showError(`保存文章失败: ${error.message || '请重试'}`)
    } finally {
      setSavingArticle(false)
    }
  }

  const handlePublishArticle = async () => {
    try {
      setSavingArticle(true)
      
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
      setIsEditingArticle(false)
      
      // console.log('文章发布成功')
      showError('文章发布成功！')
    } catch (error) {
      console.error('发布文章失败:', error)
      showError(`发布文章失败: ${error.message || '请重试'}`)
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

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-2 sm:p-4 overflow-hidden"
      onTouchMove={(e) => e.preventDefault()}
      onWheel={(e) => e.preventDefault()}
    >
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto relative mx-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            返回活动列表
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

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
                    {!isEditingArticle && (
                      <button
                        onClick={() => setIsEditingArticle(true)}
                        className="flex items-center px-3 py-2 bg-golf-600 text-white rounded-lg hover:bg-golf-700 transition-colors"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        {event.article_content ? '编辑文章' : '写精彩回顾'}
                      </button>
                    )}
                  </div>

                  {isEditingArticle ? (
                    <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          文章摘要
                        </label>
                        <textarea
                          value={articleExcerpt}
                          onChange={(e) => setArticleExcerpt(e.target.value)}
                          placeholder="请输入文章摘要，用于列表展示..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          文章内容
                        </label>
                        <TinyMCEEditor
                          content={articleContent}
                          onChange={setArticleContent}
                          placeholder="请写下活动的精彩回顾..."
                          editorId="event-article-editor"
                          height={500}
                        />
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={handleSaveArticle}
                          disabled={savingArticle}
                          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {savingArticle ? '保存中...' : '保存草稿'}
                        </button>
                        <button
                          onClick={handlePublishArticle}
                          disabled={savingArticle}
                          className="flex items-center px-4 py-2 bg-golf-600 text-white rounded-lg hover:bg-golf-700 disabled:opacity-50 transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {savingArticle ? '发布中...' : '发布文章'}
                        </button>
                        <button
                          onClick={() => setIsEditingArticle(false)}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
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
                  )}
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
    </div>
  )
}