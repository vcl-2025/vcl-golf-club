import React, { useState, useEffect } from 'react'
import { X, FileText, Upload, Image as ImageIcon, Pin, AlertCircle, Calendar, Clock, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { InformationItem, Event } from '../types'
import TinyMCEEditor from './TinyMCEEditor'
import { useAuth } from '../hooks/useAuth'
import { useModal } from './ModalProvider'
import { canRegister, getEventStatus } from '../utils/eventStatus'

interface InformationCenterFormProps {
  item?: InformationItem | null
  onClose: () => void
  onSuccess?: () => void
}

export default function InformationCenterForm({ item, onClose, onSuccess }: InformationCenterFormProps) {
  const { user } = useAuth()
  const { showError, showSuccess } = useModal()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])
  const [existingAttachments, setExistingAttachments] = useState<any[]>([])
  const [isInitializing, setIsInitializing] = useState(true)
  // 批量报名相关状态
  const [isRegistrationNotice, setIsRegistrationNotice] = useState(false)
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])
  const [availableEvents, setAvailableEvents] = useState<Event[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  const [formData, setFormData] = useState({
    category: '公告' as '公告' | '通知' | '重要资料' | '规则章程',
    title: '',
    excerpt: '',
    content: '',
    featured_image_url: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    priority: 0,
    is_pinned: false,
    display_order: 0,
    published_at: '',
    expires_at: ''
  })

  useEffect(() => {
    setIsInitializing(true)
    
    if (item) {
      const formatDateTime = (dateString?: string) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
      }
      
      setFormData({
        category: item.category || '公告',
        title: item.title || '',
        excerpt: item.excerpt || '',
        content: item.content || '',
        featured_image_url: item.featured_image_url || '',
        status: item.status || 'draft',
        priority: item.priority || 0,
        is_pinned: item.is_pinned || false,
        display_order: item.display_order || 0,
        published_at: formatDateTime(item.published_at),
        expires_at: formatDateTime(item.expires_at)
      })
      
      if (item.featured_image_url) {
        setImagePreview(item.featured_image_url)
      }
      
      if (item.attachments && item.attachments.length > 0) {
        setExistingAttachments(item.attachments)
      }
      
      // 加载批量报名相关数据
      setIsRegistrationNotice(item.is_registration_notice || false)
      setSelectedEventIds(item.linked_events || [])
    } else {
      setFormData({
        category: '公告',
        title: '',
        excerpt: '',
        content: '',
        featured_image_url: '',
        status: 'draft',
        priority: 0,
        is_pinned: false,
        display_order: 0,
        published_at: '',
        expires_at: ''
      })
      setImagePreview('')
      setExistingAttachments([])
      setIsRegistrationNotice(false)
      setSelectedEventIds([])
    }
    
    // 延迟一点确保表单数据已更新
    const timer = setTimeout(() => {
      setIsInitializing(false)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [item])

  // 获取可用活动列表 - 仅当分类为"通知"且启用批量报名功能时
  useEffect(() => {
    if (formData.category === '通知' && isRegistrationNotice) {
      fetchAvailableEvents()
    } else {
      // 如果分类不是"通知"或未启用批量报名，清空已选活动
      setSelectedEventIds([])
      setAvailableEvents([])
    }
  }, [isRegistrationNotice, formData.category])

  const fetchAvailableEvents = async () => {
    if (!supabase) return
    setLoadingEvents(true)
    try {
      // 获取所有活动
      const { data: allEvents, error } = await supabase
        .from('events')
        .select('id, title, start_time, end_time, location, fee, status, registration_deadline, max_participants')
        .eq('status', 'active')
        .order('start_time', { ascending: true })
      
      if (error) throw error
      
      // 获取每个活动的报名统计
      const eventIds = (allEvents || []).map(e => e.id)
      let eventStats: Record<string, { available_spots: number }> = {}
      
      if (eventIds.length > 0) {
        try {
          const { data: statsData } = await supabase.rpc('get_batch_event_stats')
          if (statsData) {
            statsData.forEach((stat: any) => {
              eventStats[stat.event_id] = {
                available_spots: stat.available_spots
              }
            })
          }
        } catch (err) {
          console.warn('获取活动统计失败:', err)
        }
      }
      
      // 过滤出可以报名的活动（未满员、未截止、未结束）
      const availableEvents = (allEvents || []).filter(event => {
        // 检查是否可以报名（未过报名截止时间且状态是upcoming）
        if (!canRegister(event)) {
          return false
        }
        
        // 检查是否满员
        const stats = eventStats[event.id]
        if (stats && stats.available_spots <= 0) {
          return false
        }
        
        return true
      })
      
      setAvailableEvents(availableEvents)
    } catch (error) {
      console.error('获取活动列表失败:', error)
      showError('获取活动列表失败')
    } finally {
      setLoadingEvents(false)
    }
  }

  const toggleEventSelection = (eventId: string) => {
    setSelectedEventIds(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    )
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAttachmentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachmentFiles(prev => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachmentFiles(prev => prev.filter((_, i) => i !== index))
  }

  const removeExistingAttachment = (index: number) => {
    setExistingAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    if (!supabase) throw new Error('Supabase未初始化')
    
    const fileExt = file.name.split('.').pop()
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('golf-club-images')
      .upload(fileName, file)

    if (uploadError) {
      console.error('上传文件失败:', uploadError)
      throw new Error('上传文件失败')
    }

    const { data: { publicUrl } } = supabase.storage
      .from('golf-club-images')
      .getPublicUrl(fileName)

    return publicUrl
  }

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (!user) return
    
    // 验证必填字段
    if (!formData.title.trim()) {
      showError('请输入标题')
      return
    }
    
    // 如果是发布，验证正文内容
    if (status === 'published') {
    const contentText = formData.content?.replace(/<[^>]*>/g, '').trim() || ''
    if (!contentText) {
      showError('请输入正文内容')
      return
      }
    }
    
    setIsSubmitting(true)

    try {
      // 上传封面图
      let imageUrl = formData.featured_image_url
      if (imageFile && supabase) {
        imageUrl = await uploadFile(imageFile, 'information')
      }

      // 上传附件
      const newAttachments = []
      for (const file of attachmentFiles) {
        const url = await uploadFile(file, 'information/attachments')
        newAttachments.push({
          name: file.name,
          url: url,
          size: file.size,
          type: file.type
        })
      }

      // 合并新旧附件
      const allAttachments = [...existingAttachments, ...newAttachments]

      // 准备数据
      const itemData: any = {
        category: formData.category,
        title: formData.title,
        excerpt: formData.excerpt,
        content: formData.content,
        featured_image_url: imageUrl || null,
        attachments: allAttachments.length > 0 ? allAttachments : null,
        status: status,
        priority: formData.priority,
        is_pinned: formData.is_pinned,
        display_order: formData.display_order,
        author_id: user.id,
        is_registration_notice: formData.category === '通知' ? isRegistrationNotice : false,
        linked_events: formData.category === '通知' && isRegistrationNotice && selectedEventIds.length > 0 ? selectedEventIds : null
      }

      // 处理发布时间
      if (status === 'published') {
      if (formData.published_at) {
        itemData.published_at = new Date(formData.published_at).toISOString()
        } else {
        // 如果状态是已发布但没有设置发布时间，自动设置为当前时间
        itemData.published_at = new Date().toISOString()
        }
      } else {
        // 草稿状态，不设置发布时间
        itemData.published_at = formData.published_at ? new Date(formData.published_at).toISOString() : null
      }

      // 处理过期时间
      if (formData.expires_at) {
        itemData.expires_at = new Date(formData.expires_at).toISOString()
      } else {
        itemData.expires_at = null
      }

      if (item) {
        // 更新
        const { error } = await supabase
          .from('information_items')
          .update(itemData)
          .eq('id', item.id)

        if (error) throw error
      } else {
        // 创建
        const { error } = await supabase
          .from('information_items')
          .insert([itemData])

        if (error) throw error
      }

      // 显示成功提示
      const successMessage = status === 'published' 
        ? (item ? '信息已发布' : '信息创建并发布成功')
        : (item ? '草稿已保存' : '草稿创建成功')
      showSuccess(successMessage)
      
      // 延迟关闭，让用户看到成功提示
      setTimeout(() => {
        if (onSuccess) onSuccess()
        onClose()
      }, 500)
    } catch (error: any) {
      console.error('保存失败:', error)
      showError('保存失败: ' + (error.message || '未知错误'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[70] p-4 pt-20">
      <div className="bg-white rounded-2xl max-w-[1280px] w-full max-h-[85vh] overflow-y-auto shadow-xl">
        <div className="p-6">
        {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {item ? '编辑信息' : '创建信息'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 表单 */}
          <form onSubmit={(e) => { e.preventDefault() }} className="space-y-6">
          {/* 分类 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              分类 *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prevData => ({ ...prevData, category: e.target.value as any }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
              required
            >
              <option value="公告">公告</option>
              <option value="通知">通知</option>
              <option value="重要资料">重要资料</option>
              <option value="规则章程">规则章程</option>
            </select>
          </div>

          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标题 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prevData => ({ ...prevData, title: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
              placeholder="请输入标题"
              required
            />
          </div>

          {/* 摘要 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              摘要（列表展示用）
            </label>
            <textarea
              value={formData.excerpt}
              onChange={(e) => setFormData(prevData => ({ ...prevData, excerpt: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
              placeholder="请输入摘要（可选）"
              rows={3}
            />
          </div>

          {/* 正文内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              正文内容 *
            </label>
            {!isInitializing ? (
              <TinyMCEEditor
                content={formData.content}
                onChange={(content) => setFormData(prevData => ({ ...prevData, content }))}
                placeholder="请输入正文内容..."
                editorId="information-content-editor"
                height={400}
              />
            ) : (
              <div className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-center">
                加载中...
              </div>
            )}
          </div>

          {/* 封面图 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ImageIcon className="w-4 h-4 inline mr-2" />
              封面图
            </label>
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
              {imagePreview && (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="封面预览"
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 附件 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Upload className="w-4 h-4 inline mr-2" />
              附件
            </label>
            <input
              type="file"
              multiple
              onChange={handleAttachmentFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            
            {/* 新上传的附件列表 */}
            {attachmentFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachmentFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 已有附件列表 */}
            {existingAttachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {existingAttachments.map((att, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm text-gray-700">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => removeExistingAttachment(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 优先级 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                优先级
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prevData => ({ ...prevData, priority: parseInt(e.target.value) }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
              >
                <option value={0}>普通</option>
                <option value={1}>重要</option>
                <option value={2}>紧急</option>
              </select>
            </div>

          {/* 批量报名功能 - 仅当分类为"通知"时显示 */}
          {formData.category === '通知' && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="is_registration_notice"
                  checked={isRegistrationNotice}
                  onChange={(e) => setIsRegistrationNotice(e.target.checked)}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <label htmlFor="is_registration_notice" className="ml-2 text-sm font-medium text-gray-700 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  启用批量报名功能（会员可在此通知中统一报名多个活动）
                </label>
          </div>

              {isRegistrationNotice && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  选择关联的活动（可多选）
                </label>
                {loadingEvents ? (
                  <div className="text-center py-4 text-gray-500">加载活动列表中...</div>
                ) : availableEvents.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">暂无可用活动</div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => toggleEventSelection(event.id)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedEventIds.includes(event.id)
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <input
                                type="checkbox"
                                checked={selectedEventIds.includes(event.id)}
                                onChange={() => toggleEventSelection(event.id)}
                                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="font-medium text-gray-900">{event.title}</span>
                            </div>
                            <div className="ml-6 text-sm text-gray-600 space-y-1">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{new Date(event.start_time).toLocaleDateString('zh-CN')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-green-600">${event.fee}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedEventIds.length > 0 && (
                  <div className="mt-3 text-sm text-gray-600">
                    已选择 {selectedEventIds.length} 个活动
                  </div>
                )}
              </div>
              )}
            </div>
          )}

          {/* 置顶和排序 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_pinned"
                checked={formData.is_pinned}
                onChange={(e) => setFormData(prevData => ({ ...prevData, is_pinned: e.target.checked }))}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <label htmlFor="is_pinned" className="ml-2 text-sm font-medium text-gray-700 flex items-center">
                <Pin className="w-4 h-4 mr-1" />
                置顶显示
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                显示顺序（数字越小越靠前）
              </label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData(prevData => ({ ...prevData, display_order: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 发布时间和过期时间 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                发布时间
              </label>
              <input
                type="datetime-local"
                value={formData.published_at}
                onChange={(e) => setFormData(prevData => ({ ...prevData, published_at: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                过期时间（可选）
              </label>
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData(prevData => ({ ...prevData, expires_at: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('draft')}
              disabled={isSubmitting}
              className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '保存中...' : '存草稿'}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('published')}
              disabled={isSubmitting}
              className="px-6 py-2.5 text-white bg-[#F15B98] rounded-lg hover:bg-[#F15B98]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '发布中...' : '发布'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}

