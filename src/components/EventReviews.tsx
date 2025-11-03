import React, { useState, useEffect } from 'react'
import { 
  Calendar, MapPin, Users, Trophy, Clock, FileText, 
  ChevronRight, Star, Eye, Heart, X
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Event } from '../types'
import TinyMCEViewer from './TinyMCEViewer'

export default function EventReviews() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  useEffect(() => {
    fetchPublishedArticles()
  }, [])

  const fetchPublishedArticles = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('article_published', true)
        .order('article_published_at', { ascending: false })

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('获取活动回顾失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F15B98] mx-auto"></div>
        <p className="text-gray-500 mt-2">加载中...</p>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">暂无活动回顾</h3>
        <p className="text-gray-500">还没有发布任何活动精彩回顾</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">活动精彩回顾</h1>
        <p className="text-gray-600">回顾俱乐部精彩活动，重温美好时光</p>
      </div>

      {/* 活动回顾列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
            onClick={() => setSelectedEvent(event)}
          >
            {/* 活动图片 */}
            <div className="aspect-[16/9] bg-gradient-to-br from-[#F15B98]/20 to-[#F15B98]/30 overflow-hidden">
              <img
                src={event.image_url || 'https://images.pexels.com/photos/1325735/pexels-photo-1325735.jpeg?auto=compress&cs=tinysrgb&w=800'}
                alt={event.title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* 活动信息 */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
                {event.title}
              </h3>
              
              {/* 活动日期和地点 */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2 text-golf-500" />
                  <span>{formatEventDate(event.start_time)}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2 text-golf-500" />
                  <span className="truncate">{event.location}</span>
                </div>
              </div>

              {/* 文章摘要 */}
              {event.article_excerpt && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {event.article_excerpt}
                </p>
              )}

              {/* 发布时间 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>发布于 {formatDate(event.article_published_at || '')}</span>
                </div>
                <div className="flex items-center text-[#F15B98]">
                  <span className="text-sm font-medium">查看回顾</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 文章详情模态框 */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-2 sm:p-4 overflow-hidden"
          onTouchMove={(e) => e.preventDefault()}
          onWheel={(e) => e.preventDefault()}
        >
          <div className="bg-white rounded-2xl w-full max-w-[1080px] max-h-[95vh] sm:max-h-[90vh] overflow-y-auto relative mx-auto">
            {/* 头部 */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{selectedEvent.title}</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 内容 */}
            <div className="p-6">
              {/* 活动信息 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-5 h-5 mr-3 text-golf-500" />
                  <div>
                    <div className="font-medium">活动日期</div>
                    <div className="text-sm">{formatDate(selectedEvent.start_time)}</div>
                  </div>
                </div>
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-5 h-5 mr-3 text-golf-500" />
                  <div>
                    <div className="font-medium">活动地点</div>
                    <div className="text-sm">{selectedEvent.location}</div>
                  </div>
                </div>
                <div className="flex items-center text-gray-600">
                  <Users className="w-5 h-5 mr-3 text-golf-500" />
                  <div>
                    <div className="font-medium">参与人数</div>
                    <div className="text-sm">最多 {selectedEvent.max_participants} 人</div>
                  </div>
                </div>
              </div>

              {/* 文章内容 */}
              <div className="prose max-w-none">
                <TinyMCEViewer content={selectedEvent.article_content || ''} />
              </div>

              {/* 发布时间 */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>发布于 {formatDate(selectedEvent.article_published_at || '')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
