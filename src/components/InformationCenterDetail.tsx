import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X, Calendar, Eye, FileText, Download, Clock, User, Pin, AlertCircle, Share2, ChevronLeft } from 'lucide-react'
import { InformationItem } from '../types'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import ShareModal from './ShareModal'

interface InformationCenterDetailProps {
  item: InformationItem
  onClose: () => void
}

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

export default function InformationCenterDetail({ item, onClose }: InformationCenterDetailProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [viewCount, setViewCount] = useState(item.view_count)
  const [copied, setCopied] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  useEffect(() => {
    incrementViewCount()
  }, [item.id])

  const incrementViewCount = async () => {
    try {
      // 增加浏览次数
      const { error } = await supabase.rpc('increment_information_item_views', {
        item_id: item.id
      })

      if (!error) {
        setViewCount(prev => prev + 1)
      }
    } catch (error) {
      // 如果RPC不存在，直接更新
      const { data, error: updateError } = await supabase
        .from('information_items')
        .update({ view_count: item.view_count + 1 })
        .eq('id', item.id)
        .select('view_count')
        .single()

      if (!updateError && data) {
        setViewCount(data.view_count)
      }
    }
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

  // 去除 HTML 标签，只保留纯文本
  const stripHtml = (html: string) => {
    if (!html) return ''
    const tmp = document.createElement('DIV')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  const handleCloseModal = () => {
    // 先更新 URL，移除 informationId 参数
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('informationId')
    if (newParams.toString()) {
      navigate(`/dashboard?${newParams.toString()}`, { replace: true })
    } else {
      navigate('/dashboard?view=information', { replace: true })
    }
    // 然后关闭模态框
    onClose()
  }

  const handleShare = async () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    // 使用公开的分享页面URL，这样社交媒体爬虫可以读取到meta标签
    const shareUrl = `${window.location.origin}/information/${item.id}`
    
    if (navigator.share && (isMobile || window.location.protocol === 'https:')) {
      try {
        await navigator.share({
          title: item.title || '信息中心',
          text: stripHtml(item.content || item.excerpt || ''),
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

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70] overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleCloseModal()
          }
        }}
      >
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-xl">
          {/* 固定头部 */}
          <div className="sticky top-0 bg-white border-b border-gray-200 z-10 flex items-center justify-between px-6 py-4 rounded-t-2xl">
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
            <div className="px-4 sm:px-6 py-6">
              {/* 分类和优先级标签 */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${categoryColors[item.category]}`}>
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

              {/* 标题 */}
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
                {item.title}
              </h1>

              {/* 元信息 */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
                {item.published_at && (
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>发布时间：{formatDate(item.published_at)}</span>
                  </div>
                )}
                {item.expires_at && (
                  <div className="flex items-center text-[#F15B98]">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>有效期至：{formatDate(item.expires_at)}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-1" />
                  <span>{viewCount} 次阅读</span>
                </div>
                {item.author && (
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    <span>{item.author.full_name || item.author.email}</span>
                  </div>
                )}
              </div>

              {/* 封面图 */}
              {item.featured_image_url && (
                <div className="mb-6">
                  <img
                    src={item.featured_image_url}
                    alt={item.title}
                    className="w-full h-auto rounded-xl shadow-md"
                  />
                </div>
              )}

              {/* 正文内容 */}
              <div className="prose max-w-none mb-6">
                {item.content ? (
                  <div 
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: item.content }}
                  />
                ) : (
                  <p className="text-gray-600">{item.excerpt}</p>
                )}
              </div>

              {/* 附件列表 */}
              {item.attachments && item.attachments.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    附件下载
                  </h3>
                  <div className="space-y-2">
                    {item.attachments.map((attachment, index) => (
                      <a
                        key={index}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center flex-1 min-w-0">
                          <div className="w-10 h-10 bg-[#F15B98]/20 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                            <FileText className="w-5 h-5 text-[#F15B98]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {attachment.name}
                            </p>
                            {attachment.size && (
                              <p className="text-xs text-gray-500 mt-1">
                                {formatFileSize(attachment.size)}
                                {attachment.type && ` • ${attachment.type}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <Download className="w-5 h-5 text-gray-400 group-hover:text-[#F15B98] transition-colors ml-4 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 分享弹窗 */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={`${window.location.origin}/information/${item.id}`}
        title={item.title}
        description={stripHtml(item.content || item.excerpt || '')}
        imageUrl={item.featured_image_url}
      />
    </>
  )
}

