import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Trophy, Calendar, MapPin, Users, ArrowRight, LogIn,
  ChevronRight, Clock, Star, ChevronDown,
  Phone, Mail, Shield, BarChart3, Zap, MessageCircle, Send,
  Image as ImageIcon, Smile, X
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Event } from '../types'
import TinyMCEViewer from '../components/TinyMCEViewer'
import { uploadImageToSupabase, validateImageFile } from '../utils/imageUpload'
import { useAuth } from '../hooks/useAuth'

// 常用emoji列表
const COMMON_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👏', '🙌', '👐',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '💯', '🔥', '⭐', '🌟', '✨', '🎉', '🎊', '🎈', '🎁', '🏆',
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸',
  '⛳', '🏌️', '🏌️‍♂️', '🏌️‍♀️', '🏌', '🏌‍♂️', '🏌‍♀️', '⛳', '🏌', '🏌‍♂️',
  '🎯', '🎲', '🎮', '🎰', '🎨', '🎭', '🎪', '🎬', '🎤', '🎧',
  '🍕', '🍔', '🍟', '🌭', '🍿', '🧂', '🥓', '🥚', '🍳', '🥞',
  '☕', '🍵', '🧃', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃'
]

// 辅助函数：解析内容中的图片
const parseContent = (content: string) => {
  const parts: Array<{ type: 'text' | 'image'; content: string }> = []
  const imageRegex = /\[IMAGE:(https?:\/\/[^\]]+)\]/g
  let lastIndex = 0
  let match

  while ((match = imageRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.substring(lastIndex, match.index) })
    }
    parts.push({ type: 'image', content: match[1] })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.substring(lastIndex) })
  }

  return parts.length > 0 ? parts : [{ type: 'text', content }]
}

interface Reply {
  id: string
  event_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  parent_reply_id?: string | null
  user_profile?: {
    full_name: string
    avatar_url?: string
  }
  child_replies?: Reply[]
}

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [mainReplyImages, setMainReplyImages] = useState<string[]>([])
  const [showMainEmojiPicker, setShowMainEmojiPicker] = useState(false)
  const mainReplyTextareaRef = useRef<HTMLTextAreaElement>(null)
  const mainEmojiPickerRef = useRef<HTMLDivElement>(null)
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [imageViewerImages, setImageViewerImages] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    fetchPublishedArticles()
    if (user) {
      fetchUserProfile()
    }
    
    // 检测视频是否存在，如果存在则显示视频，否则显示图片
    const video = document.getElementById('hero-video') as HTMLVideoElement
    const image = document.getElementById('hero-image') as HTMLElement
    
    if (video && image) {
      // 默认显示图片
      image.classList.remove('hidden')
      
      // 尝试加载视频
      video.addEventListener('loadeddata', () => {
        // 视频加载成功，显示视频并隐藏图片
        video.classList.remove('hidden')
        video.classList.add('block')
        image.classList.add('hidden')
      })
      
      video.addEventListener('error', () => {
        // 视频加载失败，保持显示图片
        video.classList.add('hidden')
        image.classList.remove('hidden')
      })
      
      // 尝试加载视频
      video.load()
    }
  }, [user])

  useEffect(() => {
    if (selectedEvent) {
      fetchReplies(selectedEvent.id)
      // 禁止背景滚动
      document.body.style.overflow = 'hidden'
    } else {
      setReplies([])
      // 恢复背景滚动
      document.body.style.overflow = ''
    }
    
    // 清理函数
    return () => {
      document.body.style.overflow = ''
    }
  }, [selectedEvent])

  // 点击外部关闭主回复的emoji选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mainEmojiPickerRef.current && !mainEmojiPickerRef.current.contains(event.target as Node)) {
        setShowMainEmojiPicker(false)
      }
    }
    if (showMainEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMainEmojiPicker])

  // 当图片查看器打开时，禁止背景滚动
  useEffect(() => {
    if (imageViewerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [imageViewerOpen])

  const fetchPublishedArticles = async () => {
    try {
      setLoading(true)
      
      if (!supabase) {
        console.error('Supabase 未初始化')
        return
      }
      
      // 获取已发布且公开的活动回顾（所有人可见，不需要认证）
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('article_published', true)
        .eq('is_public', true)
        .order('article_published_at', { ascending: false })
        .limit(6) // 只显示最近6条

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

  const fetchUserProfile = async () => {
    if (!user) return
    
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    
    setUserProfile(data)
  }

  const fetchReplies = async (eventId: string) => {
    try {
      setLoadingReplies(true)
      
      const { data, error } = await supabase
        .from('event_replies')
        .select(`
          *,
          user_profiles!inner (
            full_name,
            avatar_url
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      // 处理数据格式，将user_profiles映射为user_profile
      const allReplies = (data || []).map((reply: any) => ({
        ...reply,
        user_profile: reply.user_profiles,
        child_replies: []
      }))
      
      // 组织成树形结构
      const rootReplies: Reply[] = []
      const replyMap = new Map<string, Reply>()
      
      // 先创建所有回复的映射
      allReplies.forEach(reply => {
        replyMap.set(reply.id, reply)
      })
      
      // 构建树形结构
      allReplies.forEach(reply => {
        if (!reply.parent_reply_id) {
          rootReplies.push(reply)
        } else {
          const parent = replyMap.get(reply.parent_reply_id)
          if (parent) {
            if (!parent.child_replies) {
              parent.child_replies = []
            }
            parent.child_replies.push(reply)
          }
        }
      })
      
      setReplies(rootReplies)
    } catch (error) {
      console.error('获取回复失败:', error)
    } finally {
      setLoadingReplies(false)
    }
  }

  // 递归计算所有回复数量（包括嵌套回复）
  const countAllReplies = (replies: Reply[]): number => {
    return replies.reduce((count, reply) => {
      return count + 1 + (reply.child_replies ? countAllReplies(reply.child_replies) : 0)
    }, 0)
  }

  // 递归获取所有用户ID（包括嵌套回复）
  const getAllUserIds = (replies: Reply[]): Set<string> => {
    const userIds = new Set<string>()
    replies.forEach(reply => {
      if (reply.user_id) {
        userIds.add(reply.user_id)
      }
      if (reply.child_replies) {
        getAllUserIds(reply.child_replies).forEach(id => userIds.add(id))
      }
    })
    return userIds
  }

  const handleSubmitReply = async (parentId: string | null, content: string) => {
    if (!selectedEvent || !user || !content.trim()) return
    
    // 检查是否是会员
    if (!userProfile || userProfile.role === 'guest') {
      alert('只有会员可以回复')
      return
    }

    try {
      setSubmittingReply(true)
      
      const { data, error } = await supabase
        .from('event_replies')
        .insert({
          event_id: selectedEvent.id,
          user_id: user.id,
          content: content.trim(),
          parent_reply_id: parentId || null
        })
        .select(`
          *,
          user_profiles!inner (
            full_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error
      
      // 重新获取所有回复
      await fetchReplies(selectedEvent.id)
      
      // 清空输入框和关闭 modal
      if (parentId) {
        // 如果是回复别人的回复，不需要清空主回复框
      } else {
        setReplyContent('')
        setMainReplyImages([])
      }
    } catch (error) {
      console.error('提交回复失败:', error)
      alert('提交回复失败，请重试')
    } finally {
      setSubmittingReply(false)
    }
  }

  const formatReplyDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60))
        return minutes <= 0 ? '刚刚' : `${minutes}分钟前`
      }
      return `${hours}小时前`
    } else if (days === 1) {
      return '昨天'
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-golf-50 via-white to-golf-100">
      {/* 顶部导航栏 */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2 sm:py-2.5 lg:py-3">
            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 bg-white p-1 border-2 border-golf-700">
                <img src="/logo-192x192.png" alt="溫哥華華人女子高爾夫俱樂部" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">溫哥華華人女子高爾夫俱樂部</h1>
                <p className="text-xs text-gray-500">Vancouver Chinese Women's Golf Club</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center space-x-2 px-4 py-2 bg-golf-600 text-white rounded-lg hover:bg-golf-700 transition-colors font-medium"
            >
              <LogIn className="w-4 h-4" />
              <span>会员登录</span>
            </button>
          </div>
        </div>
      </nav>

      {/* 英雄区域 - 视频/图片背景 */}
      <section className="relative h-[85vh] sm:h-[90vh] overflow-hidden">
        <div className="relative w-full h-full">
          {/* 视频背景 - 如果存在视频文件则显示视频，否则显示图片 */}
          <video
            className="absolute inset-0 w-full h-full object-cover hidden"
            id="hero-video"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="/hero-video.mp4" type="video/mp4" />
            <source src="/hero-video.webm" type="video/webm" />
          </video>
          
          {/* 背景图片（视频不存在或加载失败时的备用） */}
          <div 
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: 'url(/homepage_image.jpg)'
            }}
            id="hero-image"
          />

          {/* 渐变遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70"></div>
          
          {/* 内容层 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
              <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 drop-shadow-2xl animate-fade-in">
                欢迎来到溫哥華華人女子高爾夫俱樂部
              </h2>
              <p className="text-xl sm:text-2xl lg:text-3xl text-white/95 mb-12 leading-relaxed drop-shadow-lg animate-fade-in-delay">
                专业的高尔夫体验，精彩纷呈的比赛活动
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-delay-2">
                <button
                  onClick={() => {
                    const element = document.getElementById('about')
                    element?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="inline-flex items-center justify-center px-8 py-4 bg-golf-600 text-white rounded-xl hover:bg-golf-700 transition-all transform hover:scale-105 font-semibold text-lg shadow-2xl backdrop-blur-sm"
                >
                  关于我们
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
                <button
                  onClick={() => {
                    const element = document.getElementById('reviews')
                    element?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="inline-flex items-center justify-center px-8 py-4 bg-white/10 backdrop-blur-md text-white border-2 border-white/30 rounded-xl hover:bg-white/20 transition-all transform hover:scale-105 font-semibold text-lg"
                >
                  查看活动回顾
                </button>
              </div>
            </div>
          </div>

          {/* 滚动提示 */}
          <div className="absolute bottom-12 sm:bottom-16 left-1/2 -translate-x-1/2 z-20 animate-bounce hidden sm:block">
            <ChevronDown className="w-6 h-6 text-white/80" />
          </div>
        </div>
      </section>

      {/* 关于我们 - 参考 Northview 设计：文字在上方，背景图片在下方 */}
      <section id="about" className="relative min-h-[900px] sm:min-h-[1000px] overflow-hidden">
        {/* 背景图片 - 全景风景（山川湖泊） */}
        <div 
          className="absolute inset-0 w-full h-full bg-cover"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1920)',
            backgroundPosition: 'center 20%'
          }}
        />
        
        {/* 文字内容区域 - 温暖的米白色背景，浮在图片上方 */}
        <div className="relative z-10 pt-20 sm:pt-32 pb-56 sm:pb-72">
          {/* 渐变过渡层 - 从米白色渐变到透明，与图片自然融合 */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#f7f6f3] via-[#f7f6f3] to-transparent pointer-events-none"></div>
          
          <div className="relative z-10 max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12">
            {/* 文字内容 - 简洁专业的两列布局 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-start mb-20 sm:mb-24">
              {/* 左列 */}
              <div className="space-y-6">
                <p 
                  className="text-base sm:text-lg text-[#2d2d2d] leading-[1.85] font-serif"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  溫哥華華人女子高爾夫俱樂部成立于<strong className="font-semibold text-[#1a1a1a]">2015年</strong>，是一家致力于为会员提供优质高尔夫体验的专业俱乐部。
                  经过近<strong className="font-semibold text-[#1a1a1a]">10年</strong>的发展，我们已建立完善的管理体系和服务标准，为会员营造温馨和谐的俱乐部氛围。
                </p>
              </div>
              
              {/* 右列 */}
              <div className="space-y-6">
                <p 
                  className="text-base sm:text-lg text-[#2d2d2d] leading-[1.85] font-serif"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  我们相信每个人都能享受专业的高尔夫体验，这就是为什么我们致力于为每一位会员提供最优质的服务和活动。
                  无论是追求高尔夫的激情，享受精彩比赛，还是建立深厚的会员友谊，加入我们，让溫哥華華人女子高爾夫俱樂部成为您美好回忆的背景。
                </p>
                <p 
                  className="text-base sm:text-lg text-[#2d2d2d] leading-[1.85] font-serif"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  为会员营造温馨和谐的俱乐部氛围，共同打造高品质、高标准的俱乐部服务体系，所有服务都带有独特的本土特色。
                </p>
              </div>
            </div>

            {/* 核心优势 - 专业简洁的三列布局 */}
            <div className="max-w-[1280px] mx-auto mt-24 sm:mt-32">
              <h3 className="text-2xl sm:text-3xl font-bold text-[#1e40af] mb-12 sm:mb-16 text-left">核心优势</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                {/* 专业赛事体系 */}
                <div>
                  <div className="w-12 h-12 mb-5 flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-blue-600 rounded-lg flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-[#1e40af] mb-3">专业赛事体系</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    定期举办个人赛、团体赛等多样化比赛活动，为会员提供展示技能和竞技交流的平台，持续提升会员的专业水平。
                  </p>
                </div>

                {/* 和谐会员文化 */}
                <div>
                  <div className="w-12 h-12 mb-5 flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-blue-600 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-[#1e40af] mb-3">和谐会员文化</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    会员之间互帮互助，共同营造温馨和谐的俱乐部氛围，建立深厚的会员友谊和社区凝聚力。
                  </p>
                </div>

                {/* 数字化管理 */}
                <div>
                  <div className="w-12 h-12 mb-5 flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-blue-600 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-[#1e40af] mb-3">数字化管理</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    采用先进的会员管理系统，提供便捷的在线活动报名、成绩查询、信息查看等功能，提升服务效率。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 活动回顾 */}
      <section id="reviews" className="py-16 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">活动精彩回顾</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              回顾俱乐部精彩活动，重温美好时光
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-golf-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">加载中...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">暂无活动回顾</h4>
              <p className="text-gray-500">还没有发布任何活动精彩回顾</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100"
                  onClick={() => navigate(`/event/${event.id}`)}
                >
                  {/* 活动图片 */}
                  <div className="aspect-[16/11] bg-gradient-to-br from-golf-200 to-golf-300 overflow-hidden">
                    {event.article_featured_image_url || event.image_url ? (
                      <img
                        src={event.article_featured_image_url || event.image_url || ''}
                        alt={event.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Trophy className="w-16 h-16 text-golf-400 opacity-50" />
                      </div>
                    )}
                  </div>

                  {/* 活动信息 */}
                  <div className="p-5 lg:p-6">
                    <h4 className="text-lg lg:text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                      {event.title}
                    </h4>
                    
                    {/* 活动日期和地点 */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2 text-golf-600 flex-shrink-0" />
                        <span>{formatEventDate(event.start_time)}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 text-golf-600 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    </div>

                    {/* 文章摘要 */}
                    {event.article_excerpt && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                        {event.article_excerpt}
                      </p>
                    )}

                    {/* 查看按钮 */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        <span>发布于 {formatDate(event.article_published_at || '')}</span>
                      </div>
                      <div className="flex items-center text-golf-600 font-semibold">
                        <span className="text-sm">查看详情</span>
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* 底部 */}
      <footer className="bg-gray-900 text-white">
        {/* 主要信息区域 */}
        <div className="bg-golf-800 py-12">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* 左侧：Logo */}
              <div className="flex items-start">
                <div className="w-16 h-16 rounded-full mr-4 overflow-hidden flex-shrink-0 bg-white p-1 border-2 border-golf-700">
                  <img src="/logo-192x192.png" alt="溫哥華華人女子高爾夫俱樂部" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h5 className="text-lg font-semibold mb-2">溫哥華華人女子高爾夫俱樂部</h5>
                  <p className="text-gray-300 text-sm">Vancouver Chinese Women's Golf Club</p>
                </div>
              </div>

              {/* 中间：地址信息 */}
              <div className="flex items-start">
                <MapPin className="w-5 h-5 text-white mr-3 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">溫哥華華人女子高爾夫俱樂部</p>
                  <p className="text-gray-300 text-sm">地址信息</p>
                  <p className="text-gray-300 text-sm">城市，邮编</p>
                </div>
              </div>

              {/* 右侧：联系方式 */}
              <div>
                <div className="flex items-start mb-3">
                  <Phone className="w-5 h-5 text-white mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-gray-300 text-sm mb-1">办公室: <a href="tel:" className="hover:text-white">电话</a></p>
                    <p className="text-gray-300 text-sm">会所: <a href="tel:" className="hover:text-white">电话</a></p>
                  </div>
                </div>
                
                {/* 社交媒体图标 */}
                <div className="flex items-center gap-3 mt-4">
                  <a href="#" className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                    <span className="text-xs font-bold">f</span>
                  </a>
                  <a href="#" className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                  <a href="#" className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                  <a href="#" className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 版权信息区域 */}
        <div className="bg-gray-950 py-6 border-t border-gray-800">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-400">
              <p>©2025 溫哥華華人女子高爾夫俱樂部. 保留所有权利.</p>
              <p>Powered by 溫哥華華人女子高爾夫俱樂部系统</p>
            </div>
          </div>
        </div>
      </footer>

      {/* 文章详情模态框 */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-2 sm:p-4 overflow-y-auto"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-[1080px] max-h-[95vh] sm:max-h-[90vh] overflow-y-auto relative mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-900">{selectedEvent.title}</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 内容 */}
            <div className="p-6">
              {/* 活动信息 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-5 h-5 mr-3 text-golf-600 flex-shrink-0" />
                  <div>
                    <div className="font-medium">活动日期</div>
                    <div className="text-sm">{formatDate(selectedEvent.start_time)}</div>
                  </div>
                </div>
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-5 h-5 mr-3 text-golf-600 flex-shrink-0" />
                  <div>
                    <div className="font-medium">活动地点</div>
                    <div className="text-sm">{selectedEvent.location}</div>
                  </div>
                </div>
                <div className="flex items-center text-gray-600">
                  <Users className="w-5 h-5 mr-3 text-golf-600 flex-shrink-0" />
                  <div>
                    <div className="font-medium">参与人数</div>
                    <div className="text-sm">最多 {selectedEvent.max_participants} 人</div>
                  </div>
                </div>
              </div>

              {/* 文章内容 */}
              <div className="prose max-w-none mb-8">
                <TinyMCEViewer content={selectedEvent.article_content || ''} />
              </div>

              {/* 发布时间 */}
              <div className="pt-6 border-t border-gray-200 mb-8">
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>发布于 {formatDate(selectedEvent.article_published_at || '')}</span>
                </div>
              </div>

              {/* 回复区域 */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center gap-2 mb-6">
                  <MessageCircle className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">回复</h3>
                  {replies.length > 0 && (
                    <span className="text-sm text-gray-500">
                      ({countAllReplies(replies)} 条评论 / {getAllUserIds(replies).size} 人参与)
                    </span>
                  )}
                </div>

                {loadingReplies ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-golf-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2 text-sm">加载回复中...</p>
                  </div>
                ) : replies.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">暂无回复，快来发表第一条回复吧！</p>
                  </div>
                ) : (
                  <div className="space-y-4 mb-6">
                    {replies.map((reply) => (
                      <div key={reply.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          {/* 用户头像 */}
                          <div className="flex-shrink-0">
                            {reply.user_profile?.avatar_url ? (
                              <img
                                src={reply.user_profile.avatar_url}
                                alt={reply.user_profile.full_name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-[#F15B98] flex items-center justify-center text-white font-semibold text-xs">
                                {(reply.user_profile?.full_name || '用户').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-gray-900 text-sm">
                                {reply.user_profile?.full_name || '匿名用户'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatReplyDate(reply.created_at)}
                                {reply.updated_at !== reply.created_at && (
                                  <span className="ml-1">(已编辑)</span>
                                )}
                              </span>
                            </div>

                            {/* 回复内容 */}
                            <div className="text-gray-700 text-sm whitespace-pre-wrap break-words mb-2">
                              {parseContent(reply.content).map((part, index) => (
                                <React.Fragment key={index}>
                                  {part.type === 'text' ? (
                                    <span>{part.content}</span>
                                  ) : null}
                                </React.Fragment>
                              ))}
                            </div>
                            
                            {/* 图片缩略图 */}
                            {(() => {
                              const images = parseContent(reply.content).filter(p => p.type === 'image').map(p => p.content)
                              if (images.length === 0) return null
                              
                              return (
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  {images.map((imageUrl, idx) => (
                                    <div
                                      key={idx}
                                      onClick={() => {
                                        setImageViewerImages(images)
                                        setCurrentImageIndex(idx)
                                        setImageViewerOpen(true)
                                      }}
                                      className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                                    >
                                      <img
                                        src={imageUrl}
                                        alt={`图片 ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )
                            })()}

                            {/* 嵌套回复 */}
                            {reply.child_replies && reply.child_replies.length > 0 && (
                              <div className="mt-3 space-y-3 ml-4 pl-4 border-l-2 border-[#F15B98]">
                                {reply.child_replies.map((childReply) => (
                                  <div key={childReply.id} className="bg-white rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                      <div className="flex-shrink-0">
                                        {childReply.user_profile?.avatar_url ? (
                                          <img
                                            src={childReply.user_profile.avatar_url}
                                            alt={childReply.user_profile.full_name}
                                            className="w-6 h-6 rounded-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-6 h-6 rounded-full bg-[#F15B98] flex items-center justify-center text-white font-semibold text-xs">
                                            {(childReply.user_profile?.full_name || '用户').charAt(0).toUpperCase()}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-semibold text-gray-900 text-xs">
                                            {childReply.user_profile?.full_name || '匿名用户'}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {formatReplyDate(childReply.created_at)}
                                          </span>
                                        </div>
                                        <div className="text-gray-700 text-xs whitespace-pre-wrap break-words">
                                          {parseContent(childReply.content).map((part, index) => (
                                            <React.Fragment key={index}>
                                              {part.type === 'text' ? (
                                                <span>{part.content}</span>
                                              ) : null}
                                            </React.Fragment>
                                          ))}
                                        </div>
                                        {/* 嵌套回复的图片 */}
                                        {(() => {
                                          const images = parseContent(childReply.content).filter(p => p.type === 'image').map(p => p.content)
                                          if (images.length === 0) return null
                                          
                                          return (
                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                              {images.map((imageUrl, idx) => (
                                                <div
                                                  key={idx}
                                                  onClick={() => {
                                                    setImageViewerImages(images)
                                                    setCurrentImageIndex(idx)
                                                    setImageViewerOpen(true)
                                                  }}
                                                  className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                                                >
                                                  <img
                                                    src={imageUrl}
                                                    alt={`图片 ${idx + 1}`}
                                                    className="w-full h-full object-cover"
                                                  />
                                                </div>
                                              ))}
                                            </div>
                                          )
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 回复输入框（仅会员可见） */}
                {user && userProfile && userProfile.role !== 'guest' ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      {/* 用户头像 - 手机端隐藏 */}
                      <div className="hidden sm:flex flex-shrink-0">
                        {userProfile.avatar_url ? (
                          <img
                            src={userProfile.avatar_url}
                            alt={userProfile.full_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#F15B98] flex items-center justify-center text-white font-semibold">
                            {(userProfile.full_name || '用户').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      {/* 输入框 */}
                      <div className="flex-1 relative">
                        <textarea
                          ref={mainReplyTextareaRef}
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="写下你的回复..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-[#F15B98] resize-none"
                          rows={3}
                        />
                        {/* 工具栏 */}
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              try {
                                validateImageFile(file)
                                const result = await uploadImageToSupabase(file, 'golf-club-images', 'event-replies')
                                if (result.success && result.url) {
                                  setMainReplyImages(prev => [...prev, result.url!])
                                }
                              } catch (error: any) {
                                alert(error.message || '图片上传失败')
                              }
                            }}
                            className="hidden"
                            id="homepage-reply-image-input"
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById('homepage-reply-image-input')?.click()}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <ImageIcon className="w-3 h-3" />
                            <span>图片</span>
                          </button>
                          
                          <div className="relative" ref={mainEmojiPickerRef}>
                            <button
                              type="button"
                              onClick={() => setShowMainEmojiPicker(!showMainEmojiPicker)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              <Smile className="w-3 h-3" />
                              <span>表情</span>
                            </button>
                            
                            {showMainEmojiPicker && (
                              <div className="absolute bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-xl p-3 w-screen max-w-sm sm:w-80 max-h-64 overflow-y-auto z-[100]"
                                style={{
                                  maxHeight: '16rem',
                                  left: '50%',
                                  transform: 'translateX(-50%) translateY(0)'
                                }}
                              >
                                <div className="grid grid-cols-8 gap-2">
                                  {COMMON_EMOJIS.map((emoji, index) => (
                                    <button
                                      key={index}
                                      type="button"
                                      onClick={() => {
                                        const textarea = mainReplyTextareaRef.current
                                        if (textarea) {
                                          const start = textarea.selectionStart
                                          const end = textarea.selectionEnd
                                          const newContent = replyContent.substring(0, start) + emoji + replyContent.substring(end)
                                          setReplyContent(newContent)
                                          setTimeout(() => {
                                            textarea.focus()
                                            textarea.setSelectionRange(start + emoji.length, start + emoji.length)
                                          }, 0)
                                        }
                                        setShowMainEmojiPicker(false)
                                      }}
                                      className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* 已上传的图片预览 */}
                        {mainReplyImages.length > 0 && (
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {mainReplyImages.map((url, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={url}
                                  alt={`上传的图片 ${index + 1}`}
                                  className="w-full h-24 object-cover rounded-lg border border-gray-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => setMainReplyImages(prev => prev.filter((_, i) => i !== index))}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* 提交按钮 */}
                        <div className="flex items-center justify-end gap-2 mt-2">
                          <button
                            onClick={() => {
                              // 组合文本和图片，图片放在文字前面
                              let finalContent = replyContent.trim()
                              if (mainReplyImages.length > 0) {
                                const imageTags = mainReplyImages.map(url => `[IMAGE:${url}]`).join('')
                                finalContent = imageTags + (finalContent ? ' ' + finalContent : '')
                              }
                              handleSubmitReply(null, finalContent)
                              setReplyContent('')
                              setMainReplyImages([])
                            }}
                            disabled={(!replyContent.trim() && mainReplyImages.length === 0) || submittingReply}
                            className="flex items-center px-4 py-2 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {submittingReply ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                <span>提交中...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                <span>发表回复</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-gray-500 text-sm">
                      {user ? '只有会员可以回复' : '请登录后回复'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 图片查看器 Modal */}
      {imageViewerOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[90]"
          onClick={() => setImageViewerOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
        >
          <button
            onClick={() => setImageViewerOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <X className="w-8 h-8" />
          </button>
          
          {currentImageIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCurrentImageIndex(prev => prev - 1)
              }}
              className="absolute left-4 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2"
            >
              <ChevronRight className="w-6 h-6 rotate-180" />
            </button>
          )}
          
          {currentImageIndex < imageViewerImages.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCurrentImageIndex(prev => prev + 1)
              }}
              className="absolute right-4 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
          
          <div 
            className="max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageViewerImages[currentImageIndex]}
              alt={`图片 ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          
          {/* 图片指示器 */}
          {imageViewerImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-black/50 rounded-full px-4 py-2">
              <span className="text-white text-sm">
                {currentImageIndex + 1} / {imageViewerImages.length}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

