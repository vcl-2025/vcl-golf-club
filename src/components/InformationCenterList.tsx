import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, FileText, BookOpen, AlertCircle, Search, Filter, ChevronDown, ChevronUp, Pin, Eye, Calendar, Clock, Flame, Paperclip } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { InformationItem } from '../types'
import { useAuth } from '../hooks/useAuth'

interface InformationCenterListProps {
  onItemSelect: (item: InformationItem) => void
}

const categoryIcons = {
  '公告': AlertCircle,
  '通知': Bell,
  '重要资料': FileText,
  '规则章程': BookOpen
}

const categoryColors = {
  '公告': 'bg-green-100 text-green-700 border border-green-200 shadow-sm',
  '通知': 'bg-[#F15B98]/20 text-[#F15B98] border border-[#F15B98]/30 shadow-sm',
  '重要资料': 'bg-[#F15B98]/20 text-[#F15B98] border border-[#F15B98]/30 shadow-sm',
  '规则章程': 'bg-[#F15B98]/20 text-[#F15B98] border border-[#F15B98]/30 shadow-sm'
}

const categoryBackgroundColors = {
  '公告': 'bg-white/75',
  '通知': 'bg-white/75',
  '重要资料': 'bg-white/75',
  '规则章程': 'bg-white/75'
}

const priorityLabels = {
  0: '',
  1: '重要',
  2: '紧急'
}

const priorityColors = {
  0: '',
  1: 'bg-[#F15B98]/30 text-[#F15B98] border border-[#F15B98]/40 shadow-sm',
  2: 'bg-red-100 text-red-700 border border-red-200 shadow-sm'
}

const priorityIcons = {
  0: null,
  1: null,
  2: Flame
}

export default function InformationCenterList({ onItemSelect }: InformationCenterListProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [items, setItems] = useState<InformationItem[]>([])
  const [filteredItems, setFilteredItems] = useState<InformationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    fetchItems()
  }, [user])

  useEffect(() => {
    applyFilters()
  }, [items, searchTerm, categoryFilter, priorityFilter])

  const fetchItems = async () => {
    try {
      // 先查询基本信息，避免外键关联导致的 RLS 问题
      // 使用更明确的查询条件
      let query = supabase
        .from('information_items')
        .select('*, read_by_users')
        .eq('status', 'published')
        .order('is_pinned', { ascending: false })
        .order('display_order', { ascending: true })
        .order('published_at', { ascending: false })

      const { data: allData, error: queryError } = await query

      if (queryError) {
        console.error('获取信息列表失败:', queryError)
        throw queryError
      }
      
      // 手动过滤过期时间（因为 Supabase 的 .or() 可能在某些情况下不工作）
      const now = new Date().toISOString()
      const data = (allData || []).filter(item => {
        // 如果 expires_at 为 null 或者大于当前时间，则显示
        return !item.expires_at || item.expires_at > now
      })
      
      // 如果有数据且用户已登录，尝试获取作者信息（可选，失败也不影响显示）
      if (data && data.length > 0 && user) {
        try {
          const authorIds = [...new Set(data.map(item => item.author_id).filter(Boolean))]
          if (authorIds.length > 0) {
            const { data: authors } = await supabase
              .from('user_profiles')
              .select('id, full_name, email')
              .in('id', authorIds)
            
            if (authors) {
              const authorMap = new Map(authors.map(a => [a.id, a]))
              data.forEach(item => {
                if (item.author_id && authorMap.has(item.author_id)) {
                  item.author = authorMap.get(item.author_id)
                }
              })
            }
          }
        } catch (err) {
          console.warn('获取作者信息失败，但不影响显示:', err)
        }
      }

      // 获取用户阅读记录 - 使用 read_by_users 数组字段
      if (user) {
        const itemsWithReadStatus = (data || []).map(item => {
          // 检查 read_by_users 数组字段中是否包含当前用户ID
          if (!item.read_by_users || !Array.isArray(item.read_by_users)) {
            return { ...item, is_read: false } // 如果没有 read_by_users 字段或为空数组，视为未读
          }
          
          const isRead = item.read_by_users.includes(user.id)
          return { ...item, is_read: isRead }
        })
        
        setItems(itemsWithReadStatus)
      } else {
        setItems(data || [])
      }
    } catch (error) {
      console.error('获取信息列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...items]

    // 标题搜索
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.content?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 分类筛选
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }

    // 优先级筛选
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(item => item.priority.toString() === priorityFilter)
    }

    setFilteredItems(filtered)
  }

  const markAsRead = async (itemId: string) => {
    if (!user || !supabase) return

    // 找到对应的信息项，检查分类
    const currentItemFull = items.find(item => item.id === itemId)
    if (!currentItemFull) return
    
    // 只对"通知"和"公告"分类标记为已读
    if (currentItemFull.category !== '通知' && currentItemFull.category !== '公告') {
      return
    }

    try {
      // 先获取当前记录的 read_by_users 字段
      const { data: currentItem, error: fetchError } = await supabase
        .from('information_items')
        .select('read_by_users')
        .eq('id', itemId)
        .single()
      
      if (fetchError) {
        console.error('获取信息失败:', fetchError)
        return
      }
      
      // 获取已读用户列表（UUID数组）
      const readUsers = currentItem?.read_by_users || []
      const readUsersArray = Array.isArray(readUsers) ? readUsers : []
      
      // 如果当前用户不在已读列表中，添加进去
      if (!readUsersArray.includes(user.id)) {
        const updatedReadUsers = [...readUsersArray, user.id]
        
        const { error: updateError } = await supabase
          .from('information_items')
          .update({ read_by_users: updatedReadUsers })
          .eq('id', itemId)
        
        if (updateError) {
          console.error('标记已读失败:', updateError)
          return
        }
      }

      // 增加浏览次数
      if (currentItemFull) {
        // 先尝试使用 RPC 函数
        const { error: rpcError } = await supabase.rpc('increment_information_item_views', {
          item_id: itemId
        })
        
        // 如果 RPC 不存在（404）或其他错误，直接更新
        if (rpcError) {
          try {
            await supabase
              .from('information_items')
              .update({ view_count: (currentItemFull.view_count || 0) + 1 })
              .eq('id', itemId)
          } catch (updateErr) {
            console.error('更新浏览次数失败:', updateErr)
          }
        }
      }

      // 更新本地状态
      setItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, is_read: true, view_count: (item.view_count || 0) + 1 } 
          : item
      ))
      
      // 更新筛选后的列表
      setFilteredItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, is_read: true, view_count: (item.view_count || 0) + 1 } 
          : item
      ))
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }

  const handleItemClick = (item: InformationItem) => {
    markAsRead(item.id)
    // 使用 URL 参数打开模态框，支持分享
    const params = new URLSearchParams()
    params.set('view', 'information')
    params.set('informationId', item.id)
    navigate(`/dashboard?${params.toString()}`, { replace: true })
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F15B98]"></div>
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
            {(searchTerm || categoryFilter !== 'all' || priorityFilter !== 'all') && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#F15B98]/20 text-[#F15B98]">
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
        <div className={`flex flex-col gap-3 sm:gap-4 ${isExpanded ? 'flex' : 'hidden md:flex'}`}>
          {/* 标题搜索 - 独占一行 */}
          <div className="w-full">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              搜索
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索标题、内容..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-[#F15B98] text-sm"
              />
            </div>
          </div>

          {/* 分类和优先级 - 放在一行 */}
          <div className="flex flex-row gap-3 sm:gap-4">
            {/* 分类筛选 */}
            <div className="w-32 sm:w-40">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                分类
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-[#F15B98] appearance-none bg-white text-sm"
                >
                  <option value="all">全部分类</option>
                  <option value="公告">公告</option>
                  <option value="通知">通知</option>
                  <option value="重要资料">重要资料</option>
                  <option value="规则章程">规则章程</option>
                </select>
              </div>
            </div>

            {/* 优先级筛选 */}
            <div className="w-32 sm:w-40">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                优先级
              </label>
              <div className="relative">
                <AlertCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-[#F15B98] appearance-none bg-white text-sm"
                >
                  <option value="all">全部</option>
                  <option value="0">普通</option>
                  <option value="1">重要</option>
                  <option value="2">紧急</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 清除过滤器按钮 */}
        {(searchTerm || categoryFilter !== 'all' || priorityFilter !== 'all') && (
          <div className="mt-2 sm:mt-4 flex justify-end">
            <button
              onClick={() => {
                setSearchTerm('')
                setCategoryFilter('all')
                setPriorityFilter('all')
              }}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              清除所有筛选
            </button>
          </div>
        )}

        {(searchTerm || categoryFilter !== 'all' || priorityFilter !== 'all') && (
          <div className="mt-4 text-sm text-gray-600">
            共找到 {filteredItems.length} 条信息
          </div>
        )}
      </div>

      {/* 信息列表 - 统一列表显示 */}
      <div className="space-y-4">
        {filteredItems.map((item) => {
          const hoverBg = 'hover:bg-gray-50'
          
          return (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`bg-white rounded-xl shadow-md px-5 py-4 sm:px-5 sm:py-6 ${hoverBg} cursor-pointer transition-colors ${
                !item.is_read && (item.category === '通知' || item.category === '公告') ? 'ring-2 ring-[#F15B98]' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* 标题行 */}
                  <div className="flex items-center gap-2 mb-2">
                    {item.is_pinned && (
                      <Pin className="w-4 h-4 text-[#F15B98] flex-shrink-0" />
                    )}
                    <h3 className={`text-base sm:text-lg font-semibold text-gray-900 truncate flex items-center gap-2 ${
                      !item.is_read ? 'font-bold' : ''
                    }`}>
                      {!item.is_read && (item.category === '通知' || item.category === '公告') && (
                        <span className="text-[#F15B98] flex-shrink-0 text-xs">●</span>
                      )}
                      <span>{item.title}</span>
                    </h3>
                    {/* 分类标签 */}
                    {(() => {
                      const CategoryIcon = categoryIcons[item.category as keyof typeof categoryIcons]
                      return (
                        <span className={`px-2 py-1.5 rounded-full flex-shrink-0 flex items-center justify-center ${
                          categoryColors[item.category as keyof typeof categoryColors]
                        }`}>
                          {CategoryIcon && <CategoryIcon className="w-3.5 h-3.5" />}
                        </span>
                      )
                    })()}
                    {priorityLabels[item.priority as keyof typeof priorityLabels] && (() => {
                      const PriorityIcon = priorityIcons[item.priority as keyof typeof priorityIcons]
                      return PriorityIcon ? (
                        <span className={`px-2 py-1.5 rounded-full flex-shrink-0 flex items-center justify-center ${
                          priorityColors[item.priority as keyof typeof priorityColors]
                        }`}>
                          <PriorityIcon className="w-3.5 h-3.5" />
                        </span>
                      ) : null
                    })()}
                  </div>

                  {/* 摘要 */}
                  {item.excerpt && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {item.excerpt}
                    </p>
                  )}

                  {/* 元信息 */}
                  <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-500">
                    {item.published_at && (
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span>{formatDate(item.published_at)}</span>
                      </div>
                    )}
                    {item.expires_at && (
                      <div className="flex items-center text-[#F15B98]">
                        <Clock className="w-3 h-3 mr-1" />
                        <span>有效期至 {formatDate(item.expires_at)}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <Eye className="w-3 h-3 mr-1" />
                      <span>{item.view_count} 次阅读</span>
                    </div>
                    {item.attachments && item.attachments.length > 0 && (
                      <div className="flex items-center text-[#F15B98]">
                        <Paperclip className="w-3 h-3 mr-1" />
                        <span>{item.attachments.length} 个附件</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 封面图 */}
                {item.featured_image_url && (
                  <img
                    src={item.featured_image_url}
                    alt={item.title}
                    className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg ml-4 flex-shrink-0"
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 无数据提示 */}
      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">暂无信息</p>
        </div>
      )}
    </div>
  )
}

