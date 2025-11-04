import React, { useState, useEffect, useMemo } from 'react'
import { DollarSign, Calendar, Receipt, TrendingDown, FileText, Search, TrendingUp, ChevronDown, ChevronUp, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Expense {
  id: string
  expense_type: string
  transaction_type: string | null
  title: string
  amount: number
  expense_date: string
  payment_method: string
  receipt_url: string | null
  notes: string | null
  status: string
  created_at: string
}

interface GroupedExpenses {
  [key: string]: Expense[]  // key格式: "2025年5月"
}

export default function ExpenseList() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())
  const [searchExpanded, setSearchExpanded] = useState(false)

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('status', 'paid')
        .order('expense_date', { ascending: false })

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error('获取费用记录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 筛选费用记录（只根据搜索词）
  const filteredExpenses = useMemo(() => {
    if (!searchTerm.trim()) return expenses
    
    const term = searchTerm.toLowerCase()
    return expenses.filter(expense => 
      expense.title.toLowerCase().includes(term) ||
      expense.notes?.toLowerCase().includes(term)
    )
  }, [expenses, searchTerm])

  // 按年月分组
  const groupedExpenses = useMemo(() => {
    const grouped: GroupedExpenses = {}
    
    filteredExpenses.forEach(expense => {
      const date = new Date(expense.expense_date)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const key = `${year}年${month}月`
      
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(expense)
    })
    
    // 对每个月份内的记录按日期倒序排列
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => 
        new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
      )
    })
    
    return grouped
  }, [filteredExpenses])

  // 获取所有月份，按时间倒序
  const sortedMonths = useMemo(() => {
    return Object.keys(groupedExpenses).sort((a, b) => {
      const [yearA, monthA] = a.split('年').map(v => parseInt(v.replace('月', '')))
      const [yearB, monthB] = b.split('年').map(v => parseInt(v.replace('月', '')))
      if (yearA !== yearB) return yearB - yearA
      return monthB - monthA
    })
  }, [groupedExpenses])

  // 计算每个月的收入和支出
  const calculateMonthStats = (monthExpenses: Expense[]) => {
    const income = monthExpenses
      .filter(e => e.transaction_type === 'income')
      .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
    const expense = monthExpenses
      .filter(e => e.transaction_type === 'expense' || !e.transaction_type)
      .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
    return { income, expense, net: income - expense }
  }

  const getExpenseTypeText = (type: string) => {
    // 新收入分类（4个大类）
    const incomeTypes: { [key: string]: string } = {
      'membership_sponsorship': '会费及赞助类',
      'collection': '代收类',
      'investment_finance': '投资及理财类',
      'other_income': '其他杂项',
      // 旧分类
      'membership_fee': '会费',
      'sponsorship_fee': '赞助费',
      'collected_competition_ball_fee': '代收比赛球费',
      'collected_handicap_fee': '代收差点费',
      'interest_income': '利息收入',
      'collected_meal_fee': '代收餐费',
      'gic_redemption': 'GIC 赎回',
      'other': '其他'
    }
    
    // 新支出分类（4个大类）
    const expenseTypes: { [key: string]: string } = {
      'event_activity': '赛事与活动支出',
      'payment_on_behalf': '代付类',
      'finance_deposit': '理财存款',
      'other_misc': '其他杂费',
      // 旧分类
      'competition_prizes_misc': '比赛奖品及杂费',
      'event_meal_beverage': '活动餐费及酒水',
      'photographer_fee': '摄影师费用',
      'paid_handicap_fee': '代付差点费',
      'gic_deposit': '存GIC',
      'bank_fee': '银行费',
      'paid_competition_fee': '代付比赛费用',
      'refund': '退费',
      // 最旧分类
      'equipment': '设备采购',
      'maintenance': '场地维护',
      'activity': '活动支出',
      'salary': '人员工资'
    }
    
    return incomeTypes[type] || expenseTypes[type] || type
  }

  const getExpenseTypeColor = (type: string, transactionType: string | null) => {
    // 收入类型颜色
    const incomeColors: { [key: string]: string } = {
      'membership_sponsorship': 'bg-[#F15B98]/20 text-[#F15B98]',
      'collection': 'bg-[#F15B98]/20 text-[#F15B98]',
      'investment_finance': 'bg-[#F15B98]/20 text-[#F15B98]',
      'other_income': 'bg-[#F15B98]/20 text-[#F15B98]'
    }
    
    // 支出类型颜色
    const expenseColors: { [key: string]: string } = {
      'event_activity': 'bg-red-100 text-red-800',
      'payment_on_behalf': 'bg-orange-100 text-orange-800',
      'finance_deposit': 'bg-purple-100 text-purple-800',
      'other_misc': 'bg-gray-100 text-gray-800'
    }
    
    if (transactionType === 'income') {
      return incomeColors[type] || 'bg-[#F15B98]/20 text-[#F15B98]'
    }
    return expenseColors[type] || 'bg-red-100 text-red-800'
  }

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return '现金'
      case 'transfer': return '转账'
      case 'check': return '支票'
      default: return method
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // 计算总计
  const totalStats = useMemo(() => {
    const income = filteredExpenses
      .filter(e => e.transaction_type === 'income')
      .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
    const expense = filteredExpenses
      .filter(e => e.transaction_type === 'expense' || !e.transaction_type)
      .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
    return { income, expense, net: income - expense }
  }, [filteredExpenses])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-[#F15B98] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="bg-gradient-to-br from-[#F15B98]/10 to-[#F15B98]/5 rounded-2xl p-3 sm:p-4 border border-[#F15B98]/20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white rounded-xl p-2 sm:p-4 border border-gray-200">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">总收入</div>
            <div className="text-lg sm:text-xl font-bold text-[#F15B98]">{formatAmount(totalStats.income)}</div>
          </div>
          <div className="bg-white rounded-xl p-2 sm:p-4 border border-gray-200">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">总支出</div>
            <div className="text-lg sm:text-xl font-bold text-red-600">{formatAmount(totalStats.expense)}</div>
          </div>
          <div className="bg-white rounded-xl p-2 sm:p-4 border border-gray-200">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">净额</div>
            <div className={`text-lg sm:text-xl font-bold ${totalStats.net >= 0 ? 'text-[#F15B98]' : 'text-red-600'}`}>
              {formatAmount(totalStats.net)}
            </div>
          </div>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 手机端：显示搜索按钮，默认折叠 */}
        <div className="sm:hidden">
          {!searchExpanded ? (
            <button
              onClick={() => setSearchExpanded(true)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 text-gray-600">
                <Search className="w-5 h-5" />
                <span>搜索费用名称或备注...</span>
              </div>
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </button>
          ) : (
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索费用名称或备注..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-[#F15B98]"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setSearchExpanded(false)
                    setSearchTerm('')
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* 桌面端：始终显示 */}
        <div className="hidden sm:block p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索费用名称或备注..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-[#F15B98]"
            />
          </div>
        </div>
      </div>

      {/* 按年月分组显示 */}
      {sortedMonths.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无费用记录</h3>
          <p className="text-gray-600">当前没有费用记录</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedMonths.map(monthKey => {
            const monthExpenses = groupedExpenses[monthKey]
            const stats = calculateMonthStats(monthExpenses)
            const isExpanded = !collapsedMonths.has(monthKey)
            
            return (
              <div key={monthKey} className="space-y-4">
                {/* 月份标题和统计 */}
                <div className={`rounded-xl border shadow-lg p-4 cursor-pointer transition-all duration-200 ${
                  isExpanded 
                    ? 'bg-gradient-to-r from-slate-100 to-gray-100 border-slate-300 hover:from-slate-200 hover:to-gray-200' 
                    : 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200 hover:from-slate-100 hover:to-gray-100 hover:border-slate-300'
                }`}
                  onClick={() => {
                    const newCollapsed = new Set(collapsedMonths)
                    if (newCollapsed.has(monthKey)) {
                      newCollapsed.delete(monthKey)
                    } else {
                      newCollapsed.add(monthKey)
                    }
                    setCollapsedMonths(newCollapsed)
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">{monthKey}</h3>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-[#F15B98]" />
                          <span className="text-gray-600">收入:</span>
                          <span className="font-semibold text-[#F15B98]">{formatAmount(stats.income)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-red-600" />
                          <span className="text-gray-600">支出:</span>
                          <span className="font-semibold text-red-600">{formatAmount(stats.expense)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-600" />
                          <span className="text-gray-600">净额:</span>
                          <span className={`font-semibold ${stats.net >= 0 ? 'text-[#F15B98]' : 'text-red-600'}`}>
                            {formatAmount(stats.net)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {collapsedMonths.has(monthKey) ? (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronUp className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 该月的费用列表 */}
                {!collapsedMonths.has(monthKey) && (
                <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                  {monthExpenses.map((expense) => {
                    const isIncome = expense.transaction_type === 'income'
                    
                    return (
                      <div
                        key={expense.id}
                        className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getExpenseTypeColor(expense.expense_type, expense.transaction_type)}`}>
                                {getExpenseTypeText(expense.expense_type)}
                              </span>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                isIncome ? 'bg-[#F15B98]/20 text-[#F15B98]' : 'bg-red-100 text-red-800'
                              }`}>
                                {isIncome ? '收入' : '支出'}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{expense.title}</h3>
                            {expense.notes && (
                              <p className="text-sm text-gray-600">{expense.notes}</p>
                            )}
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <div className={`text-2xl font-bold ${isIncome ? 'text-[#F15B98]' : 'text-red-600'}`}>
                              {isIncome ? '+' : '-'}{formatAmount(parseFloat(expense.amount.toString()))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span>{formatDate(expense.expense_date)}</span>
                          </div>
                          {expense.receipt_url && (
                            <a
                              href={expense.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-sm text-[#F15B98] hover:text-[#F15B98]/80 font-medium"
                            >
                              <Receipt className="w-4 h-4 mr-1" />
                              查看凭证
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

