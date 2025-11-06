import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Share2, ArrowLeft, X, Calendar, MapPin, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Event } from '../types'
import { useAuth } from '../hooks/useAuth'
import ShareModal from '../components/ShareModal'
import TinyMCEViewer from '../components/TinyMCEViewer'

interface Reply {
  id: string
  event_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  parent_reply_id?: string | null
  user_profile?: {
    full_name: string
    avatar_url?: string
  }
  child_replies?: Reply[]
}

export default function EventReviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [showShareModal, setShowShareModal] = useState(false)

  useEffect(() => {
    if (id) {
      fetchEvent()
    }
  }, [id])

  // 动态设置页面标题和 Open Graph 元标签
  useEffect(() => {
    if (event) {
      document.title = `${event.title} - 活动回顾 - VCL Golf Club`
      
      const setMetaTag = (property: string, content: string) => {
        let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement
        if (!meta) {
          meta = document.createElement('meta')
          meta.setAttribute('property', property)
          document.head.appendChild(meta)
        }
        meta.setAttribute('content', content)
      }

      setMetaTag('og:title', event.title)
      setMetaTag('og:description', event.article_excerpt || event.description || '')
      setMetaTag('og:url', window.location.href)
      setMetaTag('og:type', 'article')
      
      if (event.image_url || event.article_featured_image_url) {
        setMetaTag('og:image', event.image_url || event.article_featured_image_url || '')
      }
    }

    return () => {
      document.title = 'VCL Golf Club'
    }
  }, [event])

  const fetchEvent = async () => {
    try {
      if (!supabase) return

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .eq('article_published', true)
        .single()

      if (error) {
        console.error('获取活动失败:', error)
        navigate('/dashboard')
        return
      }

      setEvent(data)
    } catch (error) {
      console.error('获取活动失败:', error)
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    if (navigator.share && (isMobile || window.location.protocol === 'https:')) {
      try {
        await navigator.share({
          title: event?.title || '活动回顾',
          text: event?.article_excerpt || event?.description || '',
          url: window.location.href,
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#F15B98] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">活动回顾不存在或已被删除</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard?view=reviews')}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              返回
            </button>
            <button
              onClick={handleShare}
              className="flex items-center px-4 py-2 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80 transition-colors"
            >
              <Share2 className="w-4 h-4 mr-2" />
              分享
            </button>
          </div>
        </div>
      </div>

      {/* 内容 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* 活动图片 */}
          {event.image_url && (
            <div className="aspect-[16/9] bg-gradient-to-br from-golf-200 to-golf-300 overflow-hidden">
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* 文章内容 */}
          <div className="p-6 sm:p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>
            
            {/* 活动信息 */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{formatDate(event.start_time)}</span>
              </div>
              {event.location && (
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{event.location}</span>
                </div>
              )}
              {event.article_published_at && (
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>发布于 {formatDate(event.article_published_at)}</span>
                </div>
              )}
            </div>

            {/* 文章摘要 */}
            {event.article_excerpt && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-gray-700 italic">{event.article_excerpt}</p>
              </div>
            )}

            {/* 文章正文 */}
            {event.article_content && (
              <div className="prose max-w-none">
                <TinyMCEViewer content={event.article_content} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 分享弹窗 */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={window.location.href}
        title={event.title}
        description={event.article_excerpt || event.description}
        imageUrl={event.image_url || event.article_featured_image_url}
      />
    </div>
  )
}

