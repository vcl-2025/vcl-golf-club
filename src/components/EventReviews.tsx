import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Calendar, MapPin, Users, Trophy, Clock, FileText, 
  ChevronRight, Star, Eye, Heart, X, MessageCircle, Send,
  Edit2, Trash2, Reply, Check, X as XIcon, Image as ImageIcon, Smile, MoreVertical, Share2, ChevronLeft, AlertTriangle
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Event } from '../types'
import TinyMCEViewer from './TinyMCEViewer'
import { useAuth } from '../hooks/useAuth'
import { User } from '@supabase/supabase-js'
import { uploadImageToSupabase, validateImageFile } from '../utils/imageUpload'
import ShareModal from './ShareModal'

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

// 编辑回复 Modal
const EditReplyModal = ({
  isOpen,
  onClose,
  reply,
  onSave,
  submitting
}: {
  isOpen: boolean
  onClose: () => void
  reply: Reply | null
  onSave: (content: string) => void
  submitting: boolean
}) => {
  const [content, setContent] = useState('')
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && reply) {
      // 解析内容，提取图片
      const parsed = parseContent(reply.content)
      const images = parsed.filter(p => p.type === 'image').map(p => p.content)
      const text = parsed.filter(p => p.type === 'text').map(p => p.content).join('')
      setContent(text)
      setUploadedImages(images)
      // 延迟聚焦，确保 modal 完全渲染
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }, [isOpen, reply])

  // 点击外部关闭emoji选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      validateImageFile(file)
      setUploadingImage(true)

      const result = await uploadImageToSupabase(file, 'golf-club-images', 'event-replies')
      
      if (result.success && result.url) {
        setUploadedImages(prev => [...prev, result.url!])
      } else {
        alert(result.error || '图片上传失败')
      }
    } catch (error: any) {
      alert(error.message || '图片上传失败')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = content.substring(0, start) + emoji + content.substring(end)
      setContent(newContent)
      // 设置光标位置
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + emoji.length, start + emoji.length)
      }, 0)
    }
    setShowEmojiPicker(false)
  }

  const handleSave = () => {
    // 组合文本和图片，图片放在文字前面
    let finalContent = content.trim()
    if (uploadedImages.length > 0) {
      const imageTags = uploadedImages.map(url => `[IMAGE:${url}]`).join('')
      finalContent = imageTags + (finalContent ? ' ' + finalContent : '')
    }
    
    if (finalContent.trim() || uploadedImages.length > 0) {
      onSave(finalContent)
      setContent('')
      setUploadedImages([])
    }
  }

  const handleClose = () => {
    setContent('')
    setUploadedImages([])
    setShowEmojiPicker(false)
    onClose()
  }

  if (!isOpen || !reply) return null

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 overflow-y-auto"
      onClick={handleClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-2xl my-auto max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: 'calc(100vh - 2rem)'
        }}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">编辑回复</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-[#F15B98] resize-none"
            rows={8}
            placeholder="写下你的回复..."
          />
          
          {/* 工具栏 */}
          <div className="flex items-center gap-2 mt-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ImageIcon className="w-4 h-4" />
              <span>{uploadingImage ? '上传中...' : '上传图片'}</span>
            </button>
            
            <div className="relative" ref={emojiPickerRef}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Smile className="w-4 h-4" />
                <span>表情</span>
              </button>
              
              {showEmojiPicker && (
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
                        onClick={() => insertEmoji(emoji)}
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
          {uploadedImages.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {uploadedImages.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`上传的图片 ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={(!content.trim() && uploadedImages.length === 0) || submitting}
            className="px-4 py-2 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>保存中...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>保存</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// 回复回复 Modal
const ReplyToReplyModal = ({
  isOpen,
  onClose,
  reply,
  replyingToName,
  onSave,
  submitting
}: {
  isOpen: boolean
  onClose: () => void
  reply: Reply | null
  replyingToName: string
  onSave: (content: string) => void
  submitting: boolean
}) => {
  const [content, setContent] = useState('')
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setContent('')
      setUploadedImages([])
      // 延迟聚焦，确保 modal 完全渲染
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // 点击外部关闭emoji选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      validateImageFile(file)
      setUploadingImage(true)

      const result = await uploadImageToSupabase(file, 'golf-club-images', 'event-replies')
      
      if (result.success && result.url) {
        setUploadedImages(prev => [...prev, result.url!])
      } else {
        alert(result.error || '图片上传失败')
      }
    } catch (error: any) {
      alert(error.message || '图片上传失败')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = content.substring(0, start) + emoji + content.substring(end)
      setContent(newContent)
      // 设置光标位置
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + emoji.length, start + emoji.length)
      }, 0)
    }
    setShowEmojiPicker(false)
  }

  const handleSave = () => {
    // 组合文本和图片，图片放在文字前面
    let finalContent = content.trim()
    if (uploadedImages.length > 0) {
      const imageTags = uploadedImages.map(url => `[IMAGE:${url}]`).join('')
      finalContent = imageTags + (finalContent ? ' ' + finalContent : '')
    }
    
    if (finalContent.trim() || uploadedImages.length > 0) {
      onSave(finalContent)
      setContent('')
      setUploadedImages([])
    }
  }

  const handleClose = () => {
    setContent('')
    setUploadedImages([])
    setShowEmojiPicker(false)
    onClose()
  }

  if (!isOpen || !reply) return null

  // 解析原回复内容以显示图片
  const originalContentParts = reply ? parseContent(reply.content) : []

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 overflow-y-auto"
      onClick={handleClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-2xl my-auto max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: 'calc(100vh - 2rem)'
        }}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">回复</h3>
            <p className="text-sm text-gray-500 mt-1">
              回复给 <span className="font-semibold text-[#F15B98]">{replyingToName}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* 原回复内容预览 */}
        <div className="px-6 pt-4 border-b border-gray-100 bg-gray-50 max-h-48 overflow-y-auto">
          <div className="flex items-start gap-3 mb-4">
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
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-gray-900 text-sm">
                  {reply.user_profile?.full_name || '匿名用户'}
                </span>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                {originalContentParts.map((part, index) => (
                  <React.Fragment key={index}>
                    {part.type === 'text' ? (
                      <span>{part.content}</span>
                    ) : (
                      <img
                        src={part.content}
                        alt="回复图片"
                        className="max-w-full h-auto rounded-lg mt-2 mb-2"
                        style={{ maxHeight: '200px' }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-[#F15B98] resize-none"
            rows={8}
            placeholder="写下你的回复..."
          />
          
          {/* 工具栏 */}
          <div className="flex items-center gap-2 mt-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ImageIcon className="w-4 h-4" />
              <span>{uploadingImage ? '上传中...' : '上传图片'}</span>
            </button>
            
            <div className="relative" ref={emojiPickerRef}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Smile className="w-4 h-4" />
                <span>表情</span>
              </button>
              
              {showEmojiPicker && (
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
                        onClick={() => insertEmoji(emoji)}
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
          {uploadedImages.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {uploadedImages.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`上传的图片 ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={(!content.trim() && uploadedImages.length === 0) || submitting}
            className="px-4 py-2 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>提交中...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>发表回复</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
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

export default function EventReviews() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [replies, setReplies] = useState<Reply[]>([])
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [editingReply, setEditingReply] = useState<Reply | null>(null)
  const [replyingToReply, setReplyingToReply] = useState<Reply | null>(null)
  const [showMainEmojiPicker, setShowMainEmojiPicker] = useState(false)
  const [mainReplyImages, setMainReplyImages] = useState<string[]>([])
  const mainReplyTextareaRef = useRef<HTMLTextAreaElement>(null)
  const mainEmojiPickerRef = useRef<HTMLDivElement>(null)
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [imageViewerImages, setImageViewerImages] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isClosing, setIsClosing] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [replyIdToDelete, setReplyIdToDelete] = useState<string | null>(null)

  useEffect(() => {
    fetchPublishedArticles()
    if (user) {
      fetchUserProfile()
    }
  }, [user])

  // 从 URL 参数读取 reviewId 并自动打开模态框（合并逻辑，避免重复触发）
  useEffect(() => {
    const reviewId = searchParams.get('reviewId')
    
    // 如果没有 reviewId，且当前有打开的模态框，关闭它
    if (!reviewId && selectedEvent) {
      setSelectedEvent(null)
      return
    }
    
    // 如果有 reviewId 且事件已加载完成，尝试打开模态框
    if (reviewId && !loading && events.length > 0 && !selectedEvent) {
      const event = events.find(e => e.id === reviewId)
      if (event) {
        setSelectedEvent(event)
      }
    }
  }, [searchParams, loading, events, selectedEvent])

  // 重置关闭状态
  useEffect(() => {
    setIsClosing(false)
  }, [selectedEvent?.id])

  useEffect(() => {
    if (selectedEvent) {
      fetchReplies(selectedEvent.id)
      // 禁止背景滚动
      document.body.style.overflow = 'hidden'
      
      // 动态设置页面标题和 Open Graph 元标签（用于分享预览）
      document.title = `${selectedEvent.title} - 活动回顾 - VCL Golf Club`
      
      // 去除 HTML 标签，只保留纯文本
      const stripHtml = (html: string) => {
        if (!html) return ''
        const tmp = document.createElement('DIV')
        tmp.innerHTML = html
        return tmp.textContent || tmp.innerText || ''
      }
      
      const setMetaTag = (property: string, content: string) => {
        let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement
        if (!meta) {
          meta = document.createElement('meta')
          meta.setAttribute('property', property)
          document.head.appendChild(meta)
        }
        meta.setAttribute('content', content)
      }

      // 去除 HTML 标签，只保留纯文本
      const description = stripHtml(selectedEvent.article_excerpt || selectedEvent.description || '')
      
      setMetaTag('og:title', selectedEvent.title)
      setMetaTag('og:description', description)
      setMetaTag('og:url', window.location.href)
      setMetaTag('og:type', 'article')
      
      if (selectedEvent.article_featured_image_url || selectedEvent.image_url) {
        setMetaTag('og:image', selectedEvent.article_featured_image_url || selectedEvent.image_url || '')
      }
    } else {
      setReplies([])
      // 恢复背景滚动
      document.body.style.overflow = ''
      
      // 恢复默认标题
      document.title = 'VCL Golf Club'
    }
    
    // 清理函数
    return () => {
      document.body.style.overflow = ''
      // 清理时恢复默认标题
      if (!selectedEvent) {
        document.title = 'VCL Golf Club'
      }
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
      userIds.add(reply.user_id)
      if (reply.child_replies) {
        getAllUserIds(reply.child_replies).forEach(id => userIds.add(id))
      }
    })
    return userIds
  }

  const handleSubmitReply = useCallback(async (parentId: string | null, content: string) => {
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
        setReplyingToReply(null)
      } else {
        setReplyContent('')
      }
    } catch (error) {
      console.error('提交回复失败:', error)
      alert('提交回复失败，请重试')
    } finally {
      setSubmittingReply(false)
    }
  }, [selectedEvent, user, userProfile])

  const handleSaveEdit = useCallback(async (content: string) => {
    if (!editingReply || !content.trim()) return

    try {
      setSubmittingReply(true)
      const { error } = await supabase
        .from('event_replies')
        .update({ content: content.trim() })
        .eq('id', editingReply.id)

      if (error) throw error
      
      // 重新获取所有回复
      if (selectedEvent) {
        await fetchReplies(selectedEvent.id)
      }
      
      setEditingReply(null)
    } catch (error) {
      console.error('编辑回复失败:', error)
      alert('编辑回复失败，请重试')
    } finally {
      setSubmittingReply(false)
    }
  }, [editingReply, selectedEvent])


  const handleDeleteReply = useCallback((replyId: string) => {
    setReplyIdToDelete(replyId)
    setDeleteConfirmOpen(true)
  }, [])

  const confirmDeleteReply = useCallback(async () => {
    if (!replyIdToDelete) return

    try {
      const { error } = await supabase
        .from('event_replies')
        .delete()
        .eq('id', replyIdToDelete)

      if (error) throw error
      
      // 重新获取所有回复
      if (selectedEvent) {
        await fetchReplies(selectedEvent.id)
      }
      
      setDeleteConfirmOpen(false)
      setReplyIdToDelete(null)
    } catch (error) {
      console.error('删除回复失败:', error)
      alert('删除回复失败，请重试')
      setDeleteConfirmOpen(false)
      setReplyIdToDelete(null)
    }
  }, [replyIdToDelete, selectedEvent])


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

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }, [])

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  // 使用 useCallback 稳定函数引用
  const handleStartReplying = useCallback((reply: Reply) => {
    setReplyingToReply(reply)
  }, [])

  const handleCancelReplying = useCallback(() => {
    setReplyingToReply(null)
  }, [])

  const handleStartEditing = useCallback((reply: Reply) => {
    setEditingReply(reply)
  }, [])

  const handleCancelEditing = useCallback(() => {
    setEditingReply(null)
  }, [])

  const handleCloseModal = useCallback(() => {
    // 先触发关闭动画
    setIsClosing(true)
    // 延迟关闭，让动画完成
    setTimeout(() => {
      // 更新 URL，移除 reviewId 参数
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('reviewId')
      if (newParams.toString()) {
        navigate(`/dashboard?${newParams.toString()}`, { replace: true })
      } else {
        navigate('/dashboard?view=reviews', { replace: true })
      }
      // 关闭模态框
      setSelectedEvent(null)
      setIsClosing(false)
    }, 250)
  }, [searchParams, navigate])

  const handleShare = async () => {
    if (!selectedEvent) return
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    // 使用公开的分享页面URL，这样社交媒体爬虫可以读取到meta标签
    const shareUrl = `${window.location.origin}/review/${selectedEvent.id}`
    
    if (navigator.share && (isMobile || window.location.protocol === 'https:')) {
      try {
        await navigator.share({
          title: selectedEvent.title || '活动回顾',
          text: selectedEvent.article_excerpt || selectedEvent.description || '',
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

  // 回复项组件 - 简化版，点击编辑/回复按钮打开 modal
  const ReplyItem = ({
    reply,
    user,
    userProfile,
    onStartEditing,
    onDelete,
    onStartReplying,
    formatDate
  }: {
    reply: Reply
    user: User | null
    userProfile: any
    onStartEditing: (reply: Reply) => void
    onDelete: (replyId: string) => void
    onStartReplying: (reply: Reply) => void
    formatDate: (dateString: string) => string
  }) => {
    const isOwnReply = user && reply.user_id === user.id
    const [showMenu, setShowMenu] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // 点击外部关闭菜单
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          setShowMenu(false)
        }
      }
      if (showMenu) {
        document.addEventListener('mousedown', handleClickOutside)
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [showMenu])

    return (
      <div className={reply.parent_reply_id ? 'ml-8 mt-3' : ''}>
        <div className={`bg-gray-50 rounded-lg p-4 ${reply.parent_reply_id ? 'border-l-2 border-[#F15B98]' : ''}`}>
          <div className="flex items-start gap-3">
            {/* 用户头像 */}
            <div className="flex-shrink-0">
              {reply.user_profile?.avatar_url ? (
                <img
                  src={reply.user_profile.avatar_url}
                  alt={reply.user_profile.full_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#F15B98] flex items-center justify-center text-white font-semibold">
                  {(reply.user_profile?.full_name || '用户').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            {/* 回复内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">
                    {reply.user_profile?.full_name || '匿名用户'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(reply.created_at)}
                    {reply.updated_at !== reply.created_at && (
                      <span className="ml-1">(已编辑)</span>
                    )}
                  </span>
                </div>
                
                {/* 操作按钮 - 手机上用三个点菜单，桌面用图标 */}
                {user && userProfile && userProfile.role !== 'guest' && (
                  <div className="flex items-center gap-2">
                    {/* 桌面端：显示图标按钮 */}
                    <div className="hidden sm:flex items-center gap-2">
                      <button
                        onClick={() => onStartReplying(reply)}
                        className="text-[#F15B98] hover:text-[#F15B98]/80 p-1.5 rounded hover:bg-[#F15B98]/10 transition-colors"
                        title="回复"
                      >
                        <Reply className="w-4 h-4" />
                      </button>
                      {isOwnReply && (
                        <>
                          <button
                            onClick={() => onStartEditing(reply)}
                            className="text-gray-600 hover:text-gray-800 p-1.5 rounded hover:bg-gray-100 transition-colors"
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(reply.id)}
                            className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                    
                    {/* 手机端：三个点菜单 */}
                    <div className="sm:hidden relative" ref={menuRef}>
                      <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="text-gray-500 hover:text-gray-700 p-1.5 rounded hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {showMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[120px]">
                          <button
                            onClick={() => {
                              onStartReplying(reply)
                              setShowMenu(false)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-[#F15B98] hover:bg-[#F15B98]/10 flex items-center gap-2"
                          >
                            <Reply className="w-4 h-4" />
                            <span>回复</span>
                          </button>
                          {isOwnReply && (
                            <>
                              <button
                                onClick={() => {
                                  onStartEditing(reply)
                                  setShowMenu(false)
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Edit2 className="w-4 h-4" />
                                <span>编辑</span>
                              </button>
                              <button
                                onClick={() => {
                                  onDelete(reply.id)
                                  setShowMenu(false)
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>删除</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
              
              {/* 图片缩略图 - 统一大小，横向排列 */}
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
                    {images.length > 1 && (
                      <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
                        共{images.length}张
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        {/* 嵌套回复 */}
        {reply.child_replies && reply.child_replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {reply.child_replies.map((childReply) => (
              <ReplyItem
                key={childReply.id}
                reply={childReply}
                user={user}
                userProfile={userProfile}
                onStartEditing={handleStartEditing}
                onDelete={handleDeleteReply}
                onStartReplying={handleStartReplying}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>
    )
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
            className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
            onClick={() => {
              // 只更新 URL，让 useEffect 统一处理打开逻辑，避免重复打开
              const params = new URLSearchParams()
              params.set('view', 'reviews')
              params.set('reviewId', event.id)
              navigate(`/dashboard?${params.toString()}`, { replace: true })
            }}
          >
            {/* 活动图片 */}
            <div className="aspect-[16/9] bg-gradient-to-br from-[#F15B98]/20 to-[#F15B98]/30 overflow-hidden">
              <img
                src={event.article_featured_image_url || event.image_url || 'https://images.pexels.com/photos/1325735/pexels-photo-1325735.jpeg?auto=compress&cs=tinysrgb&w=800'}
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
                <div className="flex items-center bg-[#F15B98] text-white px-3 py-1.5 rounded-lg hover:bg-[#E0487A] transition-colors">
                  <span className="text-sm font-medium">查看回顾</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 文章详情模态框 - 使用 Portal 渲染到 body 下 */}
      {selectedEvent && createPortal(
        <div 
          className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-0 sm:p-4 z-[51] overflow-y-auto transition-opacity duration-200 ${
            isClosing ? 'opacity-0' : 'opacity-100'
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal()
            }
          }}
        >
          <div 
            className={`bg-white rounded-none sm:rounded-2xl max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col shadow-xl transition-transform duration-200 ${
              isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 固定头部 */}
            <div className="sticky top-0 bg-white border-b border-gray-200 z-20 flex items-center justify-between px-4 sm:px-6 py-4 shadow-sm">
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
                {/* 标题 */}
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{selectedEvent.title}</h2>
                
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

              {/* 回复区域 */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <MessageCircle className="w-5 h-5 mr-2 text-[#F15B98]" />
                    <h3 className="text-lg font-semibold text-gray-900">回复</h3>
                  </div>
                  {/* 统计显示 */}
                  <div className="text-sm">
                    <span className="text-red-500 font-semibold">{countAllReplies(replies)}</span>
                    <span className="text-gray-600 ml-1">条评论</span>
                    <span className="text-gray-600 mx-1">/</span>
                    <span className="text-red-500 font-semibold">
                      {getAllUserIds(replies).size}
                    </span>
                    <span className="text-gray-600 ml-1">人参与</span>
                  </div>
                </div>

                {/* 回复列表 */}
                {loadingReplies ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#F15B98] mx-auto"></div>
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
                      <ReplyItem
                        key={reply.id}
                        reply={reply}
                        user={user}
                        userProfile={userProfile}
                        onStartEditing={handleStartEditing}
                        onDelete={handleDeleteReply}
                        onStartReplying={handleStartReplying}
                        formatDate={formatDate}
                      />
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
                        {/* 底部回复也添加图片和emoji支持 */}
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
                            id="main-reply-image-input"
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById('main-reply-image-input')?.click()}
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
        </div>,
        document.body
      )}

      {/* 编辑回复 Modal */}
      <EditReplyModal
        isOpen={!!editingReply}
        onClose={handleCancelEditing}
        reply={editingReply}
        onSave={handleSaveEdit}
        submitting={submittingReply}
      />

      {/* 回复回复 Modal */}
      <ReplyToReplyModal
        isOpen={!!replyingToReply}
        onClose={handleCancelReplying}
        reply={replyingToReply}
        replyingToName={replyingToReply?.user_profile?.full_name || '匿名用户'}
        onSave={(content) => handleSubmitReply(replyingToReply?.id || null, content)}
        submitting={submittingReply}
      />

      {/* 分享弹窗 */}
      {selectedEvent && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          url={`${window.location.origin}/review/${selectedEvent.id}`}
          title={selectedEvent.title}
          description={selectedEvent.article_excerpt || selectedEvent.description}
          imageUrl={selectedEvent.article_featured_image_url || selectedEvent.image_url}
        />
      )}

      {/* 图片查看器 Modal - 使用 Portal 渲染到 body 下 */}
      {imageViewerOpen && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[70]"
          onClick={() => setImageViewerOpen(false)}
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
        </div>,
        document.body
      )}

      {/* 删除确认对话框 */}
      {deleteConfirmOpen && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[65] p-4"
          onClick={() => {
            setDeleteConfirmOpen(false)
            setReplyIdToDelete(null)
          }}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">确认删除</h3>
            <p className="text-gray-600 text-center mb-6">确定要删除这条回复吗？</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false)
                  setReplyIdToDelete(null)
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmDeleteReply}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
