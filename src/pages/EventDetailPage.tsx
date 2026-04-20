import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Share2, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Event } from '../types'
import EventDetail from '../components/EventDetail'
import { useAuth } from '../hooks/useAuth'
import ShareModal from '../components/ShareModal'

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showShareModal, setShowShareModal] = useState(false)

  const stripHtml = (html: string) => {
    if (!html) return ''
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return (tmp.textContent || tmp.innerText || '').trim()
  }

  useEffect(() => {
    if (id) {
      fetchEvent()
      fetchUserProfile()
    }
  }, [id, user])

  // 动态设置页面标题和 Open Graph 元标签
  useEffect(() => {
    if (event) {
      document.title = `${event.title} - VCL Golf Club`
      
      const setMetaTag = (property: string, content: string) => {
        let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement
        if (!meta) {
          meta = document.createElement('meta')
          meta.setAttribute('property', property)
          document.head.appendChild(meta)
        }
        meta.setAttribute('content', content)
      }

      const plainDescription = stripHtml(event.description || event.article_excerpt || '')

      setMetaTag('og:title', event.title || 'VCL Golf Club 活动详情')
      setMetaTag('og:description', plainDescription || '查看 VCL Golf Club 活动详情')
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
        .single()

      if (error) {
        console.error('获取活动失败:', error)
        navigate('/dashboard?view=events')
        return
      }

      setEvent(data)
    } catch (error) {
      console.error('获取活动失败:', error)
      navigate('/dashboard?view=events')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    if (!user) return

    try {
      if (!supabase) return

      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setUserProfile(data)
    } catch (error) {
      console.error('获取用户资料失败:', error)
    }
  }

  const handleShare = async () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    if (navigator.share && (isMobile || window.location.protocol === 'https:')) {
      try {
        await navigator.share({
          title: event?.title || '活动详情',
          text: stripHtml(event?.description || event?.article_excerpt || ''),
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

  const handleClose = () => {
    navigate('/dashboard?view=events')
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
          <p className="text-gray-600 mb-4">活动不存在或已被删除</p>
          <button
            onClick={() => navigate('/dashboard?view=events')}
            className="px-4 py-2 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80 transition-colors"
          >
            返回活动列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleClose}
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

      {/* 活动详情内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <EventDetail
          event={event}
          onClose={handleClose}
          user={user}
          userProfile={userProfile}
          isStandalonePage={true}
        />
      </div>

      {/* 分享弹窗 */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={window.location.href}
        title={event.title}
        description={stripHtml(event.description || event.article_excerpt || '')}
        imageUrl={event.image_url || event.article_featured_image_url}
      />
    </div>
  )
}

