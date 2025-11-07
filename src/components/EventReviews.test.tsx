import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, Share2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Event } from '../types'
import { useAuth } from '../hooks/useAuth'

export default function EventReviewsTest() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    const reviewId = searchParams.get('reviewId')
    if (reviewId && !loading && events.length > 0 && !selectedEvent) {
      const event = events.find(e => e.id === reviewId)
      if (event) {
        setSelectedEvent(event)
      }
    }
  }, [searchParams, loading, events, selectedEvent])

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('article_published', true)
        .order('article_published_at', { ascending: false })

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCloseModal = () => {
    setSelectedEvent(null)
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('reviewId')
    setSearchParams(newParams)
  }

  const handleShare = () => {
    if (!selectedEvent) return
    const shareUrl = `${window.location.origin}/review/${selectedEvent.id}`
    if (navigator.share) {
      navigator.share({
        title: selectedEvent.title,
        text: selectedEvent.description,
        url: shareUrl
      })
    } else {
      navigator.clipboard.writeText(shareUrl)
      alert('链接已复制到剪贴板')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F15B98]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">活动精彩回顾 - 测试版本</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              onClick={() => {
                setSelectedEvent(event)
                const newParams = new URLSearchParams(searchParams)
                newParams.set('reviewId', event.id)
                setSearchParams(newParams)
              }}
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            >
              {event.image_url && (
                <img
                  src={event.image_url}
                  alt={event.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 测试 Modal - 使用不同的实现方式 */}
      {selectedEvent && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[9999]"
            onClick={handleCloseModal}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
          />
          
          {/* Modal 内容 - 使用 fixed 定位，直接计算 top 值 */}
          <div
            className="fixed left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl z-[10000] flex flex-col"
            style={{
              top: '60px', // 直接设置 top，避开 header
              width: '90%',
              maxWidth: '1080px',
              height: 'calc(100vh - 80px)',
              maxHeight: 'calc(100vh - 80px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 固定头部 - 使用 fixed 定位 */}
            <div
              className="bg-red-500 border-b-4 border-blue-500 flex items-center justify-between px-6 py-6 rounded-t-2xl"
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 10001,
                backgroundColor: '#FF0000',
                minHeight: '80px'
              }}
            >
              <button
                onClick={handleCloseModal}
                className="flex items-center text-white font-bold text-xl"
              >
                <ChevronLeft className="w-7 h-7 mr-2" />
                <span>返回列表 - 测试</span>
              </button>
              <button
                onClick={handleShare}
                className="flex items-center px-5 py-3 bg-blue-500 text-white rounded-lg font-bold text-lg"
              >
                <Share2 className="w-6 h-6 mr-2" />
                分享 - 测试
              </button>
            </div>

            {/* 可滚动内容 */}
            <div className="flex-1 overflow-y-auto bg-yellow-100 p-8">
              <div className="text-center space-y-6">
                <h2 className="text-4xl font-bold text-gray-900 mb-6">测试 Modal - 新实现</h2>
                <p className="text-xl text-gray-600 mb-8">使用 fixed 定位，直接设置 top: 80px 避开 header</p>
                <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
                  <p className="text-lg mb-4 font-semibold">如果这个红色头部和蓝色边框都能完整显示，说明定位没问题</p>
                  <p className="text-lg mb-4 font-semibold">如果头部被遮挡，说明需要调整定位方式</p>
                </div>
                {/* 添加更多内容以增加高度 */}
                {Array.from({ length: 20 }, (_, i) => (
                  <div key={i} className="p-4 bg-white rounded-lg shadow mb-4">
                    <p className="text-gray-700">测试内容行 {i + 1} - 用于增加 modal 高度，检查滚动和定位</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

