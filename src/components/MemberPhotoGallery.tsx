import React, { useState, useEffect, useRef } from 'react'
import { Users, User, Image as ImageIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface MemberProfile {
  id: string
  real_name: string | null
  full_name: string | null
  member_photo_url: string | null
  avatar_url: string | null
  handicap: number | null
}

interface MemberPhotoGalleryProps {
  onClose?: () => void
}

export default function MemberPhotoGallery({ onClose }: MemberPhotoGalleryProps = { onClose: undefined }) {
  const [members, setMembers] = useState<MemberProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [displayPage, setDisplayPage] = useState(1) // 实际显示的页面
  const [isFading, setIsFading] = useState(false) // 是否正在淡出
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const autoPlayIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // 固定每页8个（一行4个，两行）
  const membersPerPage = 8

  useEffect(() => {
    fetchMembers()
  }, [])

  // 监听窗口大小变化，判断是否为手机端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640) // sm breakpoint
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 计算总页数（使用 useMemo 确保在 isMobile 变化时重新计算）
  const totalPages = React.useMemo(() => Math.ceil(members.length / membersPerPage), [members.length, membersPerPage])

  // 切换页面的动画函数（淡入淡出效果）
  const animatePageChange = (targetPage: number) => {
    if (totalPages <= 1) return
    // 第一步：当前内容逐渐透明退出
    setIsFading(true)
    setTimeout(() => {
      // 第二步：切换到新页面数据（此时新内容opacity仍为0，因为isFading还是true）
      setCurrentPage(targetPage)
      setDisplayPage(targetPage)
      // 第三步：等待DOM完全更新后，让新内容逐渐不透明出现
      setTimeout(() => {
        setIsFading(false)
      }, 100) // 确保DOM更新完成
    }, 1500) // 等待淡出动画完全完成（1500ms）
  }

  // 手动切换到下一页
  const handleNext = () => {
    if (members.length === 0 || totalPages <= 1) return
    const next = currentPage >= totalPages ? 1 : currentPage + 1
    animatePageChange(next)
    setIsAutoPlaying(false) // 暂停自动播放
    // 7秒后恢复自动播放
    setTimeout(() => setIsAutoPlaying(true), 7000)
  }

  // 手动切换到上一页
  const handlePrev = () => {
    if (members.length === 0 || totalPages <= 1) return
    const prevPage = currentPage <= 1 ? totalPages : currentPage - 1
    animatePageChange(prevPage)
    setIsAutoPlaying(false) // 暂停自动播放
    // 7秒后恢复自动播放
    setTimeout(() => setIsAutoPlaying(true), 7000)
  }

  // 触摸事件处理
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX - touchEndX
    const minSwipeDistance = 50 // 最小滑动距离

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        // 向左滑动，显示下一页
        handleNext()
      } else {
        // 向右滑动，显示上一页
        handlePrev()
      }
    }
    setTouchStartX(null)
  }

  // 自动滚动
  useEffect(() => {
    if (members.length === 0 || !isAutoPlaying || totalPages <= 1) {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current)
        autoPlayIntervalRef.current = null
      }
      return
    }

    autoPlayIntervalRef.current = setInterval(() => {
      setCurrentPage(prev => {
        const next = prev >= totalPages ? 1 : prev + 1
        animatePageChange(next)
        return next
      })
    }, 7000) // 每7秒切换一次

    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current)
        autoPlayIntervalRef.current = null
      }
    }
  }, [members.length, totalPages, isAutoPlaying, currentPage])

  const fetchMembers = async () => {
    try {
      if (!supabase) {
        console.error('Supabase client is not initialized')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, real_name, full_name, member_photo_url, avatar_url, handicap')
        .order('full_name', { ascending: true })

      if (error) {
        console.error('查询错误:', error)
        throw error
      }
      
      console.log('获取到的会员数据:', data)
      // 显示所有会员，没有照片的显示默认头像
      setMembers(data || [])
    } catch (error) {
      console.error('获取会员照片失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 计算当前显示的会员（使用displayPage而不是currentPage）
  const startIndex = (displayPage - 1) * membersPerPage
  const endIndex = startIndex + membersPerPage
  const currentMembers = members.slice(startIndex, endIndex)

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div 
      className="absolute inset-0 min-h-screen"
      style={{
        backgroundImage: 'url(/northview-golf-ridge-course.jpg.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* 半透明黑色罩层 - 模拟 Northview 的效果 */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.55)'
        }}
      />
      {/* 退出按钮 */}
      {onClose && (
        <button
          onClick={onClose}
          className="fixed top-4 right-4 z-50 bg-white/40 hover:bg-white/60 rounded-full p-3 shadow-lg transition-all hover:scale-110"
          aria-label="退出"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      )}

      <div className="flex flex-col items-center justify-center min-h-screen relative z-10 py-4 sm:py-8">
        {/* 手机端提示文字 */}
        <div className="sm:hidden text-white/70 text-xs mb-2 px-4 text-center">
          左右滑动翻页
        </div>
        {/* Logo和俱乐部名称 - 手机端隐藏 */}
        <div className="mb-8 -mt-6 sm:-mt-8 hidden sm:flex items-center gap-4">
          <div className="bg-white rounded-full p-1.5 sm:p-2 border-2 border-white">
            <img 
              src="/logo-192x192.png" 
              alt="VCL Golf Club" 
              className="w-12 h-12 sm:w-14 sm:h-14"
            />
          </div>
          <div className="text-white">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">溫哥華華人女子高爾夫俱樂部</h1>
            <p className="text-sm sm:text-base lg:text-lg text-white/90">Vancouver Chinese Women's Golf Club</p>
          </div>
        </div>

        {/* 会员照片网格 */}
      {members.length === 0 ? (
        <div className="text-center py-12 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 relative z-10">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无会员</h3>
          <p className="text-gray-600">还没有会员注册</p>
        </div>
      ) : (
        <>
          <div className="max-w-[1600px] w-full relative z-10 flex flex-col items-center">
            <div 
              className="w-full flex items-center gap-0 sm:gap-6 px-0 sm:px-6"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* 左箭头 - 手机端隐藏 */}
              {totalPages > 1 && (
                <button
                  onClick={handlePrev}
                  className="hidden sm:flex flex-shrink-0 z-30 bg-white/40 hover:bg-white/60 rounded-full p-3 sm:p-4 shadow-lg transition-all hover:scale-110 relative"
                  aria-label="上一页"
                >
                  <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </button>
              )}

              <div className="flex-1 relative min-h-[600px] sm:min-h-[600px] flex items-center justify-center overflow-hidden px-1 sm:px-0">
                <div 
                  className="w-full max-w-[1100px] mx-auto grid grid-cols-4 gap-1 sm:gap-4 lg:gap-6 transition-opacity duration-[1500ms] ease-in-out"
                  style={{
                    opacity: isFading ? 0 : 1
                  }}
                >
                {currentMembers.map((member) => (
                            <div
                              key={member.id}
                              className="bg-white/20 backdrop-blur-sm rounded-xl overflow-hidden transition-all duration-300 transform hover:-translate-y-1 flex flex-col cursor-pointer"
                              onClick={() => {
                                setSelectedMember(member)
                                setModalOpen(true)
                              }}
                            >
              {/* 照片容器 */}
              <div className="relative aspect-[3/4] bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg overflow-hidden">
                {member.member_photo_url ? (
                  <img
                    src={member.member_photo_url}
                    alt={member.real_name || member.full_name || '会员'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // 如果照片加载失败，显示默认头像
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent && !parent.querySelector('.fallback-avatar')) {
                        const fallback = document.createElement('div')
                        fallback.className = 'fallback-avatar w-full h-full flex items-center justify-center bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg'
                        fallback.innerHTML = `
                          <svg class="w-24 h-24 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                          </svg>
                        `
                        parent.appendChild(fallback)
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-100 overflow-hidden rounded-lg">
                    <img
                      src="/PPG_Paula-Creamer.jpg"
                      alt="默认头像"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // 如果默认图片也加载失败，显示图标
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent && !parent.querySelector('.fallback-icon')) {
                          const fallback = document.createElement('div')
                          fallback.className = 'fallback-icon w-full h-full flex items-center justify-center bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg'
                          fallback.innerHTML = `
                            <svg class="w-24 h-24 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                            </svg>
                          `
                          parent.appendChild(fallback)
                        }
                      }}
                    />
                  </div>
                )}
              </div>

                              {/* 会员信息 */}
                              <div className="p-1 sm:p-4 text-center bg-transparent">
                                <h3 className="text-xs sm:text-lg font-bold text-white truncate">
                                  {member.real_name || member.full_name || '会员'}
                                </h3>
                              </div>
                            </div>
                ))}
                </div>
              </div>

              {/* 右箭头 - 手机端隐藏 */}
              {totalPages > 1 && (
                <button
                  onClick={handleNext}
                  className="hidden sm:flex flex-shrink-0 z-30 bg-white/40 hover:bg-white/60 rounded-full p-3 sm:p-4 shadow-lg transition-all hover:scale-110 relative"
                  aria-label="下一页"
                >
                  <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </button>
              )}
            </div>

            {/* 分页指示器 - 放在照片容器下方 */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4 sm:mt-6 w-full">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => {
                      animatePageChange(page)
                      setIsAutoPlaying(false)
                      setTimeout(() => setIsAutoPlaying(true), 7000)
                    }}
                    className={`w-2 h-2 sm:w-2 sm:h-2 rounded-full transition-all ${
                      page === currentPage
                        ? 'bg-green-600 w-8 sm:w-8'
                        : 'bg-white/40 hover:bg-white/60'
                    }`}
                    aria-label={`第 ${page} 页`}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* 全屏照片Modal */}
      {modalOpen && selectedMember && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div 
            className="relative max-w-7xl w-full h-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 z-10 bg-white/40 hover:bg-white/60 rounded-full p-3 text-white transition-colors"
              aria-label="关闭"
            >
              <X className="w-6 h-6" />
            </button>

            {/* 会员照片 */}
            <div className="flex-1 flex items-center justify-center w-full max-h-[90vh]">
              {selectedMember.member_photo_url ? (
                <img
                  src={selectedMember.member_photo_url}
                  alt={selectedMember.real_name || selectedMember.full_name || '会员'}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : (
                <img
                  src="/PPG_Paula-Creamer.jpg"
                  alt="默认头像"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              )}
            </div>

            {/* 会员信息 */}
            <div className="mt-6 text-center">
              <h3 className="text-3xl font-bold text-white mb-2">
                {selectedMember.real_name || selectedMember.full_name || '会员'}
              </h3>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

