import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Heart, DollarSign, Calendar, Check, X, Eye, ChevronDown, ChevronRight, TrendingUp, Search, Filter } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useModal } from './ModalProvider'
import InvestmentProjectForm from './InvestmentProjectForm'
import { getUserModulePermissions } from '../lib/modulePermissions'
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

interface Investment {
  id: string
  project_id: string
  user_id: string
  amount: number
  payment_proof: string | null
  status: string
  notes: string | null
  created_at: string
  user_profiles?: {
    full_name: string
  }
  investment_projects?: {
    title: string
  }
}

export default function InvestmentAdmin() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<InvestmentProject[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [selectedProject, setSelectedProject] = useState<InvestmentProject | null>(null)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const { confirmDelete, showSuccess, showError } = useModal()
  const [loading, setLoading] = useState(true)
  const [modulePermissions, setModulePermissions] = useState({
    can_create: false,
    can_update: false,
    can_delete: false
  })
  
  // 搜索和筛选状态
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [filteredProjects, setFilteredProjects] = useState<InvestmentProject[]>([])

  useEffect(() => {
    fetchData()
    // 获取模块权限
    if (user?.id) {
      getUserModulePermissions(user.id).then(permissions => {
        setModulePermissions(permissions.investments)
      }).catch(error => {
        console.error('获取模块权限失败:', error)
      })
    }
  }, [user])

  // 筛选项目
  useEffect(() => {
    let filtered = projects

    // 搜索筛选
    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 状态筛选
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter)
    }

    setFilteredProjects(filtered)
  }, [projects, searchTerm, statusFilter])

  const fetchData = async () => {
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from('investment_projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError
      setProjects(projectsData || [])

      const { data: investmentsData, error: investmentsError } = await supabase
        .from('investments')
        .select(`
          *,
          user_profiles!investments_user_id_fkey (
            full_name
          ),
          investment_projects!investments_project_id_fkey (
            title
          )
        `)
        .order('created_at', { ascending: false })

      if (investmentsError) throw investmentsError
      setInvestments(investmentsData || [])
    } catch (error) {
      console.error('获取捐赠数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleProjectExpand = (projectId: string) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
    }
    setExpandedProjects(newExpanded)
  }

  const getProjectInvestments = (projectId: string) => {
    return investments.filter(inv => inv.project_id === projectId)
  }

  const handleDeleteProject = async (projectId: string) => {
    confirmDelete('确定要删除这个捐赠项目吗？', async () => {
      try {
        const { error } = await supabase
          .from('investment_projects')
          .delete()
          .eq('id', projectId)

        if (error) throw error

        setProjects(projects.filter(p => p.id !== projectId))
        showSuccess('捐赠项目删除成功')
      } catch (error) {
        console.error('删除捐赠项目失败:', error)
        showError('删除失败，请重试')
      }
    })
  }

  const handleUpdateInvestmentStatus = async (investmentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('investments')
        .update({ status })
        .eq('id', investmentId)

      if (error) throw error

      setInvestments(investments.map(inv =>
        inv.id === investmentId ? { ...inv, status } : inv
      ))
      showSuccess('状态更新成功')
      fetchData()
    } catch (error) {
      console.error('更新状态失败:', error)
      showError('更新失败，请重试')
    }
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

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }

  // 计算捐赠项目的实际已筹集金额
  const calculateProjectAmount = (projectId: string) => {
    return investments
      .filter(inv => inv.project_id === projectId && inv.status === 'confirmed')
      .reduce((sum, inv) => sum + inv.amount, 0)
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    const labels = {
      active: '进行中',
      completed: '已完成',
      cancelled: '已取消',
      pending: '待确认',
      confirmed: '已确认',
      rejected: '已拒绝'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
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
      <div className="bg-white rounded-3xl shadow-sm p-[5px] lg:p-6 m-0.5 lg:m-0">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Heart className="w-7 h-7 text-red-500 mr-3" />
            捐赠管理
          </h2>
          {modulePermissions.can_create && (
            <button
              onClick={() => {
                setSelectedProject(null)
                setShowProjectForm(true)
              }}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              创建捐赠项目
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            共 {projects.length} 个捐赠项目，{investments.length} 条捐赠记录
            {(searchTerm || statusFilter !== 'all') && (
              <span className="text-blue-600 ml-2">
                (已过滤，共 {filteredProjects.length} 个捐赠项目)
              </span>
            )}
          </div>
          {(() => {
            const totalPending = investments.filter(inv => inv.status === 'pending').length
            return totalPending > 0 ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 animate-pulse">
                {totalPending} 个待确认捐赠
              </span>
            ) : null
          })()}
        </div>

        {/* 搜索和筛选 */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="搜索捐赠项目名称或描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500 appearance-none bg-white"
              >
                <option value="all">所有状态</option>
                <option value="active">进行中</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
          </div>
          
          {/* 清除筛选按钮 - 只在有筛选条件时显示 */}
          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              清除所有筛选
            </button>
          )}
        </div>

        <div className="space-y-2">
          {filteredProjects.map((project) => {
            const actualAmount = calculateProjectAmount(project.id)
            const progress = calculateProgress(actualAmount, project.target_amount)
            const projectInvestments = getProjectInvestments(project.id)
            const pendingInvestments = projectInvestments.filter(inv => inv.status === 'pending')
            const isExpanded = expandedProjects.has(project.id)

            return (
              <div key={project.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div 
                  className="bg-gray-50 p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => toggleProjectExpand(project.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 space-x-4">
                      <div className="text-gray-500">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{project.title}</h3>
                          {getStatusBadge(project.status)}
                          <span className="text-sm text-gray-500">
                            ({projectInvestments.length} 条捐赠)
                          </span>
                          {pendingInvestments.length > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 animate-pulse">
                              {pendingInvestments.length} 待确认
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{project.description}</p>

                        <div className="flex items-center space-x-6 text-sm">
                          <div className="flex items-center text-gray-600">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(project.start_date)} - {formatDate(project.end_date)}
                          </div>
                          <div className="flex items-center text-green-600 font-semibold">
                            <TrendingUp className="w-4 h-4 mr-1" />
                            已筹集: {formatAmount(actualAmount)}
                          </div>
                          <div className="flex items-center text-gray-600">
                            <DollarSign className="w-4 h-4 mr-1" />
                            目标: {formatAmount(project.target_amount)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>进度</span>
                              <span className="font-semibold">{progress.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        {modulePermissions.can_update && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedProject(project)
                              setShowProjectForm(true)
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        )}
                        {modulePermissions.can_delete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteProject(project.id)
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-white border-t border-gray-200">
                    {projectInvestments.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {projectInvestments.map((investment) => (
                          <div key={investment.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <span className="font-semibold text-gray-900">
                                    {investment.user_profiles?.full_name || '未知用户'}
                                  </span>
                                  {getStatusBadge(investment.status)}
                                  <span className="text-lg font-bold text-green-600">
                                    {formatAmount(investment.amount)}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  <span>{formatDateTime(investment.created_at)}</span>
                                  {investment.notes && (
                                    <span className="text-gray-500">备注: {investment.notes}</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                {investment.payment_proof && (
                                  <a
                                    href={investment.payment_proof}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm transition-colors"
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    查看凭证
                                  </a>
                                )}
                                {investment.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateInvestmentStatus(investment.id, 'confirmed')}
                                      className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm transition-colors"
                                    >
                                      <Check className="w-4 h-4 mr-1" />
                                      确认
                                    </button>
                                    <button
                                      onClick={() => handleUpdateInvestmentStatus(investment.id, 'rejected')}
                                      className="flex items-center px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm transition-colors"
                                    >
                                      <X className="w-4 h-4 mr-1" />
                                      拒绝
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p>该捐赠项目暂无捐赠记录</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">还没有创建捐赠项目</p>
          </div>
        )}
      </div>

      {showProjectForm && (
        <InvestmentProjectForm
          project={selectedProject}
          onClose={() => {
            setShowProjectForm(false)
            setSelectedProject(null)
          }}
          onSuccess={fetchData}
        />
      )}
    </div>
  )
}
