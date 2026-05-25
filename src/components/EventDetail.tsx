import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  X, Calendar, MapPin, Users, Clock, User, Check, CircleHelp,
  FileText, AlertCircle, CheckCircle, ArrowLeft, Edit3, Save, Eye, Maximize2, Minimize2, Share2, ChevronLeft, ShoppingCart, Image as ImageIcon, Upload
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Event, EventStats, EventRegistration } from '../types'
import EventRegistrationModal from './EventRegistrationModal'
import TinyMCEViewer from './TinyMCEViewer'
import TinyMCEEditor from './TinyMCEEditor'
import ShareModal from './ShareModal'
import { useModal } from './ModalProvider'
import { getEventStatus } from '../utils/eventStatus'
import { canMemberSelfCancelRegistration } from '../utils/registrationCancel'
import { cancelOwnRegistrationWithAudit } from '../lib/audit'
import RegistrationCancelForm from './RegistrationCancelForm'
import {
  formatEventDateInTimezone,
  formatEventDateTimeInTimezone,
  formatEventTimeInTimezone,
  getEventDateKeyInTimezone
} from '../utils/eventDateTime'

interface EventDetailProps {
  event: Event
  onClose: () => void
  user: any
  userProfile?: any
  isStandalonePage?: boolean // 是否为独立页面模式
  eventCart?: Set<string> // 购物车中的活动ID集合
  onAddToCart?: (eventId: string) => void // 添加到购物车
  onRemoveFromCart?: (eventId: string) => void // 从购物车移除
}

interface PublicRegistrationRow {
  user_id?: string
  name: string
  registered_at: string
  photo_url?: string | null
  registration_status?: 'approved' | 'pending'
}

function RegistrationGridCell({
  photoUrl,
  name,
  approved,
}: {
  photoUrl: string | undefined | null
  name: string
  approved: boolean
}) {
  const [broken, setBroken] = React.useState(false)
  const showImg = !!photoUrl && !broken

  return (
    <div className="flex flex-col items-center justify-start min-w-0">
      <div className="relative shrink-0">
        <div
          className="h-14 w-14 rounded-full overflow-hidden ring-2 ring-gray-100 shadow-sm bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center"
          title={approved ? `${name}：报名已通过` : `${name}：待审核`}
        >
          {showImg ? (
            <img
              src={photoUrl || ''}
              alt=""
              aria-label={`${name}的头像`}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => setBroken(true)}
            />
          ) : (
            <User className="h-7 w-7 text-gray-400" aria-hidden />
          )}
        </div>
        {/* 照片上角标：通过打勾 · 待定问号 */}
        <div
          className={`absolute -bottom-0.5 -right-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-[2.5px] border-white shadow-sm ${
            approved ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'
          }`}
          aria-label={approved ? '报名已通过' : '待审核'}
        >
          {approved ? (
            <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
          ) : (
            <CircleHelp className="h-3 w-3" strokeWidth={2.5} aria-hidden />
          )}
        </div>
      </div>
      <p className="mt-2 max-w-[4.75rem] text-center text-xs font-medium text-gray-900 leading-tight line-clamp-2 break-words px-0.5">
        {name}
      </p>
    </div>
  )
}

/** 活动详情侧栏：报名名单（需登录；数据来自 RPC） */
function PublicRegistrationListCard({
  user,
  listLoading,
  listError,
  participants,
}: {
  user: any
  listLoading: boolean
  listError: string | null
  participants: PublicRegistrationRow[]
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Users className="w-5 h-5 text-golf-600 shrink-0" />
        报名名单
      </h3>
      {!user ? (
        <p className="text-sm text-gray-500 leading-relaxed">
          登录后可查看本场报名会员（头像与进度状态，不含联系方式）。
        </p>
      ) : listError ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          名单加载失败（多为数据库函数未部署或策略限制）：{listError}
        </p>
      ) : listLoading ? (
        <p className="text-sm text-gray-500">名单加载中…</p>
      ) : participants.length === 0 ? (
        <p className="text-sm text-gray-500">暂无报名记录。</p>
      ) : (
        <ul className="max-h-[min(280px,calc(100vh-240px))] overflow-y-auto border-t border-gray-100 pt-3 pr-1 grid grid-cols-4 gap-x-2 gap-y-4 justify-items-center sm:grid-cols-5 list-none p-0 m-0">
            {participants.map((p, i) => {
              const approved = p.registration_status !== 'pending'
              return (
                <li key={p.user_id || `${p.registered_at}-${i}-${p.name}`} className="min-w-0">
                  <RegistrationGridCell
                    photoUrl={p.photo_url}
                    name={p.name}
                    approved={approved}
                  />
                </li>
              )
            })}
        </ul>
      )}
      {user && !listError && !listLoading && participants.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 leading-snug">
          <span className="text-emerald-600">打勾</span>：已通过审核 ·{' '}
          <span className="text-amber-600">问号</span>：待审核
        </p>
      )}
    </div>
  )
}

export default function EventDetail({ event, onClose, user, userProfile, isStandalonePage = false, eventCart = new Set(), onAddToCart, onRemoveFromCart }: EventDetailProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [stats, setStats] = useState<EventStats | null>(null)
  const [flyingItem, setFlyingItem] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null)
  const addToCartButtonRef = React.useRef<HTMLButtonElement>(null)
  const [userRegistration, setUserRegistration] = useState<EventRegistration | null>(null)
  const [showRegistrationModal, setShowRegistrationModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isFullscreenEditing, setIsFullscreenEditing] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [articleContent, setArticleContent] = useState(event.article_content || '')
  const [articleExcerpt, setArticleExcerpt] = useState(event.article_excerpt || '')
  const [articleFeaturedImageUrl, setArticleFeaturedImageUrl] = useState(event.article_featured_image_url || '')
  const [articleImageUploadMethod, setArticleImageUploadMethod] = useState<'url' | 'upload'>('url')
  const [articleImageFile, setArticleImageFile] = useState<File | null>(null)
  const [articleImagePreview, setArticleImagePreview] = useState(event.article_featured_image_url || '')
  const [savingArticle, setSavingArticle] = useState(false)
  const [isArticlePublished, setIsArticlePublished] = useState(event.article_published || false)
  const [articlePublishedAt, setArticlePublishedAt] = useState(event.article_published_at || '')
  const [isPublic, setIsPublic] = useState(event.is_public || false)
  const [publicRegistrationList, setPublicRegistrationList] = useState<PublicRegistrationRow[]>([])
  const [registrationListLoading, setRegistrationListLoading] = useState(false)
  const [registrationListError, setRegistrationListError] = useState<string | null>(null)
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const { showError, showSuccess } = useModal()

  useEffect(() => {
    fetchEventData()
  }, [event.id, user])

  // 重置关闭状态，当模态框重新打开时
  useEffect(() => {
    setIsClosing(false)
  }, [event.id])

  useEffect(() => {
    setArticleFeaturedImageUrl(event.article_featured_image_url || '')
    setArticleImagePreview(event.article_featured_image_url || '')
    setArticleImageUploadMethod('url')
    setArticleImageFile(null)
  }, [event.id, event.article_featured_image_url])

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
    setRegistrationListLoading(true)
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
          .select('is_public, article_published, article_published_at, article_featured_image_url')
          .eq('id', event.id)
          .single()

        if (eventData) {
          setIsPublic(eventData.is_public || false)
          setIsArticlePublished(eventData.article_published || false)
          setArticleFeaturedImageUrl(eventData.article_featured_image_url || '')
          setArticleImagePreview(eventData.article_featured_image_url || '')
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
      } else {
        setUserRegistration(null)
      }

      // 已通过审核的报名名单（需登录；服务端 RPC；函数内需绕过 RLS）
      if (user && supabase) {
        const listRes = await supabase.rpc('get_public_event_registration_list', {
          event_uuid: event.id,
        })
        if (listRes.error) {
          console.error('获取报名名单失败:', listRes.error)
          setRegistrationListError(listRes.error.message || '未知错误')
          setPublicRegistrationList([])
        } else {
          setRegistrationListError(null)
          let rows = listRes.data as unknown
          if (rows != null && !Array.isArray(rows)) {
            if (typeof rows === 'string') {
              try {
                rows = JSON.parse(rows)
              } catch {
                rows = []
              }
            } else {
              rows = []
            }
          }
          const raw = Array.isArray(rows) ? rows : []
          setPublicRegistrationList(
            raw.map((r: Record<string, unknown>) => ({
              user_id: typeof r.user_id === 'string' ? r.user_id : undefined,
              name: typeof r.name === 'string' ? r.name : '会员',
              photo_url:
                typeof r.photo_url === 'string' && r.photo_url.trim() !== '' ? r.photo_url.trim() : null,
              registered_at:
                typeof r.registered_at === 'string' ? r.registered_at : String(r.registered_at ?? ''),
              registration_status:
                r.registration_status === 'pending' ? 'pending' : 'approved',
            }))
          )
        }
      } else {
        setRegistrationListError(null)
        setPublicRegistrationList([])
      }
    } catch (error) {
      console.error('获取活动数据失败:', error)
    } finally {
      setLoading(false)
      setRegistrationListLoading(false)
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

      let finalArticleFeaturedImageUrl = articleFeaturedImageUrl.trim()
      if (articleImageUploadMethod === 'upload' && articleImageFile) {
        const fileExt = articleImageFile.name.split('.').pop()
        const fileName = `review-covers/${event.id}_${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('golf-club-images')
          .upload(fileName, articleImageFile)

        if (uploadError) {
          throw new Error(`封面图上传失败: ${uploadError.message}`)
        }

        const { data: { publicUrl } } = supabase.storage
          .from('golf-club-images')
          .getPublicUrl(fileName)

        finalArticleFeaturedImageUrl = publicUrl
      }

      const { error } = await supabase
        .from('events')
        .update({
          article_content: articleContent,
          article_excerpt: articleExcerpt,
          article_featured_image_url: finalArticleFeaturedImageUrl || null,
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
      setArticleFeaturedImageUrl(finalArticleFeaturedImageUrl)
      setArticleImagePreview(finalArticleFeaturedImageUrl)
      setArticleImageFile(null)
      setArticleImageUploadMethod('url')
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

      let finalArticleFeaturedImageUrl = articleFeaturedImageUrl.trim()
      if (articleImageUploadMethod === 'upload' && articleImageFile) {
        const fileExt = articleImageFile.name.split('.').pop()
        const fileName = `review-covers/${event.id}_${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('golf-club-images')
          .upload(fileName, articleImageFile)

        if (uploadError) {
          throw new Error(`封面图上传失败: ${uploadError.message}`)
        }

        const { data: { publicUrl } } = supabase.storage
          .from('golf-club-images')
          .getPublicUrl(fileName)

        finalArticleFeaturedImageUrl = publicUrl
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
          article_featured_image_url: finalArticleFeaturedImageUrl || null,
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
      setArticleFeaturedImageUrl(finalArticleFeaturedImageUrl)
      setArticleImagePreview(finalArticleFeaturedImageUrl)
      setArticleImageFile(null)
      setArticleImageUploadMethod('url')
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
    return formatEventDateInTimezone(dateString)
  }

  const formatTime = (dateString: string) => {
    return formatEventTimeInTimezone(dateString)
  }

  const formatEventDateTime = () => {
    // 检查是否是同一天
    const isSameDay = getEventDateKeyInTimezone(event.start_time) === getEventDateKeyInTimezone(event.end_time)
    
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
    return formatEventDateTimeInTimezone(dateString)
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
    return (
      userRegistration != null &&
      isRegistrationOpen() &&
      canMemberSelfCancelRegistration(userRegistration, true)
    )
  }

  const handleArticleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setArticleImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setArticleImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // 飞入购物车动画
  const handleAddToCartWithAnimation = (buttonElement: HTMLButtonElement | null) => {
    if (eventCart.has(event.id)) {
      if (onRemoveFromCart) {
        onRemoveFromCart(event.id)
      }
      return
    }

    if (buttonElement && onAddToCart) {
      const buttonRect = buttonElement.getBoundingClientRect()
      
      // 等待一小段时间确保 DOM 已更新，然后查找购物车按钮
      setTimeout(() => {
        // 尝试多种方式找到购物车按钮
        let cartButton = document.querySelector('[title*="购物车"]') as HTMLElement
        
        if (!cartButton) {
          // 尝试通过 SVG 图标查找
          const svgElements = document.querySelectorAll('svg')
          for (const svg of svgElements) {
            if (svg.closest('button') && svg.closest('button')?.getAttribute('title')?.includes('购物车')) {
              cartButton = svg.closest('button') as HTMLElement
              break
            }
          }
        }
        
        if (cartButton) {
          const cartRect = cartButton.getBoundingClientRect()
          setFlyingItem({
            startX: buttonRect.left + buttonRect.width / 2,
            startY: buttonRect.top + buttonRect.height / 2,
            endX: cartRect.left + cartRect.width / 2,
            endY: cartRect.top + cartRect.height / 2
          })
          
          // 动画完成后添加到购物车
          setTimeout(() => {
            onAddToCart(event.id)
            setFlyingItem(null)
          }, 800)
        } else {
          // 如果找不到购物车按钮，直接添加
          onAddToCart(event.id)
        }
      }, 50)
    }
  }

  const openCancelForm = () => {
    setShowCancelForm(true)
  }

  const closeCancelForm = () => {
    if (cancelling) return
    setShowCancelForm(false)
  }

  const handleCancelRegistration = async (reason: string) => {
    if (!userRegistration) return

    const trimmed = (reason || '').trim()
    if (trimmed.length === 0) {
      showError('请填写取消原因')
      return
    }

    setCancelling(true)
    try {
      const { error } = await cancelOwnRegistrationWithAudit(userRegistration.id, trimmed)
      if (error) {
        throw error
      }
      setUserRegistration(null)
      setShowCancelForm(false)
      showSuccess('报名已取消')
    } catch (error: any) {
      console.error('取消报名失败:', error)
      showError(error?.message || '取消报名失败，请重试')
    } finally {
      setCancelling(false)
    }
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
      if (
        userRegistration.approval_status === 'approved' &&
        userRegistration.payment_status === 'paid'
      ) {
        return { text: '完成报名', color: 'text-green-600', icon: CheckCircle }
      } else if (
        userRegistration.approval_status === 'approved' &&
        userRegistration.payment_status === 'pending'
      ) {
        return { text: '报名成功，待付款', color: 'text-blue-600', icon: AlertCircle }
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

                  {/* 费用暂不展示 */}

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

              <PublicRegistrationListCard
                user={user}
                listLoading={registrationListLoading}
                listError={registrationListError}
                participants={publicRegistrationList}
              />

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
                  <div className="space-y-3 mt-4">
                  <button
                    onClick={() => setShowRegistrationModal(true)}
                      className="w-full btn-primary py-3 text-lg"
                  >
                    立即报名
                    </button>
                    {onAddToCart && onRemoveFromCart && (
                      <button
                        onClick={(e) => handleAddToCartWithAnimation(e.currentTarget)}
                        className={`w-full py-3 text-lg rounded-lg transition-colors flex items-center justify-center gap-2 ${
                          eventCart.has(event.id)
                            ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        <ShoppingCart className="w-5 h-5" />
                        {eventCart.has(event.id) ? '已加入购物车' : '加入购物车'}
                  </button>
                    )}
                  </div>
                )}

                {/* 取消报名按钮 */}
                {canCancelRegistration() && (
                  <div className="space-y-3 mt-4">
                    <div className="text-sm text-gray-600 text-center">
                      报名时间：{formatDateTime(userRegistration!.registration_time)}
                    </div>
                    {!showCancelForm ? (
                      <button
                        onClick={openCancelForm}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg transition-colors"
                      >
                        取消报名
                      </button>
                    ) : (
                      <RegistrationCancelForm
                        submitting={cancelling}
                        onSubmit={handleCancelRegistration}
                        onCancel={closeCancelForm}
                      />
                    )}
                  </div>
                )}

                {/* 登录提示 */}
                {!user && (
                  <div className="text-center text-gray-500 text-sm mt-4 space-y-3">
                    <div>请先登录后再报名参加活动</div>
                    <button
                      onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/event/${event.id}`)}`)}
                      className="w-full py-3 px-4 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80 transition-colors"
                    >
                      去登录并返回当前活动
                    </button>
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
              // 触发 EventList 刷新：发送自定义事件
              window.dispatchEvent(new CustomEvent('eventRegistrationUpdated'))
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

              {/* 回顾封面图 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <ImageIcon className="w-4 h-4 inline mr-2" />
                  回顾封面图
                </label>
                <div className="mb-3 flex gap-6">
                  <label className="flex items-center text-sm text-gray-700">
                    <input
                      type="radio"
                      name="articleImageUploadMethodStandalone"
                      value="url"
                      checked={articleImageUploadMethod === 'url'}
                      onChange={(e) => setArticleImageUploadMethod(e.target.value as 'url' | 'upload')}
                      className="mr-2"
                    />
                    URL 输入
                  </label>
                  <label className="flex items-center text-sm text-gray-700">
                    <input
                      type="radio"
                      name="articleImageUploadMethodStandalone"
                      value="upload"
                      checked={articleImageUploadMethod === 'upload'}
                      onChange={(e) => setArticleImageUploadMethod(e.target.value as 'url' | 'upload')}
                      className="mr-2"
                    />
                    文件上传
                  </label>
                </div>
                {articleImageUploadMethod === 'url' ? (
                  <input
                    type="url"
                    value={articleFeaturedImageUrl}
                    onChange={(e) => {
                      setArticleFeaturedImageUrl(e.target.value)
                      setArticleImagePreview(e.target.value)
                      setArticleImageFile(null)
                    }}
                    placeholder="https://example.com/review-cover.jpg"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleArticleImageFileChange}
                      className="hidden"
                      id="review-cover-upload-standalone"
                    />
                    <label htmlFor="review-cover-upload-standalone" className="cursor-pointer block">
                      {articleImagePreview ? (
                        <div>
                          <img src={articleImagePreview} alt="回顾封面预览" className="max-w-full max-h-48 mx-auto mb-2 rounded-lg" />
                          <p className="text-sm text-gray-600">点击更换图片</p>
                        </div>
                      ) : (
                        <div>
                          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600 mb-1">点击上传回顾封面图</p>
                          <p className="text-xs text-gray-500">支持 JPG、PNG 格式</p>
                        </div>
                      )}
                    </label>
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  留空时，回顾列表会回退使用活动图片。
                </p>
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
      {/* 飞入购物车动画 */}
      {flyingItem && (
        <>
          <div
            className="fixed z-[9999] pointer-events-none"
            style={{
              left: `${flyingItem.startX}px`,
              top: `${flyingItem.startY}px`,
              transform: 'translate(-50%, -50%)',
              animation: `flyToCart 0.8s ease-in-out forwards`,
              '--end-x': `${flyingItem.endX}px`,
              '--end-y': `${flyingItem.endY}px`
            } as React.CSSProperties}
          >
            <div className="w-12 h-12 bg-[#F15B98] rounded-full flex items-center justify-center shadow-lg">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
          </div>
          <style>{`
            @keyframes flyToCart {
              0% {
                left: ${flyingItem.startX}px;
                top: ${flyingItem.startY}px;
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
              }
              100% {
                left: ${flyingItem.endX}px;
                top: ${flyingItem.endY}px;
                transform: translate(-50%, -50%) scale(0.3);
                opacity: 0;
              }
            }
          `}</style>
        </>
      )}
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

                  {/* 费用暂不展示 */}

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

              <PublicRegistrationListCard
                user={user}
                listLoading={registrationListLoading}
                listError={registrationListError}
                participants={publicRegistrationList}
              />

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
                  <div className="space-y-3 mt-4">
                  <button
                    onClick={() => setShowRegistrationModal(true)}
                      className="w-full btn-primary py-3 text-lg"
                  >
                    立即报名
                    </button>
                    {onAddToCart && onRemoveFromCart && (
                      <button
                        onClick={(e) => handleAddToCartWithAnimation(e.currentTarget)}
                        className={`w-full py-3 text-lg rounded-lg transition-colors flex items-center justify-center gap-2 ${
                          eventCart.has(event.id)
                            ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        <ShoppingCart className="w-5 h-5" />
                        {eventCart.has(event.id) ? '已加入购物车' : '加入购物车'}
                  </button>
                    )}
                  </div>
                )}

                {/* 取消报名按钮 */}
                {canCancelRegistration() && (
                  <div className="space-y-3 mt-4">
                    <div className="text-sm text-gray-600 text-center">
                      报名时间：{formatDateTime(userRegistration!.registration_time)}
                    </div>
                    {!showCancelForm ? (
                      <button
                        onClick={openCancelForm}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg transition-colors"
                      >
                        取消报名
                      </button>
                    ) : (
                      <RegistrationCancelForm
                        submitting={cancelling}
                        onSubmit={handleCancelRegistration}
                        onCancel={closeCancelForm}
                      />
                    )}
                  </div>
                )}

                {/* 登录提示 */}
                {!user && (
                  <div className="text-center text-gray-500 text-sm mt-4 space-y-3">
                    <div>请先登录后再报名参加活动</div>
                    <button
                      onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/event/${event.id}`)}`)}
                      className="w-full py-3 px-4 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80 transition-colors"
                    >
                      去登录并返回当前活动
                    </button>
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

            {/* 回顾封面图 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <ImageIcon className="w-4 h-4 inline mr-2" />
                回顾封面图
              </label>
              <div className="mb-3 flex gap-6">
                <label className="flex items-center text-sm text-gray-700">
                  <input
                    type="radio"
                    name="articleImageUploadMethodModal"
                    value="url"
                    checked={articleImageUploadMethod === 'url'}
                    onChange={(e) => setArticleImageUploadMethod(e.target.value as 'url' | 'upload')}
                    className="mr-2"
                  />
                  URL 输入
                </label>
                <label className="flex items-center text-sm text-gray-700">
                  <input
                    type="radio"
                    name="articleImageUploadMethodModal"
                    value="upload"
                    checked={articleImageUploadMethod === 'upload'}
                    onChange={(e) => setArticleImageUploadMethod(e.target.value as 'url' | 'upload')}
                    className="mr-2"
                  />
                  文件上传
                </label>
              </div>
              {articleImageUploadMethod === 'url' ? (
                <input
                  type="url"
                  value={articleFeaturedImageUrl}
                  onChange={(e) => {
                    setArticleFeaturedImageUrl(e.target.value)
                    setArticleImagePreview(e.target.value)
                    setArticleImageFile(null)
                  }}
                  placeholder="https://example.com/review-cover.jpg"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleArticleImageFileChange}
                    className="hidden"
                    id="review-cover-upload-modal"
                  />
                  <label htmlFor="review-cover-upload-modal" className="cursor-pointer block">
                    {articleImagePreview ? (
                      <div>
                        <img src={articleImagePreview} alt="回顾封面预览" className="max-w-full max-h-48 mx-auto mb-2 rounded-lg" />
                        <p className="text-sm text-gray-600">点击更换图片</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 mb-1">点击上传回顾封面图</p>
                        <p className="text-xs text-gray-500">支持 JPG、PNG 格式</p>
                      </div>
                    )}
                  </label>
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">
                留空时，回顾列表会回退使用活动图片。
              </p>
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