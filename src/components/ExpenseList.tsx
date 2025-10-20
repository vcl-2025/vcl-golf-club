import React, { useState, useEffect } from 'react'
import { DollarSign, Calendar, Receipt, TrendingDown, FileText, Filter } from 'lucide-react'
import { supabase } from '../lib/supabase'
import UnifiedSearch from './UnifiedSearch'

interface Expense {
  id: string
  expense_type: string
  title: string
  amount: number
  expense_date: string
  payment_method: string
  receipt_url: string | null
  notes: string | null
  status: string
  created_at: string
}

export default function ExpenseList() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterMonth, setFilterMonth] = useState<string>('all')
  
  // 统一搜索状态
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')

  useEffect(() => {
    fetchExpenses()
  }, [])

  // 筛选费用记录
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const expenseDate = new Date(expense.expense_date)
    const matchesYear = !selectedYear || expenseDate.getFullYear().toString() === selectedYear
    const matchesMonth = !selectedMonth || (expenseDate.getMonth() + 1).toString() === selectedMonth
    const matchesType = filterType === 'all' || expense.expense_type === filterType
    
    // 调试筛选逻辑
    if (filterType !== 'all') {
      // console.log('筛选调试:', {
      //   filterType,
      //   expenseType: expense.expense_type,
      //   matchesType,
      //   expenseTitle: expense.title,
      //   allMatches: matchesSearch && matchesYear && matchesMonth && matchesType
      // })
    }
    
    return matchesSearch && matchesYear && matchesMonth && matchesType
  })

  // 获取可用年份
  const availableYears = [...new Set(expenses.map(e => new Date(e.expense_date).getFullYear()))].sort((a, b) => b - a)

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('status', 'paid')
        .order('expense_date', { ascending: false })

      if (error) throw error
      // console.log('费用数据:', data)
      if (data && data.length > 0) {
        // console.log('第一个费用记录:', data[0])
        // console.log('所有字段名:', Object.keys(data[0]))
        // console.log('费用类型字段:', data[0].type)
        // console.log('可能的类型字段:', data[0].category || data[0].expense_type || data[0].type)
      }
      setExpenses(data || [])
    } catch (error) {
      console.error('获取费用记录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getExpenseTypeText = (type: string) => {
    switch (type) {
      case 'equipment': return '设备采购'
      case 'maintenance': return '场地维护'
      case 'activity': return '活动支出'
      case 'salary': return '人员工资'
      case 'other': return '其他费用'
      default: return type
    }
  }

  const getExpenseTypeColor = (type: string) => {
    switch (type) {
      case 'equipment': return 'bg-blue-100 text-blue-800'
      case 'maintenance': return 'bg-green-100 text-green-800'
      case 'activity': return 'bg-purple-100 text-purple-800'
      case 'salary': return 'bg-orange-100 text-orange-800'
      case 'other': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
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

  // 合并所有筛选条件
  const finalFilteredExpenses = filteredExpenses.filter(expense => {
    if (filterType !== 'all' && expense.expense_type !== filterType) {
      return false
    }
    if (filterMonth !== 'all') {
      const expenseMonth = new Date(expense.expense_date).getMonth()
      if (expenseMonth !== parseInt(filterMonth)) {
        return false
      }
    }
    return true
  })

  const totalAmount = finalFilteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0)

  const expensesByType = finalFilteredExpenses.reduce((acc, expense) => {
    const type = expense.expense_type
    acc[type] = (acc[type] || 0) + parseFloat(expense.amount.toString())
    return acc
  }, {} as Record<string, number>)

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">费用公示</h2>
            <p className="text-green-100">俱乐部财务透明公开</p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
            <Receipt className="w-8 h-8" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center text-green-100 mb-1">
              <TrendingDown className="w-4 h-4 mr-2" />
              <span className="text-sm">总支出</span>
            </div>
            <div className="text-3xl font-bold">{formatAmount(totalAmount)}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center text-green-100 mb-1">
              <FileText className="w-4 h-4 mr-2" />
              <span className="text-sm">记录数</span>
            </div>
            <div className="text-3xl font-bold">{finalFilteredExpenses.length}</div>
          </div>
        </div>
      </div>

      {/* 统一搜索组件 */}
      <UnifiedSearch
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        availableYears={availableYears}
        placeholder="按费用名称或备注搜索..."
        showLocationFilter={false}
        showExpenseTypeFilter={true}
        selectedExpenseType={filterType}
        onExpenseTypeChange={setFilterType}
        onClearFilters={() => {
          setSearchTerm('')
          setSelectedYear('')
          setSelectedMonth('')
          setFilterType('all')
        }}
      />

      {Object.keys(expensesByType).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">支出分类统计</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(expensesByType).map(([type, amount]) => (
              <div key={type} className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs text-gray-600 mb-1">{getExpenseTypeText(type)}</div>
                <div className="text-lg font-bold text-gray-900">{formatAmount(amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {finalFilteredExpenses.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          {expenses.length === 0 ? (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无费用记录</h3>
              <p className="text-gray-600">当前没有费用记录</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">未找到匹配的记录</h3>
              <p className="text-gray-600">请尝试调整搜索条件或清除筛选器</p>
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedYear('')
                  setSelectedMonth('')
                }}
                className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                清除筛选器
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {finalFilteredExpenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getExpenseTypeColor(expense.expense_type)}`}>
                      {getExpenseTypeText(expense.expense_type)}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getPaymentMethodText(expense.payment_method)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{expense.title}</h3>
                  {expense.notes && (
                    <p className="text-sm text-gray-600">{expense.notes}</p>
                  )}
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  <div className="text-2xl font-bold text-red-600">
                    {formatAmount(parseFloat(expense.amount.toString()))}
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
                    className="flex items-center text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    <Receipt className="w-4 h-4 mr-1" />
                    查看凭证
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
