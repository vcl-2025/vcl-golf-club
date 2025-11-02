import React, { useState, useEffect, useRef } from 'react'
import { Plus, Edit, Trash2, Receipt, Calendar, DollarSign, Upload, X, Check, FileImage, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useModal } from './ModalProvider'

interface Expense {
  id: string
  expense_type: string
  transaction_type: string
  title: string
  amount: number
  expense_date: string
  payment_method: string
  receipt_url: string | null
  notes: string | null
  status: string
  created_at: string
}

interface ExpenseFormData {
  expense_type: string
  transaction_type: string
  title: string
  amount: string
  expense_date: string
  payment_method: string
  receipt_url: string
  notes: string
  status: string
}

interface UploadedFile {
  name: string
  url: string
}

export default function ExpenseAdmin() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [uploading, setUploading] = useState(false)
  const { confirmDelete, showSuccess, showError, showWarning } = useModal()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 凭证查看modal状态
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [receiptUrls, setReceiptUrls] = useState<string[]>([])
  const [currentReceiptIndex, setCurrentReceiptIndex] = useState(0)

  // 键盘事件处理（用于凭证modal中切换图片）
  useEffect(() => {
    if (!receiptModalOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentReceiptIndex > 0) {
        setCurrentReceiptIndex(currentReceiptIndex - 1)
      } else if (e.key === 'ArrowRight' && currentReceiptIndex < receiptUrls.length - 1) {
        setCurrentReceiptIndex(currentReceiptIndex + 1)
      } else if (e.key === 'Escape') {
        setReceiptModalOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [receiptModalOpen, currentReceiptIndex, receiptUrls.length])
  
  // 搜索和筛选状态
  const [searchTerm, setSearchTerm] = useState('')
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('all') // 交易类型筛选：all/income/expense
  const [typeFilter, setTypeFilter] = useState('all') // 费用类型筛选
  const [yearFilter, setYearFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [availableYears, setAvailableYears] = useState<number[]>([])
  
  // 排序状态
  const [sortField, setSortField] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // 用于追踪交易类型变化，避免编辑时清空费用类型
  const prevTransactionTypeRef = useRef<string>('')

  const [formData, setFormData] = useState<ExpenseFormData>({
    expense_type: '',
    transaction_type: '',
    title: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'transfer',
    receipt_url: '',
    notes: '',
    status: 'paid'
  })

  useEffect(() => {
    fetchExpenses()
  }, [])

  // 当交易类型改变时，清空费用类型（只在用户主动改变时，不在编辑加载数据时）
  useEffect(() => {
    if (showForm && formData.transaction_type && prevTransactionTypeRef.current && 
        prevTransactionTypeRef.current !== formData.transaction_type && !editingExpense) {
      setFormData(prev => ({ ...prev, expense_type: '' }))
    }
    if (formData.transaction_type) {
      prevTransactionTypeRef.current = formData.transaction_type
    }
  }, [formData.transaction_type, showForm, editingExpense])

  // 当交易类型筛选改变时，如果费用类型不匹配，则重置费用类型筛选
  useEffect(() => {
    if (transactionTypeFilter === 'income' && typeFilter !== 'all') {
      // 检查当前选择的费用类型是否是收入类型（新分类 + 旧分类兼容）
      const incomeTypes = ['membership_sponsorship', 'collection', 'investment_finance', 'other_income', 
                          'membership_fee', 'sponsorship_fee', 'collected_competition_ball_fee', 'collected_handicap_fee', 
                          'interest_income', 'collected_meal_fee', 'gic_redemption', 'other']
      if (!incomeTypes.includes(typeFilter)) {
        setTypeFilter('all')
      }
    } else if (transactionTypeFilter === 'expense' && typeFilter !== 'all') {
      // 检查当前选择的费用类型是否是支出类型（新分类 + 旧分类兼容）
      const expenseTypes = ['event_activity', 'payment_on_behalf', 'finance_deposit', 'other_misc',
                           'competition_prizes_misc', 'event_meal_beverage', 'photographer_fee', 'paid_handicap_fee', 
                           'gic_deposit', 'bank_fee', 'paid_competition_fee', 'refund']
      if (!expenseTypes.includes(typeFilter)) {
        setTypeFilter('all')
      }
    }
  }, [transactionTypeFilter, typeFilter])

  // 获取可用年份
  useEffect(() => {
    if (expenses.length > 0) {
      const years = [...new Set(expenses.map(expense => 
        new Date(expense.expense_date).getFullYear()
      ))].sort((a, b) => b - a)
      setAvailableYears(years)
    }
  }, [expenses])

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error('获取费用记录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const expenseData = {
        expense_type: formData.expense_type,
        transaction_type: formData.transaction_type,
        title: formData.title,
        amount: parseFloat(formData.amount),
        expense_date: formData.expense_date,
        payment_method: formData.payment_method,
        receipt_url: formData.receipt_url || null,
        notes: formData.notes || null,
        status: formData.status
      }

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id)

        if (error) throw error
        showSuccess('费用记录已更新！')
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert([expenseData])

        if (error) throw error
        showSuccess('费用记录已添加！')
      }

      setShowForm(false)
      setEditingExpense(null)
      resetForm()
      fetchExpenses()
    } catch (error: any) {
      console.error('保存费用记录失败:', error)
      const errorMessage = error?.message || error?.error?.message || '保存失败，请重试'
      showError(`保存失败: ${errorMessage}`)
    }
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    
    // 检查是否是旧分类值，如果是则需要用户重新选择
    const oldTypes = ['equipment', 'maintenance', 'activity', 'salary', 'other']
    const isOldType = oldTypes.includes(expense.expense_type)
    
    const transactionType = expense.transaction_type || 'expense'
    
    // 先设置ref，避免useEffect清空费用类型
    prevTransactionTypeRef.current = transactionType
    
    setFormData({
      expense_type: isOldType ? '' : expense.expense_type, // 旧分类清空，让用户重新选择
      transaction_type: transactionType,
      title: expense.title,
      amount: expense.amount.toString(),
      expense_date: expense.expense_date,
      payment_method: expense.payment_method,
      receipt_url: expense.receipt_url || '',
      notes: expense.notes || '',
      status: expense.status
    })
    
    // 如果是旧分类，提示用户需要更新
    if (isOldType) {
      showWarning('此记录使用了旧的分类，请重新选择费用类型')
    }

    if (expense.receipt_url) {
      const urls = expense.receipt_url.split(',')
      const files = urls.map((url, index) => ({
        name: `凭证 ${index + 1}`,
        url: url.trim()
      }))
      setUploadedFiles(files)
    } else {
      setUploadedFiles([])
    }

    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    confirmDelete('确定要删除这条费用记录吗？', async () => {
      try {
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', id)

        if (error) throw error
        showSuccess('费用记录已删除')
        fetchExpenses()
      } catch (error) {
        console.error('删除失败:', error)
        showError('删除失败，请重试')
      }
    })
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    try {
      setUploading(true)
      const newUploadedFiles: UploadedFile[] = []
      const errors: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        // console.log('正在上传文件:', file.name, '大小:', file.size, '类型:', file.type)

        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `receipts/${fileName}`

        // console.log('上传路径:', filePath)

        const { data, error: uploadError } = await supabase.storage
          .from('golf-club-images')
          .upload(`expenses/${filePath}`, file)

        if (uploadError) {
          console.error(`上传 ${file.name} 失败:`, uploadError)
          errors.push(`${file.name}: ${uploadError.message}`)
          continue
        }

        // console.log('上传成功:', data)

        const { data: { publicUrl } } = supabase.storage
          .from('golf-club-images')
          .getPublicUrl(`expenses/${filePath}`)

        // console.log('公开URL:', publicUrl)

        newUploadedFiles.push({
          name: file.name,
          url: publicUrl
        })
      }

      setUploadedFiles([...uploadedFiles, ...newUploadedFiles])

      if (newUploadedFiles.length > 0) {
        const allUrls = [...uploadedFiles, ...newUploadedFiles].map(f => f.url).join(',')
        setFormData({ ...formData, receipt_url: allUrls })
      }

      if (errors.length > 0) {
        showWarning(`部分文件上传失败:\n${errors.join('\n')}\n\n成功上传 ${newUploadedFiles.length} 个文件`)
      } else if (newUploadedFiles.length > 0) {
        showSuccess(`成功上传 ${newUploadedFiles.length} 个文件！`)
      } else {
        showWarning('没有文件被上传。请查看控制台了解详细错误信息。')
      }
    } catch (error) {
      console.error('上传失败:', error)
      showError(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index)
    setUploadedFiles(newFiles)
    const newUrls = newFiles.map(f => f.url).join(',')
    setFormData({ ...formData, receipt_url: newUrls })
  }

  const resetForm = () => {
    setFormData({
      expense_type: '',
      transaction_type: '',
      title: '',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: 'transfer',
      receipt_url: '',
      notes: '',
      status: 'paid'
    })
    setUploadedFiles([])
  }

  const getExpenseTypeText = (type: string) => {
    // 收入分类（新版本：4个大类）
    const incomeTypes: { [key: string]: string } = {
      'membership_sponsorship': '会费及赞助类',
      'collection': '代收类',
      'investment_finance': '投资及理财类',
      'other_income': '其他杂项',
      // 保留旧分类用于兼容
      'membership_fee': '会费',
      'sponsorship_fee': '赞助费',
      'collected_competition_ball_fee': '代收比赛球费',
      'collected_handicap_fee': '代收差点费',
      'interest_income': '利息收入',
      'collected_meal_fee': '代收餐费',
      'gic_redemption': 'GIC 赎回',
      'other': '其他'
    }
    
    // 支出分类（新版本：4个大类）
    const expenseTypes: { [key: string]: string } = {
      'event_activity': '赛事与活动支出',
      'payment_on_behalf': '代付类',
      'finance_deposit': '理财存款',
      'other_misc': '其他杂费',
      // 保留旧分类用于兼容
      'competition_prizes_misc': '比赛奖品及杂费',
      'event_meal_beverage': '活动餐费及酒水',
      'photographer_fee': '摄影师费用',
      'paid_handicap_fee': '代付差点费',
      'gic_deposit': '存GIC',
      'bank_fee': '银行费',
      'paid_competition_fee': '代付比赛费用 (含联赛及Zone4 费用)',
      'refund': '退费'
    }
    
    // 旧分类映射（用于兼容旧数据）
    const oldTypes: { [key: string]: string } = {
      'equipment': '设备采购（旧分类）',
      'maintenance': '场地维护（旧分类）',
      'activity': '活动支出（旧分类）',
      'salary': '人员工资（旧分类）'
    }
    
    return incomeTypes[type] || expenseTypes[type] || oldTypes[type] || type
  }

  const getExpenseTypeColor = (type: string) => {
    // 收入分类颜色（新版本：4个大类）
    const incomeColors: { [key: string]: string } = {
      'membership_sponsorship': 'bg-green-100 text-green-800',
      'collection': 'bg-blue-100 text-blue-800',
      'investment_finance': 'bg-indigo-100 text-indigo-800',
      'other_income': 'bg-gray-100 text-gray-800',
      // 保留旧分类颜色用于兼容
      'membership_fee': 'bg-green-100 text-green-800',
      'sponsorship_fee': 'bg-blue-100 text-blue-800',
      'collected_competition_ball_fee': 'bg-purple-100 text-purple-800',
      'collected_handicap_fee': 'bg-yellow-100 text-yellow-800',
      'interest_income': 'bg-indigo-100 text-indigo-800',
      'collected_meal_fee': 'bg-pink-100 text-pink-800',
      'gic_redemption': 'bg-teal-100 text-teal-800',
      'other': 'bg-gray-100 text-gray-800'
    }
    
    // 支出分类颜色（新版本：4个大类）
    const expenseColors: { [key: string]: string } = {
      'event_activity': 'bg-red-100 text-red-800',
      'payment_on_behalf': 'bg-orange-100 text-orange-800',
      'finance_deposit': 'bg-purple-100 text-purple-800',
      'other_misc': 'bg-gray-100 text-gray-800',
      // 保留旧分类颜色用于兼容
      'competition_prizes_misc': 'bg-red-100 text-red-800',
      'event_meal_beverage': 'bg-orange-100 text-orange-800',
      'photographer_fee': 'bg-purple-100 text-purple-800',
      'paid_handicap_fee': 'bg-yellow-100 text-yellow-800',
      'gic_deposit': 'bg-blue-100 text-blue-800',
      'bank_fee': 'bg-gray-100 text-gray-800',
      'paid_competition_fee': 'bg-indigo-100 text-indigo-800',
      'refund': 'bg-pink-100 text-pink-800'
    }
    
    // 旧分类颜色
    const oldColors: { [key: string]: string } = {
      'equipment': 'bg-blue-100 text-blue-800',
      'maintenance': 'bg-green-100 text-green-800',
      'activity': 'bg-purple-100 text-purple-800',
      'salary': 'bg-orange-100 text-orange-800'
    }
    
    return incomeColors[type] || expenseColors[type] || oldColors[type] || 'bg-gray-100 text-gray-800'
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

  // 排序处理函数
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // 筛选费用
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = !searchTerm || 
      expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // 交易类型筛选（收入/支出）
    const expenseTransactionType = expense.transaction_type || 'expense'
    const matchesTransactionType = transactionTypeFilter === 'all' || expenseTransactionType === transactionTypeFilter
    
    // 费用类型筛选
    const matchesType = typeFilter === 'all' || expense.expense_type === typeFilter
    
    // 年份筛选
    const expenseYear = new Date(expense.expense_date).getFullYear()
    const matchesYear = yearFilter === 'all' || expenseYear.toString() === yearFilter
    
    // 月份筛选
    const expenseMonth = new Date(expense.expense_date).getMonth() + 1
    const matchesMonth = monthFilter === 'all' || expenseMonth.toString() === monthFilter
    
    return matchesSearch && matchesTransactionType && matchesType && matchesYear && matchesMonth
  })
  
  // 计算统计数据（基于筛选后的数据）
  const totalIncome = filteredExpenses
    .filter(exp => (exp.transaction_type || 'expense') === 'income')
    .reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0)
  
  const totalExpense = filteredExpenses
    .filter(exp => (exp.transaction_type || 'expense') === 'expense')
    .reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0)
  
  const netAmount = totalIncome - totalExpense

  // 排序费用
  const getSortedExpenses = () => {
    if (!sortField) return filteredExpenses

    return [...filteredExpenses].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'transaction_type':
          aValue = a.transaction_type || 'expense'
          bValue = b.transaction_type || 'expense'
          break
        case 'title':
          aValue = a.title
          bValue = b.title
          break
        case 'amount':
          aValue = parseFloat(a.amount.toString())
          bValue = parseFloat(b.amount.toString())
          break
        case 'expense_date':
          aValue = new Date(a.expense_date).getTime()
          bValue = new Date(b.expense_date).getTime()
          break
        case 'expense_type':
          aValue = a.expense_type
          bValue = b.expense_type
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-sm">
        {/* 页面标题和添加按钮 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">费用管理</h2>
            <p className="text-gray-600 mt-1">管理俱乐部所有费用支出记录</p>
          </div>
          <button
            onClick={() => {
              setShowForm(true)
              setEditingExpense(null)
              resetForm()
            }}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            添加费用
          </button>
        </div>

        {/* 统计卡片 */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-green-100 mb-1">总收入</div>
              <div className="text-2xl md:text-3xl font-bold">{formatAmount(totalIncome)}</div>
            </div>
            <div>
              <div className="text-sm text-green-100 mb-1">总支出</div>
              <div className="text-2xl md:text-3xl font-bold">{formatAmount(totalExpense)}</div>
            </div>
            <div>
              <div className="text-sm text-green-100 mb-1">净额</div>
              <div className={`text-2xl md:text-3xl font-bold ${netAmount >= 0 ? 'text-white' : 'text-red-200'}`}>
                {formatAmount(netAmount)}
              </div>
            </div>
            <div>
              <div className="text-sm text-green-100 mb-1">
                总记录数
                {(searchTerm || transactionTypeFilter !== 'all' || typeFilter !== 'all' || yearFilter !== 'all' || monthFilter !== 'all') && (
                  <span className="text-green-200 ml-1">
                    (已筛选)
                  </span>
                )}
              </div>
              <div className="text-2xl md:text-3xl font-bold">{filteredExpenses.length}</div>
            </div>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="搜索费用标题或备注..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          
          <div className="flex items-center space-x-2 flex-wrap">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={transactionTypeFilter}
                onChange={(e) => setTransactionTypeFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500 appearance-none bg-white"
              >
                <option value="all">所有交易类型</option>
                <option value="income">收入</option>
                <option value="expense">支出</option>
              </select>
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500 appearance-none bg-white"
              >
                <option value="all">所有费用类型</option>
                {transactionTypeFilter === 'income' || transactionTypeFilter === 'all' ? (
                  <>
                    <option value="membership_sponsorship">会费及赞助类</option>
                    <option value="collection">代收类</option>
                    <option value="investment_finance">投资及理财类</option>
                    <option value="other_income">其他杂项</option>
                  </>
                ) : null}
                {transactionTypeFilter === 'expense' || transactionTypeFilter === 'all' ? (
                  <>
                    <option value="event_activity">赛事与活动支出</option>
                    <option value="payment_on_behalf">代付类</option>
                    <option value="finance_deposit">理财存款</option>
                    <option value="other_misc">其他杂费</option>
                  </>
                ) : null}
              </select>
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500 appearance-none bg-white"
              >
                <option value="all">全部年份</option>
                {availableYears.map(year => (
                  <option key={year} value={year.toString()}>{year}年</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500 appearance-none bg-white"
              >
                <option value="all">全部月份</option>
                <option value="1">1月</option>
                <option value="2">2月</option>
                <option value="3">3月</option>
                <option value="4">4月</option>
                <option value="5">5月</option>
                <option value="6">6月</option>
                <option value="7">7月</option>
                <option value="8">8月</option>
                <option value="9">9月</option>
                <option value="10">10月</option>
                <option value="11">11月</option>
                <option value="12">12月</option>
              </select>
            </div>
          </div>
          
          {/* 清除筛选按钮 - 只在有筛选条件时显示 */}
          {(searchTerm || transactionTypeFilter !== 'all' || typeFilter !== 'all' || yearFilter !== 'all' || monthFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setTransactionTypeFilter('all')
                setTypeFilter('all')
                setYearFilter('all')
                setMonthFilter('all')
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              清除所有筛选
            </button>
          )}
        </div>

        {/* 费用列表 */}
        <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-4 text-left text-base font-semibold text-gray-700 cursor-pointer hover:bg-green-100 select-none"
                  onClick={() => handleSort('transaction_type')}
                >
                  <div className="flex items-center space-x-1">
                    <span>交易类型</span>
                    {sortField === 'transaction_type' && (
                      <span className="text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-base font-semibold text-gray-700 cursor-pointer hover:bg-green-100 select-none"
                  onClick={() => handleSort('expense_type')}
                >
                  <div className="flex items-center space-x-1">
                    <span>费用类型</span>
                    {sortField === 'expense_type' && (
                      <span className="text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-base font-semibold text-gray-700 cursor-pointer hover:bg-green-100 select-none"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center space-x-1">
                    <span>标题</span>
                    {sortField === 'title' && (
                      <span className="text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-base font-semibold text-gray-700 cursor-pointer hover:bg-green-100 select-none"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center space-x-1">
                    <span>金额</span>
                    {sortField === 'amount' && (
                      <span className="text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-base font-semibold text-gray-700 cursor-pointer hover:bg-green-100 select-none"
                  onClick={() => handleSort('expense_date')}
                >
                  <div className="flex items-center space-x-1">
                    <span>日期</span>
                    {sortField === 'expense_date' && (
                      <span className="text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-base font-semibold text-gray-700">收支方式</th>
                <th 
                  className="px-6 py-4 text-left text-base font-semibold text-gray-700 cursor-pointer hover:bg-green-100 select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center space-x-1">
                    <span>状态</span>
                    {sortField === 'status' && (
                      <span className="text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-base font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getSortedExpenses().map((expense) => (
                <tr key={expense.id} className="hover:bg-green-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                      (expense.transaction_type || 'expense') === 'income'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {(expense.transaction_type || 'expense') === 'income' ? '收入' : '支出'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getExpenseTypeColor(expense.expense_type)}`}>
                      {getExpenseTypeText(expense.expense_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-base font-medium text-gray-900">{expense.title}</div>
                    {expense.notes && (
                      <div className="text-base text-gray-500 truncate max-w-xs">{expense.notes}</div>
                    )}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-base font-bold ${
                    (expense.transaction_type || 'expense') === 'income'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {formatAmount(parseFloat(expense.amount.toString()))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-600">
                    {formatDate(expense.expense_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      {getPaymentMethodText(expense.payment_method)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      expense.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {expense.status === 'paid' ? '已支付' : '待支付'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {expense.receipt_url && (() => {
                        const urls = expense.receipt_url.split(',').map(url => url.trim()).filter(url => url)
                        return (
                          <button
                            onClick={() => {
                              setReceiptUrls(urls)
                              setCurrentReceiptIndex(0)
                              setReceiptModalOpen(true)
                            }}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                            title={urls.length > 1 ? `查看收据 (${urls.length}个文件)` : "查看收据"}
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                        )
                      })()}
                      <button
                        onClick={() => handleEdit(expense)}
                        className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  {editingExpense ? '编辑费用' : '添加费用'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setEditingExpense(null)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      交易类型 *
                    </label>
                    <select
                      value={formData.transaction_type}
                      onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="">请选择</option>
                      <option value="expense">支出</option>
                      <option value="income">收入</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.transaction_type === 'income' ? '收入类型' : '费用类型'} *
                    </label>
                    <select
                      value={formData.expense_type}
                      onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}
                      disabled={!formData.transaction_type}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                        !formData.transaction_type ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                      }`}
                      required
                    >
                      <option value="">请选择</option>
                      {formData.transaction_type === 'income' ? (
                        <>
                          <option value="membership_sponsorship">会费及赞助类</option>
                          <option value="collection">代收类</option>
                          <option value="investment_finance">投资及理财类</option>
                          <option value="other_income">其他杂项</option>
                        </>
                      ) : formData.transaction_type === 'expense' ? (
                        <>
                          <option value="event_activity">赛事与活动支出</option>
                          <option value="payment_on_behalf">代付类</option>
                          <option value="finance_deposit">理财存款</option>
                          <option value="other_misc">其他杂费</option>
                        </>
                      ) : null}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.transaction_type === 'income' ? '收入标题' : '费用标题'} *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      金额 (CAD) *
                    </label>
                    <input
                      type="text"
                      value={formData.amount}
                      onChange={(e) => {
                        const value = e.target.value
                        // 只允许数字和小数点
                        if (/^[0-9]*\.?[0-9]*$/.test(value) || value === '') {
                          setFormData({ ...formData, amount: value })
                        }
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="请输入金额，如：123.45"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.transaction_type === 'income' ? '收入日期' : '支出日期'} *
                    </label>
                    <input
                      type="date"
                      value={formData.expense_date}
                      onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      收支方式 *
                    </label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="cash">现金</option>
                      <option value="transfer">转账</option>
                      <option value="check">支票</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      状态 *
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      {formData.transaction_type === 'income' ? (
                        <>
                          <option value="paid">已收款</option>
                          <option value="pending">待收款</option>
                        </>
                      ) : (
                        <>
                          <option value="paid">已支付</option>
                          <option value="pending">待支付</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.transaction_type === 'income' ? '收款凭证' : '支付凭证'}（支持多个文件）
                  </label>
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                      dragActive
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 bg-gray-50'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      onChange={(e) => handleFileUpload(e.target.files)}
                      className="hidden"
                      disabled={uploading}
                    />
                    <div className="text-center">
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-sm text-gray-600 mb-2">
                        {uploading ? '上传中...' : '拖拽文件到这里或'}
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="text-sm text-green-600 hover:text-green-700 font-medium"
                      >
                        选择文件
                      </button>
                      <p className="text-xs text-gray-500 mt-2">
                        支持 JPG、PNG、PDF 格式，可选择多个文件
                      </p>
                    </div>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-gray-700">已上传文件：</p>
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileImage className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {file.name}
                              </p>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                查看文件
                              </a>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-600 hover:text-red-700 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    备注
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    {editingExpense ? '更新费用' : '添加费用'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditingExpense(null)
                      resetForm()
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 凭证查看Modal */}
      {receiptModalOpen && receiptUrls.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[80] p-4" onClick={() => setReceiptModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
            {/* 关闭按钮 */}
            <button
              onClick={() => setReceiptModalOpen(false)}
              className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>

            {/* 图片容器 */}
            <div className="relative h-[80vh] bg-gray-100 flex items-center justify-center">
              <img
                src={receiptUrls[currentReceiptIndex]}
                alt={`凭证 ${currentReceiptIndex + 1}`}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  // 如果图片加载失败，显示错误信息
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const errorDiv = document.createElement('div')
                  errorDiv.className = 'text-gray-500 text-center p-4'
                  errorDiv.textContent = '图片加载失败'
                  target.parentElement?.appendChild(errorDiv)
                }}
              />

              {/* 左侧箭头（如果有多个文件且不是第一张） */}
              {receiptUrls.length > 1 && currentReceiptIndex > 0 && (
                <button
                  onClick={() => setCurrentReceiptIndex(currentReceiptIndex - 1)}
                  className="absolute left-4 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg transition-colors z-10"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-700" />
                </button>
              )}

              {/* 右侧箭头（如果有多个文件且不是最后一张） */}
              {receiptUrls.length > 1 && currentReceiptIndex < receiptUrls.length - 1 && (
                <button
                  onClick={() => setCurrentReceiptIndex(currentReceiptIndex + 1)}
                  className="absolute right-4 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg transition-colors z-10"
                >
                  <ChevronRight className="w-6 h-6 text-gray-700" />
                </button>
              )}

              {/* 图片计数指示器 */}
              {receiptUrls.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                  {currentReceiptIndex + 1} / {receiptUrls.length}
                </div>
              )}
            </div>

            {/* 缩略图导航（如果有多个文件） */}
            {receiptUrls.length > 1 && (
              <div className="p-4 bg-gray-50 border-t border-gray-200 overflow-x-auto">
                <div className="flex gap-2 justify-center">
                  {receiptUrls.map((url, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentReceiptIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        currentReceiptIndex === index
                          ? 'border-green-500 ring-2 ring-green-200'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`凭证 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {expenses.length === 0 && (
        <div className="text-center py-12">
          <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无费用记录</h3>
          <p className="text-gray-600">点击"添加费用"按钮创建第一条费用记录</p>
        </div>
      )}
    </div>
  )
}
