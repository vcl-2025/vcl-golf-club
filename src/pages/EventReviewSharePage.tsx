import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Event } from '../types'
import TinyMCEViewer from '../components/TinyMCEViewer'
import { useAuth } from '../hooks/useAuth'

export default function EventReviewSharePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchEvent()
    }
  }, [id])

  // 去除 HTML 标签，只保留纯文本
  const stripHtml = (html: string) => {
    if (!html) return ''
    const tmp = document.createElement('DIV')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

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

      // 去除 HTML 标签，只保留纯文本
      const description = stripHtml(event.article_excerpt || event.description || '')
      
      setMetaTag('og:title', event.title)
      setMetaTag('og:description', description)
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

      if (error || !data) {
        console.error('获取活动失败:', error)
        navigate('/dashboard?view=reviews')
        return
      }

      setEvent(data)
    } catch (error) {
      console.error('获取活动失败:', error)
      navigate('/dashboard?view=reviews')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F15B98]"></div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">活动回顾不存在</p>
          <button
            onClick={() => navigate('/dashboard?view=reviews')}
            className="px-4 py-2 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80"
          >
            返回活动回顾
          </button>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(user ? '/dashboard?view=reviews' : '/')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            <span className="text-base font-medium">返回</span>
          </button>
          {user && (
            <button
              onClick={() => navigate(`/dashboard?view=reviews&reviewId=${event.id}`)}
              className="px-4 py-2 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80 transition-colors"
            >
              查看完整内容
            </button>
          )}
        </div>
      </div>

      {/* 内容 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* 标题 */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>
            
            {/* 活动信息 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <span className="font-medium mr-2">活动日期：</span>
                <span>{formatDate(event.start_time)}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium mr-2">活动地点：</span>
                <span className="truncate">{event.location}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium mr-2">参与人数：</span>
                <span>最多 {event.max_participants} 人</span>
              </div>
            </div>
          </div>

          {/* 文章内容 */}
          <div className="p-6">
            <div className="prose max-w-none">
              <TinyMCEViewer content={event.article_content || ''} />
            </div>
          </div>

          {/* 提示登录 */}
          {!user && (
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <p className="text-center text-gray-600 mb-4">
                登录后可以查看完整内容和参与讨论
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-2 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80 transition-colors"
                >
                  立即登录
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

