import React, { useState, useEffect, useRef } from 'react'
import { X, User, Phone, CreditCard, QrCode, Clock, CheckCircle, XCircle, AlertCircle, Upload } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Event, EventRegistration } from '../types'

interface EventRegistrationModalProps {
  event: Event
  user: any
  onClose: () => void
  onSuccess: () => void
}

export default function EventRegistrationModal({ event, user, onClose, onSuccess }: EventRegistrationModalProps) {
  const [step, setStep] = useState<'info' | 'payment'>('info')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [userProfile, setUserProfile] = useState<any>(null)
  const [existingRegistration, setExistingRegistration] = useState<EventRegistration | null>(null)
  
  const [formData, setFormData] = useState({})
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null)


  useEffect(() => {
    if (user) {
      fetchUserProfile()
      checkExistingRegistration()
    }
  }, [user, event])

  const fetchUserProfile = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      
      if (error) throw error
      // console.log('用户资料加载:', data)
      setUserProfile(data)
    } catch (error) {
      console.error('获取用户资料失败:', error)
    }
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

  const checkExistingRegistration = async () => {
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error
      setExistingRegistration(data)
    } catch (error) {
      console.error('检查报名状态失败:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    // console.log('handleSubmit 被调用')
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // console.log('开始检查报名状态')
      // 检查是否已经报名过
      const { data: existingRegistration, error: checkError } = await supabase
        .from('event_registrations')
        .select('id, payment_status, approval_status, status')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (checkError) throw checkError

      if (existingRegistration) {
        // console.log('发现现有报名记录:', existingRegistration)
        if (existingRegistration.approval_status === 'approved' && existingRegistration.payment_status === 'paid') {
          throw new Error('您已经成功报名过这个活动了')
        } else if (existingRegistration.approval_status === 'pending') {
          throw new Error('您已申请报名，正在审核中，请耐心等待')
        } else if (existingRegistration.approval_status === 'rejected') {
          throw new Error('您的报名申请已被拒绝')
        } else if (existingRegistration.status === 'cancelled') {
          throw new Error('您已取消报名，无法重新报名')
        }
      }

      // console.log('没有现有报名记录，进入支付步骤')
      // 进入支付步骤（不创建报名记录）
      setStep('payment')
    } catch (error: any) {
      console.error('handleSubmit 错误:', error)
      setMessage(error.message || '检查报名状态失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleRegistrationSubmit = async () => {
    // console.log('开始提交报名申请')
    setMessage('')

    try {
      // 先检查是否已经存在报名记录
      const { data: existingRegistration, error: checkError } = await supabase
        .from('event_registrations')
        .select('id, status, approval_status')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = 没有找到记录
        console.error('检查现有报名失败:', checkError)
        throw checkError
      }

      if (existingRegistration) {
        // console.log('已存在报名记录:', existingRegistration)
        setMessage('您已经报名过此活动了')
        return
      }

      // 乐观锁检查：查询活动的当前报名人数
      const { data: currentRegistrations, error: countError } = await supabase
        .from('event_registrations')
        .select('id')
        .eq('event_id', event.id)
        .eq('status', 'registered')

      if (countError) {
        console.error('检查报名名额失败:', countError)
        setMessage('检查报名名额失败，请重试')
        return
      }

      // 检查是否已满
      const currentCount = currentRegistrations?.length || 0
      if (currentCount >= event.max_participants) {
        setMessage(`抱歉，该活动报名名额已满（${currentCount}/${event.max_participants}）。`)
        return
      }

      // 上传支付证明（如果有）
      let paymentProofUrl = null
      if (paymentProof) {
        try {
          const fileExt = paymentProof.name.split('.').pop()
          const fileName = `${user.id}_${Date.now()}.${fileExt}`
          const filePath = `payment-proofs/${fileName}`
          
          const { error: uploadError } = await supabase.storage
            .from('golf-club-images')
            .upload(`payment-proofs/${filePath}`, paymentProof)
          
          if (uploadError) {
            console.error('上传支付证明失败:', uploadError)
            throw uploadError
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('golf-club-images')
            .getPublicUrl(`payment-proofs/${filePath}`)
          
          paymentProofUrl = publicUrl
          // console.log('支付证明上传成功:', paymentProofUrl)
        } catch (uploadError) {
          console.error('上传支付证明失败:', uploadError)
          setMessage('上传支付证明失败，请重试')
          return
        }
      }

      // 创建报名记录，状态为待审批
      const insertData = {
        event_id: event.id,
        user_id: user.id,
        payment_status: 'pending',
        approval_status: 'pending',
        status: 'registered',
        payment_proof: paymentProofUrl
      }
      
      // console.log('插入数据:', insertData)
      
      const { error: insertError } = await supabase
        .from('event_registrations')
        .insert(insertData)

      if (insertError) {
        console.error('插入错误:', insertError)
        
        // 检查是否是唯一约束冲突
        if (insertError.code === '23505') {
          setMessage('您已经报名过此活动了，请勿重复报名')
          return
        }
        
        throw insertError
      }

      setMessage('报名申请已提交，等待管理员审核。审核通过后您将收到通知。')
      
      // 立即关闭，不等待用户看完
      onSuccess()
      onClose()
    } catch (error: any) {
      setMessage(error.message || '报名失败，请重试')
    }
  }

  // 取消报名功能
  const handleCancelRegistration = async () => {
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('event_registrations')
        .update({ 
          status: 'cancelled',
          approval_status: 'rejected' // 取消报名视为拒绝
        })
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .eq('approval_status', 'pending')

      if (error) throw error

      setMessage('报名已取消')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 2000)
    } catch (error: any) {
      setMessage(error.message || '取消报名失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (registration: EventRegistration) => {
    if (registration.approval_status === 'approved' && registration.payment_status === 'paid') {
      return {
        icon: CheckCircle,
        label: '完成报名',
        color: 'text-green-600 bg-green-50 border-green-200',
        iconColor: 'text-green-600'
      }
    } else if (registration.approval_status === 'approved' && registration.payment_status === 'pending') {
      return {
        icon: Clock,
        label: '已批准，待支付',
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        iconColor: 'text-blue-600'
      }
    } else if (registration.approval_status === 'pending') {
      return {
        icon: Clock,
        label: '审核中',
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        iconColor: 'text-yellow-600'
      }
    } else if (registration.approval_status === 'rejected') {
      return {
        icon: XCircle,
        label: '已拒绝',
        color: 'text-red-600 bg-red-50 border-red-200',
        iconColor: 'text-red-600'
      }
    } else if (registration.status === 'cancelled') {
      return {
        icon: XCircle,
        label: '已取消',
        color: 'text-gray-600 bg-gray-50 border-gray-200',
        iconColor: 'text-gray-600'
      }
    }
    return {
      icon: AlertCircle,
      label: '未知状态',
      color: 'text-gray-600 bg-gray-50 border-gray-200',
      iconColor: 'text-gray-600'
    }
  }

  // 如果已有报名记录，显示状态
  if (existingRegistration) {
    const statusInfo = getStatusInfo(existingRegistration)
    const StatusIcon = statusInfo.icon

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
        <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">报名状态</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 活动信息 */}
            <div className="bg-golf-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div>时间：{new Date(event.start_time).toLocaleString('zh-CN')}</div>
                <div>地点：{event.location}</div>
                <div>费用：¥{event.fee.toFixed(2)}</div>
              </div>
            </div>

            {/* 报名状态 */}
            <div className={`p-4 rounded-lg border-2 ${statusInfo.color} mb-6`}>
              <div className="flex items-center">
                <StatusIcon className={`w-6 h-6 mr-3 ${statusInfo.iconColor}`} />
                <div>
                  <div className="font-semibold">{statusInfo.label}</div>
                  <div className="text-sm opacity-75">
                    {existingRegistration.approval_status === 'pending' && '请耐心等待管理员审核'}
                    {existingRegistration.approval_status === 'approved' && existingRegistration.payment_status === 'pending' && '请完成支付'}
                    {existingRegistration.approval_status === 'approved' && existingRegistration.payment_status === 'paid' && '报名成功，期待您的参与！'}
                    {existingRegistration.approval_status === 'rejected' && '您的报名申请未通过审核'}
                    {existingRegistration.status === 'cancelled' && '您已取消报名'}
                  </div>
                </div>
              </div>
            </div>

            {/* 报名信息 */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">报名信息</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="text-gray-600">姓名：</span>
                  <span className="font-medium text-gray-900">{userProfile?.full_name || '未知用户'}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="text-gray-600">电话：</span>
                  <span className="font-medium text-gray-900">{userProfile?.phone || '未填写'}</span>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="space-y-3">
              {existingRegistration.approval_status === 'pending' && (
                <button
                  onClick={handleCancelRegistration}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '处理中...' : '取消报名'}
                </button>
              )}
              
              <button
                onClick={onClose}
                className="w-full py-3 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                关闭
              </button>
            </div>

            {message && (
              <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 如果没有报名记录，显示报名表单
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {step === 'info' ? '填写报名信息' : '支付报名费'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {step === 'info' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 活动信息 */}
              <div className="bg-golf-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>时间：{new Date(event.start_time).toLocaleString('zh-CN')}</div>
                  <div>地点：{event.location}</div>
                  <div>费用：¥{event.fee.toFixed(2)}</div>
                </div>
              </div>


              {/* 重要提示 */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <div className="font-semibold mb-1">报名流程说明：</div>
                    <ul className="space-y-1 text-xs">
                      <li>• 报名缴费后提交缴费证明，等待审核</li>
                      <li>• 审核通过后，报名正式生效</li>
                      <li>• 审核期间可以自行取消报名</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 提交按钮 */}
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading || !userProfile?.full_name}
                  className="flex-1 py-3 px-4 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  onClick={() => {
                    // console.log('按钮点击调试信息:', {
                    //   loading,
                    //   userProfile,
                    //   full_name: userProfile?.full_name,
                    //   phone: userProfile?.phone,
                    //   disabled: loading || !userProfile?.full_name || !userProfile?.phone
                    // })
                  }}
                >
                  {loading ? '提交中...' : '下一步：支付信息'}
                </button>
                
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  取消
                </button>
              </div>

              {message && (
                <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                  {message}
                </div>
              )}
            </form>
          ) : (
            /* 支付步骤 */
            <div className="space-y-6">
              {/* 活动信息 */}
              <div className="bg-golf-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>时间：{new Date(event.start_time).toLocaleString('zh-CN')}</div>
                  <div>地点：{event.location}</div>
                  <div className="font-semibold text-lg">费用：¥{event.fee.toFixed(2)}</div>
                </div>
              </div>

              {/* 支付信息 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  支付信息
                </h4>
                <div className="space-y-3">
                  {/* 二维码支付 */}
                  {event.payment_qr_code && (
                    <div className="p-3 bg-white rounded-lg border">
                      <div className="flex items-center mb-2">
                        <QrCode className="w-5 h-5 mr-2 text-gray-500" />
                        <span className="text-sm font-medium">扫码支付</span>
                      </div>
                      <div className="text-center">
                        <img 
                          src={event.payment_qr_code} 
                          alt="支付二维码" 
                          className="w-32 h-32 mx-auto border rounded-lg"
                        />
                        <p className="text-xs text-gray-500 mt-2">使用微信或支付宝扫码支付</p>
                      </div>
                    </div>
                  )}
                  
                  {/* EMT转账 */}
                  {event.payment_emt_email && (
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex items-center">
                        <CreditCard className="w-5 h-5 mr-2 text-gray-500" />
                        <span className="text-sm font-medium">EMT转账</span>
                      </div>
                      <div className="text-sm text-gray-600">EMT: {event.payment_emt_email}</div>
                    </div>
                  )}
                  
                  {/* 支付说明 */}
                  {event.payment_instructions && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm font-medium text-blue-900 mb-1">支付说明：</div>
                      <div className="text-sm text-blue-800">{event.payment_instructions}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* 上传支付证明 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  上传支付证明
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      上传支付凭证
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePaymentProofChange}
                        className="hidden"
                        id="payment-proof"
                      />
                      <label htmlFor="payment-proof" className="cursor-pointer">
                        {paymentProofPreview ? (
                          <div>
                            <img
                              src={paymentProofPreview}
                              alt="支付凭证预览"
                              className="max-w-full h-auto max-h-48 mx-auto rounded"
                            />
                            <p className="text-sm text-gray-600 mt-2">点击更换图片</p>
                          </div>
                        ) : (
                          <div>
                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-600 mb-1">点击上传支付凭证</p>
                            <p className="text-sm text-gray-500">支持 JPG、PNG 格式</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex space-x-3">
                <button
                  onClick={(e) => {
                    // console.log('按钮被点击')
                    // 立即禁用按钮并改变样式
                    const button = e.currentTarget
                    button.disabled = true
                    button.textContent = '提交中...'
                    button.style.opacity = '0.5'
                    button.style.cursor = 'not-allowed'
                    button.style.pointerEvents = 'none'
                    
                    // 防止重复点击
                    button.onclick = null
                    
                    handleRegistrationSubmit()
                  }}
                  className="flex-1 py-3 px-4 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80 transition-colors"
                >
                  提交报名申请
                </button>
                
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  取消
                </button>
              </div>

              {message && (
                <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                  {message}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}