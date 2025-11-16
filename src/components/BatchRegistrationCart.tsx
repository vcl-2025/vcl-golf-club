import React, { useState, useEffect } from 'react'
import { X, ShoppingCart, Calendar, MapPin, DollarSign, Upload, CheckCircle, AlertCircle, Trash2, QrCode, Mail, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Event, EventRegistration } from '../types'
import { useAuth } from '../hooks/useAuth'
import { useModal } from './ModalProvider'
import { canRegister, getEventStatus } from '../utils/eventStatus'

interface BatchRegistrationCartProps {
  events: Event[]
  noticeId: string
  onClose: () => void
  onSuccess?: () => void
}

export default function BatchRegistrationCart({ events, noticeId, onClose, onSuccess }: BatchRegistrationCartProps) {
  const { user } = useAuth()
  const { showError, showSuccess } = useModal()
  const [selectedEvents, setSelectedEvents] = useState<Event[]>(events)
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [paymentProofPreview, setPaymentProofPreview] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userRegistrations, setUserRegistrations] = useState<Record<string, EventRegistration>>({})
  const [enlargedQrCode, setEnlargedQrCode] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (user && supabase) {
      fetchUserProfile()
    }
  }, [user])

  const fetchUserProfile = async () => {
    if (!user || !supabase) return
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      
      if (error) {
        console.error('获取用户资料失败:', error)
      } else {
        setUserProfile(data)
      }
    } catch (error) {
      console.error('获取用户资料失败:', error)
    }
  }

  const downloadQRCode = async (qrCodeUrl: string, eventTitle: string) => {
    try {
      // 使用 fetch 获取图片，支持跨域
      const response = await fetch(qrCodeUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `${eventTitle}-支付二维码.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // 释放 URL 对象
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('下载二维码失败:', error)
      showError('下载二维码失败，请尝试右键保存图片')
    }
  }

  useEffect(() => {
    fetchUserRegistrations()
  }, [user])

  const fetchUserRegistrations = async () => {
    if (!user || !supabase) return
    
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('user_id', user.id)
        .in('event_id', selectedEvents.map(e => e.id))
      
      if (error) throw error
      
      const registrationsMap: Record<string, EventRegistration> = {}
      data?.forEach((reg: any) => {
        registrationsMap[reg.event_id] = reg
      })
      setUserRegistrations(registrationsMap)
    } catch (error) {
      console.error('获取报名状态失败:', error)
    }
  }

  const removeEvent = (eventId: string) => {
    setSelectedEvents(prev => prev.filter(e => e.id !== eventId))
  }

  const handlePaymentProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPaymentProof(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPaymentProofPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadPaymentProof = async (file: File): Promise<string> => {
    console.log('📤 开始上传支付凭证:', { fileName: file.name, fileSize: file.size, fileType: file.type })
    
    if (!supabase) {
      console.error('❌ Supabase未初始化')
      throw new Error('Supabase未初始化')
    }
    
    const fileExt = file.name.split('.').pop()
    const fileName = `payment-proofs/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    console.log('📁 生成的文件名:', fileName)
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('golf-club-images')
      .upload(fileName, file)

    console.log('📤 上传结果:', { uploadData, uploadError })

    if (uploadError) {
      console.error('❌ 上传凭证失败:', uploadError)
      throw new Error('上传凭证失败: ' + (uploadError.message || '未知错误'))
    }

    const { data: { publicUrl } } = supabase.storage
      .from('golf-club-images')
      .getPublicUrl(fileName)

    console.log('✅ 获取公开URL:', publicUrl)
    return publicUrl
  }

  const calculateTotal = () => {
    return selectedEvents.reduce((sum, event) => {
      // 如果已报名，不计算价格
      if (userRegistrations[event.id]) return sum
      return sum + (event.fee || 0)
    }, 0)
  }

  const handleSubmit = async () => {
    console.log('=== 批量报名提交开始 ===')
    console.log('1. 检查用户登录状态:', { user: !!user, userProfile: !!userProfile, supabase: !!supabase })
    
    if (!user || !supabase) {
      console.error('❌ 用户未登录或 Supabase 未初始化')
      showError('请先登录')
      return
    }

    // 如果 userProfile 还未加载，尝试获取
    if (!userProfile) {
      console.log('⚠️ userProfile 未加载，尝试获取...')
      await fetchUserProfile()
      // 如果仍然没有，使用 user 的基本信息
      if (!userProfile) {
        console.warn('⚠️ 无法获取用户资料，使用默认值')
      }
    }

    console.log('2. 检查选中活动数量:', selectedEvents.length)
    if (selectedEvents.length === 0) {
      console.error('❌ 没有选中任何活动')
      showError('请至少选择一个活动')
      return
    }

    // 检查是否有已报名的活动
    const alreadyRegistered = selectedEvents.filter(e => userRegistrations[e.id])
    console.log('3. 检查已报名活动:', { alreadyRegistered: alreadyRegistered.length, userRegistrations })
    if (alreadyRegistered.length > 0) {
      console.error('❌ 存在已报名的活动:', alreadyRegistered.map(e => e.title))
      showError(`您已报名以下活动：${alreadyRegistered.map(e => e.title).join('、')}`)
      return
    }

    // 检查是否有活动已结束或报名已截止
    const invalidEvents = selectedEvents.filter(event => !canRegister(event))
    if (invalidEvents.length > 0) {
      const now = new Date()
      const reasons = invalidEvents.map(event => {
        const status = getEventStatus(event)
        const registrationDeadline = new Date(event.registration_deadline)
        
        if (status === 'completed') {
          return `${event.title}（活动已结束）`
        }
        if (now >= registrationDeadline) {
          return `${event.title}（报名已截止）`
        }
        if (status === 'cancelled') {
          return `${event.title}（活动已取消）`
        }
        return `${event.title}（不可报名）`
      })
      
      console.error('❌ 存在不可报名的活动:', reasons)
      showError(`以下活动无法报名：${reasons.join('、')}。请从选择中移除这些活动后重试。`)
      return
    }

    console.log('4. 检查支付凭证:', { paymentProof: !!paymentProof })
    if (!paymentProof) {
      console.error('❌ 未上传支付凭证')
      showError('请上传支付凭证')
      return
    }

    console.log('5. 开始提交流程...')
    setIsSubmitting(true)

    try {
      // 乐观锁检查：查询每个活动的当前报名人数
      console.log('6. 开始检查报名名额...')
      const eventIds = selectedEvents.map(e => e.id)
      const { data: currentRegistrations, error: checkError } = await supabase
        .from('event_registrations')
        .select('event_id')
        .in('event_id', eventIds)
        .eq('status', 'registered')

      if (checkError) {
        console.error('❌ 检查报名名额失败:', checkError)
        throw new Error('检查报名名额失败: ' + checkError.message)
      }

      // 统计每个活动的报名人数
      const registrationCounts: Record<string, number> = {}
      currentRegistrations?.forEach((reg: any) => {
        registrationCounts[reg.event_id] = (registrationCounts[reg.event_id] || 0) + 1
      })

      // 检查是否有活动已满
      const fullEvents: string[] = []
      selectedEvents.forEach(event => {
        const currentCount = registrationCounts[event.id] || 0
        if (currentCount >= event.max_participants) {
          fullEvents.push(event.title)
        }
      })

      if (fullEvents.length > 0) {
        console.error('❌ 存在已满的活动:', fullEvents)
        throw new Error(`以下活动报名名额已满：${fullEvents.join('、')}。请从选择中移除这些活动后重试。`)
      }

      console.log('✅ 名额检查通过')
      console.log('7. 开始上传支付凭证...')
      // 上传支付凭证
      const paymentProofUrl = await uploadPaymentProof(paymentProof)
      console.log('✅ 支付凭证上传成功:', paymentProofUrl)

      // 批量创建报名记录
      // 参考 EventRegistrationModal 的插入方式，只包含必需的字段
      const registrations = selectedEvents.map(event => {
        const registration: any = {
          event_id: event.id,
          user_id: user.id,
          payment_status: 'pending' as const,
          payment_proof: paymentProofUrl,
          status: 'registered' as const
        }
        
        // 添加 notice_id（如果存在）
        if (noticeId) {
          registration.notice_id = noticeId
        }
        
        return registration
      })

      console.log('8. 准备插入报名记录:', {
        registrationsCount: registrations.length,
        registrations: registrations.map(r => ({
          event_id: r.event_id,
          user_id: r.user_id,
          notice_id: r.notice_id
        }))
      })

      const { data, error } = await supabase
        .from('event_registrations')
        .insert(registrations)
        .select()

      console.log('9. 插入结果:', { data, error })

      if (error) {
        console.error('❌ 插入报名记录失败:', error)
        throw error
      }

      console.log('✅ 报名成功!')
      showSuccess(`成功报名 ${selectedEvents.length} 个活动！报名申请已提交，等待管理员审核。审核通过后您将收到通知。`)
      
      // 发送刷新事件，确保 EventList 刷新
      window.dispatchEvent(new CustomEvent('eventRegistrationUpdated'))
      
      setTimeout(() => {
        if (onSuccess) onSuccess()
        onClose()
      }, 1000)
    } catch (error: any) {
      console.error('❌ 报名失败:', error)
      console.error('错误详情:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      showError('报名失败: ' + (error.message || '未知错误'))
    } finally {
      setIsSubmitting(false)
      console.log('=== 批量报名提交结束 ===')
    }
  }

  const total = calculateTotal()
  const hasAlreadyRegistered = selectedEvents.some(e => userRegistrations[e.id])
  
  // 检查不可报名的活动（已结束或报名已截止）
  const invalidEvents = selectedEvents.filter(event => {
    if (userRegistrations[event.id]) return false // 已报名的活动不算作无效
    return !canRegister(event)
  })
  
  const getEventUnavailableReason = (event: Event): string => {
    const status = getEventStatus(event)
    const now = new Date()
    const registrationDeadline = new Date(event.registration_deadline)
    
    if (status === 'completed') {
      return '活动已结束'
    }
    if (now >= registrationDeadline) {
      return '报名已截止'
    }
    if (status === 'cancelled') {
      return '活动已取消'
    }
    return '不可报名'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[80] overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-xl">
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-6 h-6 text-[#F15B98]" />
            <h2 className="text-2xl font-bold text-gray-900">批量报名</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 活动列表 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              已选活动 ({selectedEvents.length})
            </h3>
            <div className="space-y-3">
              {selectedEvents.map((event) => {
                const isRegistered = !!userRegistrations[event.id]
                const isInvalid = !isRegistered && !canRegister(event)
                const unavailableReason = isInvalid ? getEventUnavailableReason(event) : ''
                // 获取图片 URL，确保是有效的 URL
                const rawImageUrl = event.image_url || event.article_featured_image_url
                const imageUrl = rawImageUrl && rawImageUrl.trim() && rawImageUrl.startsWith('http') ? rawImageUrl : null
                const hasImageError = imageErrors[event.id] || false
                
                return (
                  <div
                    key={event.id}
                    className={`p-4 rounded-lg border-2 ${
                      isRegistered
                        ? 'border-yellow-300 bg-yellow-50'
                        : isInvalid
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* 活动图片 */}
                      <div className="flex-shrink-0">
                        {imageUrl && !hasImageError ? (
                          <img
                            src={imageUrl}
                            alt={event.title}
                            className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg"
                            onError={() => {
                              setImageErrors(prev => ({ ...prev, [event.id]: true }))
                            }}
                          />
                        ) : (
                          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                            <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900">{event.title}</h4>
                          {isRegistered && (
                            <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs font-medium rounded">
                              已报名
                            </span>
                          )}
                          {isInvalid && (
                            <span className="px-2 py-1 bg-red-200 text-red-800 text-xs font-medium rounded">
                              {unavailableReason}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(event.start_time).toLocaleDateString('zh-CN')} {new Date(event.start_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{event.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-semibold text-green-600">${event.fee}</span>
                          </div>
                        </div>
                        
                        {/* 支付信息 */}
                        {(event.payment_qr_code || event.payment_emt_email || event.payment_instructions) ? (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="text-xs font-medium text-gray-700 mb-2">支付方式：</div>
                            <div className="space-y-2">
                              {/* 二维码 */}
                              {event.payment_qr_code && (
                                <div className="flex items-start gap-2">
                                  <QrCode className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <div className="text-xs text-gray-600 mb-1">
                                      扫码支付 <span className="text-red-500">（点击图片下载）</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <img
                                        src={event.payment_qr_code}
                                        alt="支付二维码"
                                        onClick={() => {
                                          if (event.payment_qr_code) {
                                            downloadQRCode(event.payment_qr_code, event.title)
                                          }
                                        }}
                                        className="w-12 h-12 sm:w-24 sm:h-24 object-contain border border-gray-200 rounded cursor-pointer hover:border-[#F15B98] transition-colors"
                                        title="点击下载二维码"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* EMT邮箱 */}
                              {event.payment_emt_email && (
                                <div className="flex items-start gap-2">
                                  <Mail className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <div className="text-xs text-gray-600 mb-1">EMT转账</div>
                                    <div className="text-xs font-medium text-gray-900 break-all">{event.payment_emt_email}</div>
                                  </div>
                                </div>
                              )}
                              
                              {/* 支付说明 */}
                              {event.payment_instructions && (
                                <div className="text-xs text-gray-600 whitespace-pre-wrap">
                                  {event.payment_instructions}
                                </div>
                              )}
                              
                              {/* 删除按钮 - 邮箱下方 */}
                              {!isRegistered && (
                                <div className="flex justify-end mt-2">
                                  <button
                                    onClick={() => removeEvent(event.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* 如果没有支付信息，删除按钮显示在基本信息下方 */
                          !isRegistered && (
                            <div className="flex justify-end mt-3">
                              <button
                                onClick={() => removeEvent(event.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 价格总计 */}
          {!hasAlreadyRegistered && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">总计：</span>
                <span className="text-2xl font-bold text-green-600">${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* 支付凭证上传 */}
          {!hasAlreadyRegistered && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Upload className="w-4 h-4 inline mr-2" />
                上传支付凭证（所有活动共享同一凭证）*
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePaymentProofChange}
                  className="hidden"
                  id="payment-proof-upload"
                />
                <label htmlFor="payment-proof-upload" className="cursor-pointer block">
                  {paymentProofPreview ? (
                    <div>
                      <img
                        src={paymentProofPreview}
                        alt="凭证预览"
                        className="max-w-full max-h-48 mx-auto mb-2 rounded-lg"
                      />
                      <p className="text-sm text-gray-600">点击更换凭证</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 mb-1">点击上传支付凭证</p>
                      <p className="text-xs text-gray-500">支持 JPG、PNG 格式</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          )}

          {hasAlreadyRegistered && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    您已报名部分活动，请先取消已报名的活动后再进行批量报名。
                  </p>
                </div>
              </div>
            </div>
          )}

          {invalidEvents.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 mb-1">
                    购物车中有 {invalidEvents.length} 个活动无法报名：
                  </p>
                  <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                    {invalidEvents.map(event => (
                      <li key={event.id}>
                        {event.title}（{getEventUnavailableReason(event)}）
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-red-700 mt-2">
                    请从购物车中移除这些活动后才能继续报名。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-2xl flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          {!hasAlreadyRegistered && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedEvents.length === 0 || !paymentProof || invalidEvents.length > 0}
              className="px-6 py-2.5 text-white bg-[#F15B98] rounded-lg hover:bg-[#F15B98]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  提交中...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  确认报名 ({selectedEvents.length} 个活动)
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 二维码放大查看弹窗 */}
      {enlargedQrCode && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[90] p-4"
          onClick={() => setEnlargedQrCode(null)}
        >
          <div className="bg-white rounded-lg p-4 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">支付二维码</h3>
              <button
                onClick={() => setEnlargedQrCode(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col items-center gap-4">
              <img
                src={enlargedQrCode}
                alt="支付二维码"
                className="w-64 h-64 object-contain border border-gray-200 rounded"
              />
              <button
                onClick={() => {
                  if (enlargedQrCode) {
                    downloadQRCode(enlargedQrCode, '支付二维码')
                  }
                }}
                className="px-4 py-2 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/90 transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                下载二维码
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

