import { X, Calendar, ArrowLeft, Download } from 'lucide-react'

interface Poster {
  id: string
  title: string
  description: string
  image_url: string
  display_order: number
  event_date: string
  status: string
  created_at: string
}

interface PosterDetailProps {
  poster: Poster
  onClose: () => void
}

export default function PosterDetail({ poster, onClose }: PosterDetailProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = poster.image_url
    link.download = `${poster.title}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[70] p-4">
      <div className="w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-black bg-opacity-80 backdrop-blur-sm p-4 flex items-center justify-between mb-4 rounded-t-2xl">
          <button
            onClick={onClose}
            className="flex items-center text-white hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            返回列表
          </button>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleDownload}
              className="flex items-center text-white hover:text-gray-300 transition-colors"
            >
              <Download className="w-5 h-5 mr-2" />
              下载海报
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* 左侧：海报大图 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl overflow-hidden">
              <img
                src={poster.image_url}
                alt={poster.title}
                className="w-full h-auto"
              />
            </div>
          </div>

          {/* 右侧：海报详情 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 space-y-6">
              {/* 标题 */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  {poster.title}
                </h1>
              </div>

              {/* 活动日期 */}
              <div className="flex items-start">
                <Calendar className="w-5 h-5 text-golf-600 mr-3 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">活动日期</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {formatDate(poster.event_date)}
                  </div>
                </div>
              </div>

              {/* 活动介绍 */}
              {poster.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    活动介绍
                  </h3>
                  <div className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {poster.description}
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleDownload}
                  className="w-full btn-primary py-3 flex items-center justify-center"
                >
                  <Download className="w-5 h-5 mr-2" />
                  下载高清海报
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
