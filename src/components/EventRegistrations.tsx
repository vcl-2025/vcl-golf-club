import React, { useState, useEffect } from 'react'
import { X, Users, Download, Search, Phone, Mail, CreditCard, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useModal } from './ModalProvider'
import { Event } from '../types'

interface EventRegistration {
  id: string
  payment_status: string
  registration_time: string
  notes: string | null
  user_email: string
  user_name: string
  user_phone: string
}

interface EventRegistrationsProps {
  event: Event
  onClose: () => void
}

export default function EventRegistrations({ event, onClose }: EventRegistrationsProps) {
  const [registrations, setRegistrations] = useState<EventRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending'>('all')
  const { showSuccess, showError } = useModal()

  useEffect(() => {
    fetchRegistrations()
  }, [event.id])

  const fetchRegistrations = async () => {
    try {
      if (!supabase) return
      
      // 先获取报名记录
      const registrationResponse = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', event.id)

      if (registrationResponse.error) throw registrationResponse.error
      
      const registrations = registrationResponse.data
      // console.log('🔍 获取到的报名数据:', registrations)
      
      if (!registrations || registrations.length === 0) {
        setRegistrations([])
        return
      }

      // 获取所有相关用户的详细信息
      const userIds = registrations.map((reg: any) => reg.user_id)
      
      // 获取用户资料（包含邮箱）
      const profileResponse = await supabase
        .from('user_profiles')
        .select('id, full_name, phone, email')
        .in('id', userIds)

      if (profileResponse.error) console.error('获取用户资料失败:', profileResponse.error)

      // 创建用户信息映射
      const profileMap = new Map()
      
      if (profileResponse.data) {
        profileResponse.data.forEach((profile: any) => {
          profileMap.set(profile.id, profile)
        })
      }
      
      // 转换数据格式
      const formattedData = registrations.map((reg: any) => {
        const profile = profileMap.get(reg.user_id)
        
        return {
          id: reg.id,
          user_name: profile?.full_name || '未知用户',
          user_phone: profile?.phone || '',
          payment_status: reg.payment_status,
          registration_time: reg.created_at || new Date().toISOString(),
          notes: reg.notes,
          user_email: profile?.email || ''
        }
      })
      
      setRegistrations(formattedData)
    } catch (error) {
      console.error('获取报名记录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePaymentStatus = async (registrationId: string, status: string) => {
    try {
      if (!supabase) return
      
      const response = await supabase
        .from('event_registrations')
        .update({ payment_status: status })
        .eq('id', registrationId)

      if (response.error) throw response.error

      setRegistrations(registrations.map(reg => 
        reg.id === registrationId ? { ...reg, payment_status: status } : reg
      ))
      showSuccess('支付状态更新成功')
    } catch (error) {
      console.error('更新支付状态失败:', error)
      showError('更新失败，请重试')
    }
  }

  const exportToCSV = () => {
    const headers = ['姓名', '手机号', '邮箱', '支付状态', '报名时间', '备注']
    const csvContent = [
      headers.join(','),
      ...filteredRegistrations.map(reg => [
        reg.user_name,
        reg.user_phone,
        reg.user_email,
        reg.payment_status === 'paid' ? '已支付' : '待支付',
        new Date(reg.registration_time).toLocaleString('zh-CN'),
        reg.notes || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${event.title}_报名名单.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch = reg.participant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reg.phone.includes(searchTerm) ||
                         reg.user_email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPayment = paymentFilter === 'all' || reg.payment_status === paymentFilter
    return matchesSearch && matchesPayment
  })

  const paidCount = registrations.filter(reg => reg.payment_status === 'paid').length
  const pendingCount = registrations.filter(reg => reg.payment_status === 'pending').length
  const totalRevenue = paidCount * event.fee

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{event.title} - 报名管理</h2>
              <p className="text-gray-600 mt-1">
                {new Date(event.start_time).toLocaleString('zh-CN')} | {event.location}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{registrations.length}</div>
              <div className="text-sm text-blue-600">总报名数</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{paidCount}</div>
              <div className="text-sm text-green-600">已支付</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <div className="text-sm text-yellow-600">待支付</div>
            </div>
            <div className="bg-golf-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-golf-600">¥{totalRevenue.toFixed(2)}</div>
              <div className="text-sm text-golf-600">已收金额</div>
            </div>
          </div>

          {/* 搜索和筛选 */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜索姓名、手机号或邮箱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
              />
            </div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
            >
              <option value="all">所有支付状态</option>
              <option value="paid">已支付</option>
              <option value="pending">待支付</option>
            </select>
            <button
              onClick={exportToCSV}
              className="btn-secondary flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              导出CSV
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <>
              {/* 报名列表 */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-4 px-4 text-base font-semibold text-gray-700">参赛者</th>
                      <th className="text-left py-4 px-4 text-base font-semibold text-gray-700">联系方式</th>
                      <th className="text-left py-4 px-4 text-base font-semibold text-gray-700">会员号</th>
                      <th className="text-left py-4 px-4 text-base font-semibold text-gray-700">报名时间</th>
                      <th className="text-left py-4 px-4 text-base font-semibold text-gray-700">支付状态</th>
                      <th className="text-left py-4 px-4 text-base font-semibold text-gray-700">备注</th>
                      <th className="text-left py-4 px-4 text-base font-semibold text-gray-700">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map((registration) => (
                      <tr key={registration.id} className="border-b border-gray-100 hover:bg-green-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{registration.user_name}</div>
                          <div className="text-sm text-gray-500">{registration.user_email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="w-4 h-4 mr-1" />
                            {registration.user_phone}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(registration.registration_time).toLocaleString('zh-CN')}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            registration.payment_status === 'paid' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {registration.payment_status === 'paid' ? '已支付' : '待支付'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {registration.notes || '-'}
                        </td>
                        <td className="py-3 px-4">
                          {registration.payment_status === 'pending' ? (
                            <button
                              onClick={() => handleUpdatePaymentStatus(registration.id, 'paid')}
                              className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 hover:text-green-800 text-sm font-medium rounded-lg border border-green-200 hover:border-green-300 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              标记已付
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdatePaymentStatus(registration.id, 'pending')}
                              className="px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 hover:text-yellow-800 text-sm font-medium rounded-lg border border-yellow-200 hover:border-yellow-300 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              标记待付
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredRegistrations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm || paymentFilter !== 'all' ? '没有找到匹配的报名记录' : '暂无报名记录'}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}