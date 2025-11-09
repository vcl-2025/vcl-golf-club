import React, { useState, useEffect } from 'react'
import { X, ShoppingCart, Calendar, MapPin, DollarSign, Upload, CheckCircle, AlertCircle, Trash2, QrCode, Mail, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Event, EventRegistration } from '../types'
import { useAuth } from '../hooks/useAuth'
import { useModal } from './ModalProvider'

interface EventCartModalProps {
  eventIds: string[]
  onClose: () => void
  onRemoveFromCart: (eventId: string) => void
  onSuccess?: () => void
}

export default function EventCartModal({ eventIds, onClose, onRemoveFromCart, onSuccess }: EventCartModalProps) {
  const { user } = useAuth()
  const { showError, showSuccess } = useModal()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [userRegistrations, setUserRegistrations] = useState<Record<string, EventRegistration>>({})
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [paymentProofPreview, setPaymentProofPreview] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [enlargedQrCode, setEnlargedQrCode] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (user && supabase) {
      fetchUserProfile()
    }
  }, [user])

  useEffect(() => {
    if (eventIds.length > 0) {
      fetchEvents()
    } else {
      setLoading(false)
    }
  }, [eventIds])

  useEffect(() => {
    if (user && events.length > 0) {
      fetchUserRegistrations()
    }
  }, [user, events])

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

  const fetchEvents = async () => {
    if (!supabase || eventIds.length === 0) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*, image_url, article_featured_image_url')
        .in('id', eventIds)
        .order('start_time', { ascending: true })
      
      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('获取活动详情失败:', error)
      showError('获取活动详情失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserRegistrations = async () => {
    if (!user || !supabase || events.length === 0) return
    
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('user_id', user.id)
        .in('event_id', events.map(e => e.id))
      
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
    onRemoveFromCart(eventId)
    setEvents(prev => prev.filter(e => e.id !== eventId))
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
    if (!supabase) {
      throw new Error('Supabase未初始化')
    }
    
    const fileExt = file.name.split('.').pop()
    const fileName = `payment-proofs/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('golf-club-images')
      .upload(fileName, file)

    if (uploadError) {
      throw new Error('上传凭证失败: ' + (uploadError.message || '未知错误'))
    }

    const { data: { publicUrl } } = supabase.storage
      .from('golf-club-images')
      .getPublicUrl(fileName)

    return publicUrl
  }

  const downloadQRCode = async (qrCodeUrl: string, eventTitle: string) => {
    try {
      const response = await fetch(qrCodeUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `${eventTitle}-支付二维码.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('下载二维码失败:', error)
      showError('下载二维码失败，请尝试右键保存图片')
    }
  }

  const calculateTotal = () => {
    return events.reduce((sum, event) => {
      // 如果已报名，不计算价格
      if (userRegistrations[event.id]) return sum
      return sum + (event.fee || 0)
    }, 0)
  }

  const handleSubmit = async () => {
    if (!user || !supabase) {
      showError('请先登录')
      return
    }

    // 如果 userProfile 还未加载，尝试获取
    if (!userProfile) {
      await fetchUserProfile()
    }

    if (events.length === 0) {
      showError('请至少选择一个活动')
      return
    }

    // 检查是否有已报名的活动，如果有则不允许提交
    const alreadyRegisteredInCart = events.filter(e => userRegistrations[e.id])
    if (alreadyRegisteredInCart.length > 0) {
      showError(`购物车中有已报名的活动，请先移除后再提交：${alreadyRegisteredInCart.map(e => e.title).join('、')}`)
      return
    }

    if (!paymentProof) {
      showError('请上传支付凭证')
      return
    }

    setIsSubmitting(true)

    try {
      // 乐观锁检查：查询每个活动的当前报名人数
      const eventIds = events.map(e => e.id)
      const { data: currentRegistrations, error: checkError } = await supabase
        .from('event_registrations')
        .select('event_id')
        .in('event_id', eventIds)
        .eq('status', 'registered')

      if (checkError) {
        throw new Error('检查报名名额失败: ' + checkError.message)
      }

      // 统计每个活动的报名人数
      const registrationCounts: Record<string, number> = {}
      currentRegistrations?.forEach((reg: any) => {
        registrationCounts[reg.event_id] = (registrationCounts[reg.event_id] || 0) + 1
      })

      // 检查是否有活动已满
      const fullEvents: string[] = []
      events.forEach(event => {
        const currentCount = registrationCounts[event.id] || 0
        if (currentCount >= event.max_participants) {
          fullEvents.push(event.title)
        }
      })

      if (fullEvents.length > 0) {
        throw new Error(`以下活动报名名额已满：${fullEvents.join('、')}。请从购物车中移除这些活动后重试。`)
      }

      // 上传支付凭证
      const paymentProofUrl = await uploadPaymentProof(paymentProof)

      // 批量创建报名记录
      const registrations = events.map(event => ({
        event_id: event.id,
        user_id: user.id,
        payment_status: 'pending' as const,
        payment_proof: paymentProofUrl,
        status: 'registered' as const
      }))

      const { data, error } = await supabase
        .from('event_registrations')
        .insert(registrations)
        .select()

      if (error) {
        throw error
      }

      showSuccess(`成功报名 ${events.length} 个活动！报名申请已提交，等待管理员审核。审核通过后您将收到通知。`)
      
      // 从购物车中移除已成功报名的活动
      events.forEach(event => {
        onRemoveFromCart(event.id)
      })
      
      // 立即关闭购物车modal，成功提示已经显示在上方
      if (onSuccess) onSuccess()
      onClose()
      
      // 延迟发送刷新事件，确保数据库写入完成
      setTimeout(() => {
        console.log('EventCartModal: 发送报名更新事件')
        window.dispatchEvent(new CustomEvent('eventRegistrationUpdated'))
      }, 100)
    } catch (error: any) {
      console.error('报名失败:', error)
      showError('报名失败: ' + (error.message || '未知错误'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const total = calculateTotal()
  const hasAlreadyRegistered = events.some(e => userRegistrations[e.id])
  const availableEvents = events.filter(e => !userRegistrations[e.id])
  const alreadyRegistered = events.filter(e => userRegistrations[e.id])

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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F15B98]"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">购物车是空的</p>
            </div>
          ) : (
            <>
              {/* 活动列表 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  已选活动 ({events.length})
                </h3>
                <div className="space-y-3">
                  {events.map((event) => {
                    const isRegistered = !!userRegistrations[event.id]
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
                                <span className="font-semibold text-green-600">${event.fee.toFixed(2)}</span>
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
                                  
                                  {/* 删除按钮 - 邮箱下方（已报名的活动也需要显示，让用户可以从购物车移除） */}
                                  <div className="flex justify-end mt-2">
                                    <button
                                      onClick={() => removeEvent(event.id)}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title={isRegistered ? "从购物车移除（活动已报名）" : "从购物车移除"}
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* 如果没有支付信息，删除按钮显示在基本信息下方（已报名的活动也需要显示） */
                              <div className="flex justify-end mt-3">
                                <button
                                  onClick={() => removeEvent(event.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title={isRegistered ? "从购物车移除（活动已报名）" : "从购物车移除"}
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
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
                        购物车中有 {alreadyRegistered.length} 个活动您已报名，请先移除这些活动后才能继续报名。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
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
          {!hasAlreadyRegistered && events.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || events.length === 0 || !paymentProof}
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
                  确认报名 ({events.length} 个活动)
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
                className="p-2 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/90 transition-colors"
                title="下载二维码"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
