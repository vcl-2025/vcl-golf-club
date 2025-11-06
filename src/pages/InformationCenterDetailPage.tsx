import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Share2, ArrowLeft, Calendar, Eye, FileText, Download, Clock, Pin, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { InformationItem } from '../types'
import { useAuth } from '../hooks/useAuth'
import ShareModal from '../components/ShareModal'
import TinyMCEViewer from '../components/TinyMCEViewer'

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

export default function InformationCenterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [item, setItem] = useState<InformationItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewCount, setViewCount] = useState(0)
  const [showShareModal, setShowShareModal] = useState(false)

  useEffect(() => {
    if (id) {
      fetchItem()
    }
  }, [id])

  // 动态设置页面标题和 Open Graph 元标签
  useEffect(() => {
    if (item) {
      document.title = `${item.title} - 信息中心 - VCL Golf Club`
      
      const setMetaTag = (property: string, content: string) => {
        let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement
        if (!meta) {
          meta = document.createElement('meta')
          meta.setAttribute('property', property)
          document.head.appendChild(meta)
        }
        meta.setAttribute('content', content)
      }

      setMetaTag('og:title', item.title)
      setMetaTag('og:description', item.content || '')
      setMetaTag('og:url', window.location.href)
      setMetaTag('og:type', 'article')
      
      if (item.image_url) {
        setMetaTag('og:image', item.image_url)
      }
    }

    return () => {
      document.title = 'VCL Golf Club'
    }
  }, [item])

  const fetchItem = async () => {
    try {
      if (!supabase) return

      const { data, error } = await supabase
        .from('information_items')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('获取信息失败:', error)
        navigate('/dashboard')
        return
      }

      setItem(data)
      setViewCount(data.view_count || 0)
      incrementViewCount(data.id)
    } catch (error) {
      console.error('获取信息失败:', error)
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const incrementViewCount = async (itemId: string) => {
    try {
      const { error } = await supabase.rpc('increment_information_item_views', {
        item_id: itemId
      })

      if (!error) {
        setViewCount(prev => prev + 1)
      } else {
        // 如果RPC不存在，直接更新
        const { data } = await supabase
          ?.from('information_items')
          .update({ view_count: (viewCount || 0) + 1 })
          .eq('id', itemId)
          .select('view_count')
          .single()

        if (data) {
          setViewCount(data.view_count)
        }
      }
    } catch (error) {
      console.error('更新浏览次数失败:', error)
    }
  }

  const handleShare = async () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    if (navigator.share && (isMobile || window.location.protocol === 'https:')) {
      try {
        await navigator.share({
          title: item?.title || '信息中心',
          text: item?.content || '',
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

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">信息不存在或已被删除</p>
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
              onClick={() => navigate('/dashboard?view=information')}
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
          {/* 头部 */}
          <div className="p-6 sm:p-8 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${categoryColors[item.category as keyof typeof categoryColors]}`}>
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

            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              {item.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{formatDate(item.created_at)}</span>
              </div>
              <div className="flex items-center">
                <Eye className="w-4 h-4 mr-2" />
                <span>{viewCount} 次浏览</span>
              </div>
            </div>
          </div>

          {/* 图片 */}
          {item.image_url && (
            <div className="aspect-[16/9] bg-gray-100 overflow-hidden">
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* 正文内容 */}
          <div className="p-6 sm:p-8">
            <div className="prose max-w-none">
              <TinyMCEViewer content={item.content || ''} />
            </div>

            {/* 附件 */}
            {item.attachments && item.attachments.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  附件
                </h3>
                <div className="space-y-2">
                  {item.attachments.map((attachment: any, index: number) => (
                    <a
                      key={index}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {attachment.name || '附件'}
                          </p>
                          {attachment.size && (
                            <p className="text-xs text-gray-500">
                              {formatFileSize(attachment.size)}
                            </p>
                          )}
                        </div>
                      </div>
                      <Download className="w-5 h-5 text-gray-400 ml-2 flex-shrink-0" />
                    </a>
                  ))}
                </div>
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
        title={item.title}
        description={item.content}
        imageUrl={item.image_url}
      />
    </div>
  )
}

