import { useState, useEffect } from 'react'
import { Calendar, Image as ImageIcon, Filter, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'

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

interface PosterListProps {
  onPosterSelect: (poster: Poster) => void
}

export default function PosterList({ onPosterSelect }: PosterListProps) {
  const [posters, setPosters] = useState<Poster[]>([])
  const [filteredPosters, setFilteredPosters] = useState<Poster[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [monthFilter, setMonthFilter] = useState<string>('all')
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    fetchPosters()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [posters, searchTerm, yearFilter, monthFilter])

  const fetchPosters = async () => {
    try {
      const { data, error } = await supabase
        .from('posters')
        .select('*')
        .eq('status', 'active')
        .order('display_order', { ascending: true })
        .order('event_date', { ascending: false })

      if (error) throw error

      setPosters(data || [])

      const years = [...new Set(
        (data || []).map(p => new Date(p.event_date).getFullYear().toString())
      )].sort((a, b) => b.localeCompare(a))

      setAvailableYears(years)
    } catch (error) {
      console.error('获取海报列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...posters]

    // 标题搜索
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 年份筛选
    if (yearFilter !== 'all') {
      filtered = filtered.filter(p =>
        new Date(p.event_date).getFullYear().toString() === yearFilter
      )
    }

    // 月份筛选
    if (monthFilter !== 'all') {
      filtered = filtered.filter(p =>
        (new Date(p.event_date).getMonth() + 1).toString() === monthFilter
      )
    }

    setFilteredPosters(filtered)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-golf-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 筛选器 */}
      <div className="bg-white rounded-2xl shadow-sm p-3 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <div className="flex items-center">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 mr-2" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">筛选条件</h3>
            {(searchTerm || yearFilter !== 'all' || monthFilter !== 'all') && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                已筛选
              </span>
            )}
          </div>
          
          {/* 移动端折叠按钮 */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="md:hidden flex items-center text-gray-500 hover:text-gray-700 transition-colors"
          >
            {isExpanded ? (
              <>
                <span className="text-xs mr-1">收起</span>
                <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                <span className="text-xs mr-1">展开</span>
                <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
        
        {/* 桌面端始终显示，移动端根据状态显示 */}
        <div className={`flex flex-col lg:flex-row gap-3 sm:gap-4 ${isExpanded ? 'block' : 'hidden md:flex'}`}>
          {/* 标题搜索 */}
          <div className="flex-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              标题搜索
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="按标题搜索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500 text-sm"
              />
            </div>
          </div>

          {/* 年份筛选 */}
          <div className="w-32">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              年份
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500 appearance-none bg-white text-sm"
              >
                <option value="all">全部年份</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}年</option>
                ))}
              </select>
            </div>
          </div>

          {/* 月份筛选 */}
          <div className="w-32">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              月份
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500 appearance-none bg-white text-sm"
              >
                <option value="all">全部月份</option>
                <option value="1">1月</option>
                <option value="2">2月</option>
                <option value="3">3月</option>
                <option value="4">4月</option>
                <option value="5">5月</option>
                <option value="6">6月</option>
                <option value="7">7月</option>
                <option value="8">8月</option>
                <option value="9">9月</option>
                <option value="10">10月</option>
                <option value="11">11月</option>
                <option value="12">12月</option>
              </select>
            </div>
          </div>
        </div>

        {/* 清除过滤器按钮 */}
        {(searchTerm || yearFilter !== 'all' || monthFilter !== 'all') && (
          <div className="mt-2 sm:mt-4 flex justify-end">
            <button
              onClick={() => {
                setSearchTerm('')
                setYearFilter('all')
                setMonthFilter('all')
              }}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              清除所有筛选
            </button>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-600">
          共找到 {filteredPosters.length} 张海报
        </div>
      </div>

      {/* 海报网格 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPosters.map((poster) => (
          <div
            key={poster.id}
            className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group"
            onClick={() => onPosterSelect(poster)}
          >
            {/* 海报图片 */}
            <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
              <img
                src={poster.image_url}
                alt={poster.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* 海报信息 */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                {poster.title}
              </h3>

              <div className="flex items-center text-sm text-gray-600 mb-3">
                <Calendar className="w-4 h-4 mr-2 text-golf-500" />
                {formatDate(poster.event_date)}
              </div>

              {poster.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {poster.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 空状态 */}
      {filteredPosters.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无海报</h3>
          <p className="text-gray-500">当前筛选条件下没有找到海报</p>
        </div>
      )}
    </div>
  )
}
