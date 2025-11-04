import React, { useState, useEffect } from 'react'
import { Heart, DollarSign, Calendar, Eye, Clock, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Investment {
  id: string
  project_id: string
  amount: number
  payment_proof: string | null
  status: string
  notes: string | null
  created_at: string
  investment_projects?: {
    title: string
    description: string
    target_amount: number
    current_amount: number
    status: string
    start_date: string
    end_date: string
  }
}

interface MyInvestmentsProps {
  userId: string
}

export default function MyInvestments({ userId }: MyInvestmentsProps) {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMyInvestments()
  }, [userId])

  const fetchMyInvestments = async () => {
    try {
      const { data, error } = await supabase
        .from('investments')
        .select(`
          *,
          investment_projects (
            title,
            description,
            target_amount,
            current_amount,
            status,
            start_date,
            end_date
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvestments(data || [])
    } catch (error) {
      console.error('获取投资记录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 计算项目的实际已筹集金额
  const calculateProjectAmount = (projectId: string) => {
    return investments
      .filter(inv => inv.project_id === projectId && inv.status === 'confirmed')
      .reduce((sum, inv) => sum + inv.amount, 0)
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  const getStatusInfo = (status: string) => {
    const statusMap = {
      pending: {
        icon: Clock,
        label: '待确认',
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        iconColor: 'text-yellow-600'
      },
      confirmed: {
        icon: CheckCircle,
        label: '已确认',
        color: 'text-[#F15B98] bg-[#F15B98]/10 border-[#F15B98]/30',
        iconColor: 'text-[#F15B98]'
      },
      rejected: {
        icon: XCircle,
        label: '已拒绝',
        color: 'text-red-600 bg-red-50 border-red-200',
        iconColor: 'text-red-600'
      }
    }
    return statusMap[status as keyof typeof statusMap] || statusMap.pending
  }

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }

  const getTotalInvested = () => {
    return investments
      .filter(inv => inv.status === 'confirmed')
      .reduce((sum, inv) => sum + inv.amount, 0)
  }

  const getStatusCount = (status: string) => {
    return investments.filter(inv => inv.status === status).length
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F15B98]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-[#F15B98]/10 to-[#F15B98]/5 rounded-2xl p-3 sm:p-4 border border-[#F15B98]/20">
        <div className="flex items-center mb-3 sm:mb-4">
          <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-golf-400 mr-2 sm:mr-3" style={{ fill: 'none' }} />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">我的捐赠与赞助</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <div className="bg-white rounded-xl p-2 sm:p-4 border border-gray-200">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">累计捐赠</div>
            <div className="text-lg sm:text-xl font-bold text-[#F15B98]">{formatAmount(getTotalInvested())}</div>
          </div>
          <div className="bg-white rounded-xl p-2 sm:p-4 border border-gray-200">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">支持项目</div>
            <div className="text-lg sm:text-xl font-bold text-gray-900">{investments.length}</div>
          </div>
          <div className="bg-white rounded-xl p-2 sm:p-4 border border-gray-200">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">待确认</div>
            <div className="text-lg sm:text-xl font-bold text-yellow-600">{getStatusCount('pending')}</div>
          </div>
          <div className="bg-white rounded-xl p-2 sm:p-4 border border-gray-200">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">已确认</div>
            <div className="text-lg sm:text-xl font-bold text-[#F15B98]">{getStatusCount('confirmed')}</div>
          </div>
        </div>
      </div>

      {investments.length > 0 ? (
        <div className="space-y-4">
          {investments.map((investment) => {
            const statusInfo = getStatusInfo(investment.status)
            const StatusIcon = statusInfo.icon
            const project = investment.investment_projects

            return (
              <div key={investment.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {project?.title || '项目已删除'}
                        </h3>
                        <div className={`flex items-center px-3 py-1 rounded-full border ${statusInfo.color}`}>
                          <StatusIcon className={`w-4 h-4 mr-1 ${statusInfo.iconColor}`} />
                          <span className="text-sm font-medium">{statusInfo.label}</span>
                        </div>
                      </div>
                      {project?.description && (
                        <p className="text-gray-600 mb-3">{project.description}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm text-gray-500 mb-1">我的捐赠</div>
                      <div className="text-2xl font-bold text-[#F15B98]">
                        {formatAmount(investment.amount)}
                      </div>
                    </div>
                  </div>

                  {project && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">项目进度</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {calculateProgress(calculateProjectAmount(investment.project_id), project.target_amount).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div
                          className="bg-gradient-to-r from-golf-400 to-golf-500 h-2 rounded-full transition-all"
                          style={{ width: `${calculateProgress(calculateProjectAmount(investment.project_id), project.target_amount)}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-gray-600">
                          <DollarSign className="w-4 h-4 mr-1" />
                          已筹集 {formatAmount(calculateProjectAmount(investment.project_id))} / 目标 {formatAmount(project.target_amount)}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(project.start_date)} - {formatDate(project.end_date)}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        捐赠时间：{formatDateTime(investment.created_at)}
                      </div>
                      {investment.notes && (
                        <div className="text-gray-600">
                          备注：{investment.notes}
                        </div>
                      )}
                    </div>
                    {investment.payment_proof && (
                      <a
                        href={investment.payment_proof}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        查看支付凭证
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Heart className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">还没有捐赠记录</h3>
          <p className="text-gray-600 mb-6">开始支持您喜欢的项目，为俱乐部的发展贡献力量</p>
        </div>
      )}
    </div>
  )
}
