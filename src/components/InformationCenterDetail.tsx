import { useEffect, useState } from 'react'
import { X, Calendar, Eye, FileText, Download, Clock, User, Pin, AlertCircle, Share2 } from 'lucide-react'
import { InformationItem } from '../types'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

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
  const { user } = useAuth()
  const [viewCount, setViewCount] = useState(item.view_count)
  const [copied, setCopied] = useState(false)

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70] overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 rounded-t-2xl z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* 分类和优先级标签 */}
              <div className="flex items-center gap-2 mb-2">
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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                {item.title}
              </h1>

              {/* 元信息 */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
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
            </div>

            {/* 分享和关闭按钮 */}
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
              <button
                onClick={handleShare}
                className="flex items-center px-3 py-2 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80 transition-colors text-sm"
              >
                <Share2 className="w-4 h-4 mr-1.5" />
                {copied ? '已复制' : '分享'}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="px-4 sm:px-6 py-6">
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

        {/* 底部操作栏 */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 sm:px-6 py-4 rounded-b-2xl">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

