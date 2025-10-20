import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Check, X, Eye, AlertCircle, AlertTriangle, CheckCircle, Clock, DollarSign } from 'lucide-react'
import { useModal } from './ModalProvider'
import { EventRegistration } from '../types'

interface EventRegistrationAdminProps {
  eventId: string
  eventTitle: string
  onDataChange?: () => void
}

const EventRegistrationAdmin: React.FC<EventRegistrationAdminProps> = ({ 
  eventId, 
  eventTitle, 
  onDataChange 
}) => {
  const [registrations, setRegistrations] = useState<EventRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRegistration, setSelectedRegistration] = useState<EventRegistration | null>(null)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [showBatchApprovalModal, setShowBatchApprovalModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const { showSuccess, showError } = useModal()

  useEffect(() => {
    fetchRegistrations()
  }, [eventId])


  const fetchRegistrations = async () => {
    try {
      // 检查 supabase 连接
      if (!supabase) {
        showError('数据库连接不可用')
        return
      }
      
      // 先获取报名记录
      const { data: registrationsData, error: registrationsError } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .order('registration_time', { ascending: false })

      if (registrationsError) throw registrationsError

      if (!registrationsData || registrationsData.length === 0) {
        setRegistrations([])
        return
      }

      // 获取所有用户ID
      const userIds = registrationsData.map(reg => reg.user_id)
      
      // 获取用户资料
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name, phone')
        .in('id', userIds)

      if (profilesError) throw profilesError

      // 合并数据
      const registrationsWithProfiles = registrationsData.map(registration => {
        const profile = profilesData?.find(p => p.id === registration.user_id)
        return {
          ...registration,
          user_profiles: profile
        }
      })

      setRegistrations(registrationsWithProfiles)
    } catch (error) {
      console.error('获取报名记录失败:', error)
      showError('获取报名记录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleApproval = async (registrationId: string, approved: boolean) => {
    setProcessingId(registrationId)
    
    // 检查 supabase 连接
    if (!supabase) {
      showError('数据库连接不可用')
      return
    }
    
    try {
      if (approved) {
        // 批准：更新状态
        const { error } = await supabase
          .from('event_registrations')
          .update({
            approval_status: 'approved',
            approval_time: new Date().toISOString(),
            approved_by: (await supabase.auth.getUser()).data.user?.id,
            approval_notes: approvalNotes || '审批通过',
            payment_status: 'paid'
          })
          .eq('id', registrationId)

        if (error) throw error
        showSuccess('报名申请已批准')
      } else {
        // 取消：删除报名记录
        const { error } = await supabase
          .from('event_registrations')
          .delete()
          .eq('id', registrationId)

        if (error) throw error
        showSuccess('报名申请已取消')
      }

      setApprovalNotes('')
      setSelectedRegistration(null) // 关闭详情模态框
      fetchRegistrations()
      
      // 通知父组件数据已更新
      if (onDataChange) {
        onDataChange()
      }
    } catch (error) {
      console.error('操作失败:', error)
      showError(approved ? '批准失败' : '取消失败')
    } finally {
      setProcessingId(null)
    }
  }

  const handleBatchApproval = async () => {
    if (selectedIds.length === 0) return

    setProcessingId('batch')
    
    // 检查 supabase 连接
    if (!supabase) {
      showError('数据库连接不可用')
      return
    }
    
    try {
      const { error } = await supabase
        .from('event_registrations')
        .update({
          approval_status: 'approved',
          approval_time: new Date().toISOString(),
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approval_notes: '批量审批通过',
          payment_status: 'paid'
        })
        .in('id', selectedIds)

      if (error) throw error
      showSuccess(`已批量批准 ${selectedIds.length} 个报名申请`)
      setShowBatchApprovalModal(false)
      setSelectedIds([])
      fetchRegistrations()
      
      // 通知父组件数据已更新
      if (onDataChange) {
        onDataChange()
      }
    } catch (error) {
      console.error('批量审批失败:', error)
      showError('批量审批失败')
    } finally {
      setProcessingId(null)
    }
  }

  const handleSelectAll = () => {
    const pendingRegistrations = registrations.filter(reg => reg.approval_status === 'pending')
    if (selectedIds.length === pendingRegistrations.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(pendingRegistrations.map(reg => reg.id))
    }
  }

  const handleSelectRegistration = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    )
  }

  const getStatusInfo = (registration: EventRegistration) => {
    if (registration.approval_status === 'approved' && registration.payment_status === 'paid') {
      return {
        icon: CheckCircle,
        text: '已批准',
        iconColor: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      }
    } else if (registration.approval_status === 'approved' && registration.payment_status === 'pending') {
      return {
        icon: Clock,
        text: '待支付',
        iconColor: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      }
    } else if (registration.approval_status === 'rejected') {
      return {
        icon: X,
        text: '已拒绝',
        iconColor: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      }
    } else {
      return {
        icon: Clock,
        text: '待审批',
        iconColor: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      }
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-golf-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {eventTitle} - 报名管理
        </h3>
        <div className="flex items-center space-x-4">
          {(() => {
            const pendingCount = registrations.filter(reg => reg.approval_status === 'pending').length
            return pendingCount > 0 ? (
              <button
                onClick={() => setShowBatchApprovalModal(true)}
                disabled={processingId === 'batch' || selectedIds.length === 0}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <Check className="w-4 h-4 mr-2" />
                {processingId === 'batch' ? '处理中...' : `批量通过 (${selectedIds.length})`}
              </button>
            ) : null
          })()}
          <div className="text-sm text-gray-500">
            共 {registrations.length} 个报名记录
          </div>
        </div>
      </div>

      {registrations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          暂无报名记录
        </div>
      ) : (
        <div className="space-y-4">
          {/* 表头 - 全选功能 */}
          {(() => {
            const pendingCount = registrations.filter(reg => reg.approval_status === 'pending').length
            return pendingCount > 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === pendingCount && pendingCount > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {selectedIds.length === pendingCount ? '取消全选' : '全选'} 待审批报名 ({pendingCount} 个)
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    已选择 {selectedIds.length} 个
                  </div>
                </div>
              </div>
            ) : null
          })()}
          
          {registrations.map((registration) => {
            const statusInfo = getStatusInfo(registration)
            const StatusIcon = statusInfo.icon

            return (
              <div key={registration.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {registration.approval_status === 'pending' && (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(registration.id)}
                          onChange={() => handleSelectRegistration(registration.id)}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <StatusIcon className={`w-5 h-5 ${statusInfo.iconColor}`} />
                      <div>
                        <div className="font-semibold text-gray-900">
                          {registration.user_profiles?.full_name || '未知用户'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {registration.user_profiles?.phone}
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.iconColor}`}>
                        {statusInfo.text}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">报名时间:</span>
                        <span className="ml-2 font-medium">{formatDateTime(registration.registration_time)}</span>
                      </div>
                      {registration.payment_proof && (
                        <div className="flex items-center text-green-600">
                          <DollarSign className="w-4 h-4 mr-1" />
                          <span className="text-sm">已上传支付证明</span>
                        </div>
                      )}
                    </div>

                    {registration.notes && (
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <span className="font-medium">备注:</span> {registration.notes}
                      </div>
                    )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedRegistration(registration)}
                      className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      查看详情
                    </button>
                    
                    {registration.approval_status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApproval(registration.id, true)}
                          disabled={processingId === registration.id}
                          className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm transition-colors disabled:opacity-50"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          {processingId === registration.id ? '处理中...' : '批准报名'}
                        </button>
                        <button
                          onClick={() => handleApproval(registration.id, false)}
                          disabled={processingId === registration.id}
                          className="flex items-center px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4 mr-1" />
                          {processingId === registration.id ? '处理中...' : '取消报名'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 详情模态框 */}
      {selectedRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">报名详情</h3>
                <button
                  onClick={() => setSelectedRegistration(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">用户信息</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">姓名:</span>
                      <span className="font-medium">{selectedRegistration.user_profiles?.full_name || '未知'}</span>
                    </div>
                    {selectedRegistration.user_profiles?.phone && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">电话:</span>
                        <span className="font-medium">{selectedRegistration.user_profiles.phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">报名时间:</span>
                      <span className="font-medium">{formatDateTime(selectedRegistration.registration_time)}</span>
                    </div>
                    {selectedRegistration.approval_time && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">审批时间:</span>
                        <span className="font-medium">{formatDateTime(selectedRegistration.approval_time)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedRegistration.payment_proof && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">支付证明</h4>
                    <div className="mt-2">
                      <img
                        src={selectedRegistration.payment_proof}
                        alt="支付证明"
                        className="max-w-full h-auto max-h-64 rounded-lg border border-gray-200"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                      <div className="hidden text-sm text-gray-500 mt-2">
                        图片加载失败，请检查图片链接
                      </div>
                    </div>
                  </div>
                )}

                {selectedRegistration.notes && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">备注信息</h4>
                    <p className="text-sm text-blue-800">{selectedRegistration.notes}</p>
                  </div>
                )}

                {selectedRegistration.approval_notes && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">审批备注</h4>
                    <p className="text-sm text-green-800">{selectedRegistration.approval_notes}</p>
                  </div>
                )}

                {/* 审批操作区域 */}
                {selectedRegistration.approval_status === 'pending' && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-yellow-900 mb-3">审批操作</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          审批备注 (可选)
                        </label>
                        <textarea
                          value={approvalNotes}
                          onChange={(e) => setApprovalNotes(e.target.value)}
                          placeholder="请输入审批备注..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                          rows={3}
                        />
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleApproval(selectedRegistration.id, true)}
                          disabled={processingId === selectedRegistration.id}
                          className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          {processingId === selectedRegistration.id ? '处理中...' : '批准报名'}
                        </button>
                        <button
                          onClick={() => handleApproval(selectedRegistration.id, false)}
                          disabled={processingId === selectedRegistration.id}
                          className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          <X className="w-4 h-4 mr-2" />
                          {processingId === selectedRegistration.id ? '处理中...' : '取消报名'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 批量审批警告模态框 */}
      {showBatchApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">批量审批警告</h3>
              </div>
              
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <div className="font-semibold mb-2">⚠️ 重要提醒：</div>
                      <ul className="space-y-1">
                        <li>• 此操作不会检查付款证明</li>
                        <li>• 不会给予个人备注</li>
                        <li>• 一旦批准不可返回</li>
                        <li>• 将自动设置支付状态为"已支付"</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  确定要批量批准选中的 {selectedIds.length} 个报名申请吗？<br/>
                  <span className="text-red-600 font-medium">注意：批量操作只能批准，不能取消报名。</span>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowBatchApprovalModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleBatchApproval}
                  disabled={processingId === 'batch'}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {processingId === 'batch' ? '处理中...' : '确认批量通过'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventRegistrationAdmin