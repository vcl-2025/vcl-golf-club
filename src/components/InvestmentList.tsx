import React, { useState, useEffect } from 'react'
import { Heart, TrendingUp, Calendar, DollarSign, ChevronRight, List, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import MyInvestments from './MyInvestments'
import { useAuth } from '../hooks/useAuth'

interface InvestmentProject {
  id: string
  title: string
  description: string
  target_amount: number
  current_amount: number
  payment_method: string | null
  payment_qrcode_url: string | null
  emt_email: string | null
  status: string
  start_date: string
  end_date: string
  created_at: string
}

interface InvestmentListProps {
  onProjectSelect: (project: InvestmentProject) => void
  userId?: string
}

export default function InvestmentList({ onProjectSelect, userId }: InvestmentListProps) {
  const { user } = useAuth()
  const [projects, setProjects] = useState<InvestmentProject[]>([])
  const [investments, setInvestments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all')

  useEffect(() => {
    fetchProjects()
    fetchInvestments()
  }, [])

  // 添加定期刷新机制，确保数据一致性
  useEffect(() => {
    const interval = setInterval(() => {
      fetchProjects()
      fetchInvestments()
    }, 30000) // 每30秒刷新一次

    return () => clearInterval(interval)
  }, [])

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('investment_projects')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('获取投资项目失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([fetchProjects(), fetchInvestments()])
    } finally {
      setRefreshing(false)
    }
  }

  const fetchInvestments = async () => {
    try {
      // console.log('开始获取投资记录...')
      // console.log('当前用户ID:', user?.id)
      // console.log('用户邮箱:', user?.email)
      
      // 直接获取所有已确认的投资记录，用于计算项目筹款进度
      // 这个查询应该返回所有用户的已确认投资记录
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('status', 'confirmed')

      if (error) {
        console.error('获取已确认投资记录错误:', error)
        console.error('错误详情:', error)
        throw error
      }
      
      // console.log('获取到的已确认投资记录数量:', data?.length || 0)
      // console.log('已确认投资记录详情:', data)
      
      // 如果获取不到数据，尝试不同的查询方式
      if (!data || data.length === 0) {
        // console.log('尝试获取所有投资记录...')
        const { data: allData, error: allError } = await supabase
          .from('investments')
          .select('*')
        
        if (allError) {
          console.error('获取所有投资记录错误:', allError)
        } else {
          // console.log('所有投资记录数量:', allData?.length || 0)
          // console.log('所有投资记录详情:', allData)
          
          if (allData && allData.length > 0) {
            // console.log('投资记录状态分布:')
            const statusCount = allData.reduce((acc, inv) => {
              acc[inv.status] = (acc[inv.status] || 0) + 1
              return acc
            }, {})
            // console.log(statusCount)
          }
        }
      }
      
      setInvestments(data || [])
    } catch (error) {
      console.error('获取投资记录失败:', error)
    }
  }

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }

  // 计算项目的实际已筹集金额
  const calculateProjectAmount = (projectId: string) => {
    const projectInvestments = investments.filter(inv => inv.project_id === projectId && inv.status === 'confirmed')
    const totalAmount = projectInvestments.reduce((sum, inv) => sum + inv.amount, 0)
    // console.log(`项目 ${projectId} 的投资记录:`, projectInvestments)
    // console.log(`项目 ${projectId} 已筹集金额:`, totalAmount)
    return totalAmount
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="bg-white rounded-xl border border-gray-200 p-1 inline-flex">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'all'
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            所有项目
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`px-6 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'my'
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            我的捐赠
          </button>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? '刷新中...' : '刷新数据'}
        </button>
      </div>

      {activeTab === 'all' ? (
        projects.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无投资项目</h3>
            <p className="text-gray-600">当前没有进行中的投资项目</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {projects.map((project) => {
              const actualAmount = calculateProjectAmount(project.id)
              const progress = calculateProgress(actualAmount, project.target_amount)
              const daysLeft = Math.ceil((new Date(project.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

              return (
                <div
                  key={project.id}
                  onClick={() => onProjectSelect(project)}
                  className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer border border-gray-100 hover:border-green-200"
                >
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">{project.title}</h3>
                      <p className="text-gray-600 text-sm line-clamp-2">{project.description}</p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-xl flex items-center justify-center ml-3 sm:ml-4 flex-shrink-0">
                      <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                    </div>
                  </div>

                  <div className="mb-3 sm:mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm text-gray-600">筹款进度</span>
                      <span className="text-xs sm:text-sm font-semibold text-green-600">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 sm:h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2.5 sm:h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-3 sm:mb-4">
                    <div className="bg-green-50 rounded-lg p-2.5 sm:p-3">
                      <div className="flex items-center text-green-700 mb-1">
                        <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                        <span className="text-[10px] sm:text-xs font-medium">已筹集</span>
                      </div>
                      <div className="text-sm sm:text-base font-bold text-green-900 leading-tight">
                        {formatAmount(actualAmount)}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
                      <div className="flex items-center text-gray-700 mb-1">
                        <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                        <span className="text-[10px] sm:text-xs font-medium">目标金额</span>
                      </div>
                      <div className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                        {formatAmount(project.target_amount)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100">
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                      <span className="whitespace-nowrap">
                        {daysLeft > 0 ? `剩余 ${daysLeft} 天` : '已结束'}
                      </span>
                    </div>
                    <button className="flex items-center text-green-600 font-medium text-xs sm:text-sm hover:text-green-700 whitespace-nowrap">
                      立即支持
                      <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        userId ? (
          <MyInvestments userId={userId} />
        ) : (
          <div className="text-center py-12">
            <List className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">请先登录查看投资记录</p>
          </div>
        )
      )}
    </div>
  )
}
