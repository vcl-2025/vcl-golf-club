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
      // 避免时区问题：直接解析日期字符串，不使用 Date 对象
      const dateStr = expense.expense_date.split('T')[0] // 只取日期部分
      const [year, month] = dateStr.split('-')
      const key = `${year}年${parseInt(month)}月`
      
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(expense)
    })
    
    // 对每个月份内的记录按日期倒序排列（避免时区问题）
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => {
        // 直接比较日期字符串，避免时区转换
        const dateA = a.expense_date.split('T')[0]
        const dateB = b.expense_date.split('T')[0]
        return dateB.localeCompare(dateA)
      })
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
    // 收入大类
    const incomeTypes: { [key: string]: string } = {
      // 新大类
      'membership_income': '会员收入',
      'sponsorship_support': '赞助与支持',
      'activity_related_income': '活动相关收入',
      'investment_income': '投资收益',
      'other_income': '其他收入',
      // 旧大类（兼容，映射到新大类）
      'membership_sponsorship': '会员收入',
      'collection': '活动相关收入',
      'investment_finance': '投资收益',
      // 旧具体分类（兼容，映射到对应大类）
      'membership_fee': '会员收入',
      'sponsorship_fee': '赞助与支持',
      'collected_competition_ball_fee': '活动相关收入',
      'collected_handicap_fee': '活动相关收入',
      'collected_meal_fee': '活动相关收入',
      'interest_income': '投资收益',
      'gic_redemption': '投资收益',
      'other': '其他收入'
    }
    
    // 支出大类
    const expenseTypes: { [key: string]: string } = {
      // 新大类
      'activity_expense': '活动支出',
      'investment_savings': '投资与储蓄',
      'operating_expense': '运营支出',
      'other_expense': '其它支出',
      // 旧大类（兼容，映射到新大类）
      'event_activity': '活动支出',
      'payment_on_behalf': '活动支出',
      'finance_deposit': '投资与储蓄',
      'other_misc': '其它支出',
      // 旧具体分类（兼容，映射到对应大类）
      'competition_prizes_misc': '活动支出',
      'event_meal_beverage': '活动支出',
      'paid_competition_fee': '活动支出',
      'paid_handicap_fee': '活动支出',
      'photographer_fee': '活动支出',
      'refund': '活动支出',
      'gic_deposit': '投资与储蓄',
      'bank_fee': '运营支出',
      'other': '其它支出',
      // 最旧分类（兼容）
      'equipment': '其它支出',
      'maintenance': '其它支出',
      'activity': '活动支出',
      'salary': '其它支出'
    }
    
    return incomeTypes[type] || expenseTypes[type] || type
  }

  const getExpenseTypeColor = (type: string, transactionType: string | null) => {
    // 收入大类颜色 - 使用柔绿色 (#4CAF50)
    const incomeColors: { [key: string]: string } = {
      'membership_income': 'bg-[#4CAF50]/20 text-[#4CAF50]',
      'sponsorship_support': 'bg-[#4CAF50]/20 text-[#4CAF50]',
      'activity_related_income': 'bg-[#4CAF50]/20 text-[#4CAF50]',
      'investment_income': 'bg-[#4CAF50]/20 text-[#4CAF50]',
      'other_income': 'bg-[#4CAF50]/20 text-[#4CAF50]',
      // 旧大类（兼容）
      'membership_sponsorship': 'bg-[#4CAF50]/20 text-[#4CAF50]',
      'collection': 'bg-[#4CAF50]/20 text-[#4CAF50]',
      'investment_finance': 'bg-[#4CAF50]/20 text-[#4CAF50]',
      // 旧具体分类（兼容）
      'membership_fee': 'bg-[#4CAF50]/20 text-[#4CAF50]',
      'sponsorship_fee': 'bg-[#4CAF50]/20 text-[#4CAF50]',
      'collected_competition_ball_fee': 'bg-[#4CAF50]/20 text-[#4CAF50]',
      'collected_handicap_fee': 'bg-[#4CAF50]/20 text-[#4CAF50]',
      'collected_meal_fee': 'bg-[#4CAF50]/20 text-[#4CAF50]',
      'interest_income': 'bg-[#4CAF50]/20 text-[#4CAF50]',
      'gic_redemption': 'bg-[#4CAF50]/20 text-[#4CAF50]',
      'other': 'bg-[#4CAF50]/20 text-[#4CAF50]'
    }
    
    // 支出大类颜色 - 使用柔粉红色 (#E57373)
    const expenseColors: { [key: string]: string } = {
      'activity_expense': 'bg-[#E57373]/20 text-[#E57373]',
      'investment_savings': 'bg-[#8E44AD]/20 text-[#8E44AD]',
      'operating_expense': 'bg-[#E57373]/20 text-[#E57373]',
      'other_expense': 'bg-[#E57373]/20 text-[#E57373]',
      // 旧大类（兼容）
      'event_activity': 'bg-[#E57373]/20 text-[#E57373]',
      'payment_on_behalf': 'bg-[#E57373]/20 text-[#E57373]',
      'finance_deposit': 'bg-[#8E44AD]/20 text-[#8E44AD]',
      'other_misc': 'bg-[#E57373]/20 text-[#E57373]',
      // 旧具体分类（兼容）
      'competition_prizes_misc': 'bg-[#E57373]/20 text-[#E57373]',
      'event_meal_beverage': 'bg-[#E57373]/20 text-[#E57373]',
      'paid_competition_fee': 'bg-[#E57373]/20 text-[#E57373]',
      'paid_handicap_fee': 'bg-[#E57373]/20 text-[#E57373]',
      'photographer_fee': 'bg-[#E57373]/20 text-[#E57373]',
      'refund': 'bg-[#E57373]/20 text-[#E57373]',
      'gic_deposit': 'bg-[#8E44AD]/20 text-[#8E44AD]',
      'bank_fee': 'bg-[#E57373]/20 text-[#E57373]',
      'other': 'bg-[#E57373]/20 text-[#E57373]',
      // 最旧分类（兼容）
      'equipment': 'bg-[#E57373]/20 text-[#E57373]',
      'maintenance': 'bg-[#E57373]/20 text-[#E57373]',
      'activity': 'bg-[#E57373]/20 text-[#E57373]',
      'salary': 'bg-[#E57373]/20 text-[#E57373]'
    }
    
    if (transactionType === 'income') {
      return incomeColors[type] || 'bg-[#4CAF50]/20 text-[#4CAF50]'
    }
    return expenseColors[type] || 'bg-[#E57373]/20 text-[#E57373]'
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
    // 避免时区问题：直接解析日期字符串的年月日，不使用 Date 对象解析
    // 这样可以避免 UTC 时区转换导致的日期偏移（如 2025-07-31 变成 2025-07-30）
    if (dateString) {
      // 提取日期部分（去掉时间部分）
      const dateOnly = dateString.split('T')[0].split(' ')[0]
      const [year, month, day] = dateOnly.split('-')
      
      if (year && month && day) {
        // 使用本地时间构造 Date 对象，避免时区转换
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        return date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }
    }
    // 如果解析失败，使用原来的方式（但可能会有时区问题）
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
        <div className="w-8 h-8 border-4 border-[#4CAF50] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="bg-gradient-to-br from-[#4CAF50]/10 to-[#4CAF50]/5 rounded-2xl p-3 sm:p-4 border border-[#4CAF50]/20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white rounded-xl p-2 sm:p-4 border border-gray-200">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">总收入</div>
            <div className="text-lg sm:text-xl font-bold text-[#4CAF50]">{formatAmount(totalStats.income)}</div>
          </div>
          <div className="bg-white rounded-xl p-2 sm:p-4 border border-gray-200">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">总支出</div>
            <div className="text-lg sm:text-xl font-bold text-[#E57373]">{formatAmount(totalStats.expense)}</div>
          </div>
          <div className="bg-white rounded-xl p-2 sm:p-4 border border-gray-200">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">净额</div>
            <div className={`text-lg sm:text-xl font-bold ${totalStats.net >= 0 ? 'text-[#4CAF50]' : 'text-[#E57373]'}`}>
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
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50] focus:border-[#4CAF50]"
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50] focus:border-[#4CAF50]"
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
                          <TrendingUp className="w-4 h-4 text-[#4CAF50]" />
                          <span className="text-gray-600">收入:</span>
                          <span className="font-semibold text-[#4CAF50]">{formatAmount(stats.income)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-[#E57373]" />
                          <span className="text-gray-600">支出:</span>
                          <span className="font-semibold text-[#E57373]">{formatAmount(stats.expense)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-600" />
                          <span className="text-gray-600">净额:</span>
                          <span className={`font-semibold ${stats.net >= 0 ? 'text-[#4CAF50]' : 'text-[#E57373]'}`}>
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
                  <div onClick={(e) => e.stopPropagation()}>
                  {/* 小屏幕：单列显示 */}
                  <div className="lg:hidden space-y-3">
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
                                isIncome ? 'bg-[#4CAF50]/20 text-[#4CAF50]' : 'bg-[#E57373]/20 text-[#E57373]'
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
                              <div className={`text-lg font-bold ${isIncome ? 'text-[#4CAF50]' : 'text-[#E57373]'}`}>
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
                                className="flex items-center text-sm text-[#4CAF50] hover:text-[#4CAF50]/80 font-medium"
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

                  {/* 大屏幕：左右分栏显示（左边支出，右边收入） */}
                  <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6">
                    {/* 左边：支出 */}
                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold text-[#E57373] mb-3 flex items-center gap-2">
                        <TrendingDown className="w-5 h-5" />
                        支出
                      </h4>
                      {monthExpenses
                        .filter(e => e.transaction_type !== 'income')
                        .map((expense) => (
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
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#E57373]/20 text-[#E57373]">
                                    支出
                                  </span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">{expense.title}</h3>
                                {expense.notes && (
                                  <p className="text-sm text-gray-600">{expense.notes}</p>
                                )}
                              </div>
                              <div className="text-right ml-4 flex-shrink-0">
                                <div className="text-lg font-bold text-[#E57373]">
                                  -{formatAmount(parseFloat(expense.amount.toString()))}
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
                                  className="flex items-center text-sm text-[#4CAF50] hover:text-[#4CAF50]/80 font-medium"
                                >
                                  <Receipt className="w-4 h-4 mr-1" />
                                  查看凭证
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      {monthExpenses.filter(e => e.transaction_type !== 'income').length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                          <TrendingDown className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">本月无支出记录</p>
                        </div>
                      )}
                    </div>

                    {/* 右边：收入 */}
                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold text-[#4CAF50] mb-3 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        收入
                      </h4>
                      {monthExpenses
                        .filter(e => e.transaction_type === 'income')
                        .map((expense) => (
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
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#4CAF50]/20 text-[#4CAF50]">
                                    收入
                                  </span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">{expense.title}</h3>
                                {expense.notes && (
                                  <p className="text-sm text-gray-600">{expense.notes}</p>
                                )}
                              </div>
                              <div className="text-right ml-4 flex-shrink-0">
                                <div className="text-lg font-bold text-[#4CAF50]">
                                  +{formatAmount(parseFloat(expense.amount.toString()))}
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
                                  className="flex items-center text-sm text-[#4CAF50] hover:text-[#4CAF50]/80 font-medium"
                                >
                                  <Receipt className="w-4 h-4 mr-1" />
                                  查看凭证
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      {monthExpenses.filter(e => e.transaction_type === 'income').length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">本月无收入记录</p>
                        </div>
                      )}
                    </div>
                  </div>
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

