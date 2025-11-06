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

  useEffect(() => {
    if (id) {
      fetchEvent()
      fetchUserProfile()
    }
  }, [id, user])

  // 动态设置页面标题和 Open Graph 元标签
  useEffect(() => {
    if (event) {
      // 设置页面标题
      document.title = `${event.title} - VCL Golf Club`
      
      // 设置或更新 Open Graph 元标签
      const setMetaTag = (property: string, content: string) => {
        let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement
        if (!meta) {
          meta = document.createElement('meta')
          meta.setAttribute('property', property)
          document.head.appendChild(meta)
        }
        meta.setAttribute('content', content)
      }

      // 设置 Open Graph 标签
      setMetaTag('og:title', event.title)
      setMetaTag('og:description', event.description || event.article_excerpt || '')
      setMetaTag('og:url', window.location.href)
      setMetaTag('og:type', 'article')
      
      if (event.image_url || event.article_featured_image_url) {
        setMetaTag('og:image', event.image_url || event.article_featured_image_url || '')
      }

      // 设置 Twitter Card 标签
      const setTwitterTag = (name: string, content: string) => {
        let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement
        if (!meta) {
          meta = document.createElement('meta')
          meta.setAttribute('name', name)
          document.head.appendChild(meta)
        }
        meta.setAttribute('content', content)
      }

      setTwitterTag('twitter:card', 'summary_large_image')
      setTwitterTag('twitter:title', event.title)
      setTwitterTag('twitter:description', event.description || event.article_excerpt || '')
      if (event.image_url || event.article_featured_image_url) {
        setTwitterTag('twitter:image', event.image_url || event.article_featured_image_url || '')
      }
    }

    // 清理函数：恢复默认标题
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
    // 优先尝试直接调用原生分享（移动端）
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    if (navigator.share && (isMobile || window.location.protocol === 'https:')) {
      try {
        await navigator.share({
          title: event?.title || '活动详情',
          text: event?.description || event?.article_excerpt || '',
          url: window.location.href,
        })
        return // 分享成功，直接返回
      } catch (error: any) {
        // 用户取消分享，不显示弹窗
        if (error.name === 'AbortError') {
          return
        }
        // 其他错误，继续显示弹窗
        console.log('原生分享失败，显示弹窗:', error)
      }
    }
    
    // 如果不支持原生分享或分享失败，显示分享弹窗
    setShowShareModal(true)
  }

  const handleClose = () => {
    navigate('/dashboard')
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
        description={event.description || event.article_excerpt}
        imageUrl={event.image_url || event.article_featured_image_url}
      />
    </div>
  )
}

