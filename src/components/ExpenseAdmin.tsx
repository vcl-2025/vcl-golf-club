import React, { useState, useEffect, useRef } from 'react'
import { Plus, Edit, Trash2, Receipt, Calendar, DollarSign, Upload, X, Check, FileImage, Search, Filter, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useModal } from './ModalProvider'
import { insertWithAudit, updateWithAudit, deleteWithAudit, createAuditContext, type UserRole } from '../lib/audit'
import { useAuth } from '../hooks/useAuth'

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
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [uploading, setUploading] = useState(false)
  const { confirmDelete, showSuccess, showError, showWarning } = useModal()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 凭证查看modal状态
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [receiptUrls, setReceiptUrls] = useState<string[]>([])
  const [currentReceiptIndex, setCurrentReceiptIndex] = useState(0)
  
  // 操作菜单状态
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null)

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

  // 点击外部关闭操作菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openActionMenuId) {
        const target = event.target as HTMLElement
        if (!target.closest('.action-menu-container')) {
          setOpenActionMenuId(null)
        }
      }
    }

    if (openActionMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openActionMenuId])
  
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
      const years = [...new Set(expenses.map(expense => {
        // 避免时区问题：直接解析年份
        const dateStr = expense.expense_date.split('T')[0]
        return parseInt(dateStr.split('-')[0])
      }))].sort((a, b) => b - a)
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
    setIsSubmitting(true)

    try {
      if (!user || !supabase) {
        showError('请先登录')
        return
      }
      // 获取用户角色
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const userRole = (profile?.role || 'member') as UserRole

      // 创建审计上下文
      const context = await createAuditContext(user.id)

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
        // 更新模式：只包含实际修改的字段
        const { data: oldExpenseData } = await supabase
          .from('expenses')
          .select('*')
          .eq('id', editingExpense.id)
          .single()

        if (oldExpenseData) {
          // 辅助函数：比较值是否相等
          const valuesEqual = (oldVal: any, newVal: any): boolean => {
            if (oldVal === null || oldVal === undefined) {
              return newVal === null || newVal === undefined
            }
            if (newVal === null || newVal === undefined) {
              return false
            }

            // 处理日期时间字符串
            if ((typeof oldVal === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(oldVal)) &&
                (typeof newVal === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(newVal))) {
              try {
                const oldDate = new Date(oldVal).toISOString().substring(0, 19)
                const newDate = new Date(newVal).toISOString().substring(0, 19)
                return oldDate === newDate
              } catch (e) {
                // Fallback to stringify
              }
            }

            // 处理数字
            if (typeof oldVal === 'number' && typeof newVal === 'number') {
              return Math.abs(oldVal - newVal) < 0.0001
            }

            // 深度比较
            try {
              return JSON.stringify(oldVal) === JSON.stringify(newVal)
            } catch {
              return oldVal === newVal
            }
          }

          // 只包含实际发生变化的字段
          const updateData: any = {}
          Object.keys(expenseData).forEach((key) => {
            const oldValue = oldExpenseData[key]
            const newValue = expenseData[key as keyof typeof expenseData]
            
            if (!valuesEqual(oldValue, newValue)) {
              updateData[key] = newValue
            }
          })

          if (Object.keys(updateData).length > 0) {
            const result = await updateWithAudit(
              'expenses',
              editingExpense.id,
              updateData,
              context,
              userRole
            )

            if (result.error) throw result.error
            showSuccess('费用记录已更新！')
          } else {
            showSuccess('费用记录无变化')
          }
        }
      } else {
        // 插入模式：使用审计功能
        const result = await insertWithAudit(
          'expenses',
          expenseData,
          context,
          userRole
        )

        if (result.error) throw result.error
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
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    
    const transactionType = expense.transaction_type || 'expense'
    
    // 先设置ref，避免useEffect清空费用类型
    prevTransactionTypeRef.current = transactionType
    
    // 映射旧分类到新大类（兼容旧数据）
    let expenseType = expense.expense_type
    if (transactionType === 'income') {
      // 收入：映射旧大类到新大类
      if (expense.expense_type === 'membership_sponsorship') {
        expenseType = expense.title?.includes('会费') ? 'membership_income' : 
                     expense.title?.includes('赞助') ? 'sponsorship_support' : 'membership_income'
      } else if (expense.expense_type === 'collection') {
        expenseType = 'activity_related_income'
      } else if (expense.expense_type === 'investment_finance') {
        expenseType = 'investment_income'
      } else if (expense.expense_type === 'other_income') {
        expenseType = 'other_income'
      } else if (expense.expense_type === 'membership_fee') {
        expenseType = 'membership_income'
      } else if (expense.expense_type === 'sponsorship_fee') {
        expenseType = 'sponsorship_support'
      } else if (['collected_competition_ball_fee', 'collected_handicap_fee', 'collected_meal_fee'].includes(expense.expense_type)) {
        expenseType = 'activity_related_income'
      } else if (['interest_income', 'gic_redemption'].includes(expense.expense_type)) {
        expenseType = 'investment_income'
      } else if (expense.expense_type === 'other') {
        expenseType = 'other_income'
      }
      // 如果已经是新大类，保持不变
      if (!['membership_income', 'sponsorship_support', 'activity_related_income', 'investment_income', 'other_income'].includes(expenseType)) {
        expenseType = expense.expense_type
      }
    } else {
      // 支出：映射旧大类到新大类
      if (expense.expense_type === 'event_activity' || expense.expense_type === 'payment_on_behalf') {
        expenseType = 'activity_expense'
      } else if (expense.expense_type === 'finance_deposit') {
        expenseType = 'investment_savings'
      } else if (expense.expense_type === 'other_misc') {
        expenseType = 'other_expense'
      } else if (['competition_prizes_misc', 'event_meal_beverage', 'paid_competition_fee', 
                   'paid_handicap_fee', 'photographer_fee', 'refund'].includes(expense.expense_type)) {
        expenseType = 'activity_expense'
      } else if (expense.expense_type === 'gic_deposit') {
        expenseType = 'investment_savings'
      } else if (expense.expense_type === 'bank_fee') {
        expenseType = 'operating_expense'
      } else if (expense.expense_type === 'other') {
        expenseType = 'other_expense'
      } else if (['equipment', 'maintenance', 'salary'].includes(expense.expense_type)) {
        expenseType = 'other_expense'
      } else if (expense.expense_type === 'activity') {
        expenseType = 'activity_expense'
      }
      // 如果已经是新大类，保持不变
      if (!['activity_expense', 'investment_savings', 'operating_expense', 'other_expense'].includes(expenseType)) {
        expenseType = expense.expense_type
      }
    }
    
    setFormData({
      expense_type: expenseType || '',
      transaction_type: transactionType,
      title: expense.title,
      amount: expense.amount.toString(),
      expense_date: expense.expense_date,
      payment_method: expense.payment_method,
      receipt_url: expense.receipt_url || '',
      notes: expense.notes || '',
      status: expense.status
    })

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
        if (!user || !supabase) {
          showError('请先登录')
          return
        }

        // 获取用户角色
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        const userRole = (profile?.role || 'member') as UserRole

        // 创建审计上下文
        const context = await createAuditContext(user.id)

        // 使用审计功能删除
        const { error } = await deleteWithAudit(
          'expenses',
          id,
          context,
          userRole
        )

        if (error) throw error
        showSuccess('费用记录已删除')
        fetchExpenses()
      } catch (error: any) {
        console.error('删除失败:', error)
        showError(`删除失败: ${error.message || '请重试'}`)
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

  const getExpenseTypeColor = (type: string) => {
    // 收入大类颜色
    const incomeColors: { [key: string]: string } = {
      'membership_income': 'bg-[#F15B98]/20 text-[#F15B98]',
      'sponsorship_support': 'bg-[#F15B98]/20 text-[#F15B98]',
      'activity_related_income': 'bg-[#F15B98]/20 text-[#F15B98]',
      'investment_income': 'bg-[#F15B98]/20 text-[#F15B98]',
      'other_income': 'bg-[#F15B98]/20 text-[#F15B98]',
      // 旧大类（兼容）
      'membership_sponsorship': 'bg-[#F15B98]/20 text-[#F15B98]',
      'collection': 'bg-[#F15B98]/20 text-[#F15B98]',
      'investment_finance': 'bg-[#F15B98]/20 text-[#F15B98]',
      // 旧具体分类（兼容）
      'membership_fee': 'bg-[#F15B98]/20 text-[#F15B98]',
      'sponsorship_fee': 'bg-[#F15B98]/20 text-[#F15B98]',
      'collected_competition_ball_fee': 'bg-[#F15B98]/20 text-[#F15B98]',
      'collected_handicap_fee': 'bg-[#F15B98]/20 text-[#F15B98]',
      'collected_meal_fee': 'bg-[#F15B98]/20 text-[#F15B98]',
      'interest_income': 'bg-[#F15B98]/20 text-[#F15B98]',
      'gic_redemption': 'bg-[#F15B98]/20 text-[#F15B98]',
      'other': 'bg-[#F15B98]/20 text-[#F15B98]'
    }
    
    // 支出大类颜色
    const expenseColors: { [key: string]: string } = {
      'activity_expense': 'bg-red-100 text-red-800',
      'investment_savings': 'bg-purple-100 text-purple-800',
      'operating_expense': 'bg-orange-100 text-orange-800',
      'other_expense': 'bg-gray-100 text-gray-800',
      // 旧大类（兼容）
      'event_activity': 'bg-red-100 text-red-800',
      'payment_on_behalf': 'bg-red-100 text-red-800',
      'finance_deposit': 'bg-purple-100 text-purple-800',
      'other_misc': 'bg-gray-100 text-gray-800',
      // 旧具体分类（兼容）
      'competition_prizes_misc': 'bg-red-100 text-red-800',
      'event_meal_beverage': 'bg-red-100 text-red-800',
      'paid_competition_fee': 'bg-red-100 text-red-800',
      'paid_handicap_fee': 'bg-red-100 text-red-800',
      'photographer_fee': 'bg-red-100 text-red-800',
      'refund': 'bg-red-100 text-red-800',
      'gic_deposit': 'bg-purple-100 text-purple-800',
      'bank_fee': 'bg-orange-100 text-orange-800',
      'other': 'bg-gray-100 text-gray-800',
      // 最旧分类（兼容）
      'equipment': 'bg-gray-100 text-gray-800',
      'maintenance': 'bg-gray-100 text-gray-800',
      'activity': 'bg-red-100 text-red-800',
      'salary': 'bg-gray-100 text-gray-800'
    }
    
    return incomeColors[type] || expenseColors[type] || 'bg-gray-100 text-gray-800'
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
    
    // 年份筛选（避免时区问题：直接解析日期字符串）
    const dateStr = expense.expense_date.split('T')[0]
    const [year, month] = dateStr.split('-')
    const expenseYear = parseInt(year)
    const matchesYear = yearFilter === 'all' || expenseYear.toString() === yearFilter
    
    // 月份筛选（避免时区问题：直接解析日期字符串）
    const expenseMonth = parseInt(month)
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
          // 避免时区问题：直接比较日期字符串
          aValue = a.expense_date.split('T')[0]
          bValue = b.expense_date.split('T')[0]
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

      // 对于日期字段，使用字符串比较
      if (sortField === 'expense_date') {
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      }
      // 其他字段使用数值比较
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
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
        return date.toLocaleDateString('zh-CN')
      }
    }
    // 如果解析失败，使用原来的方式（但可能会有时区问题）
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
      <div className="bg-white rounded-3xl p-[5px] lg:p-6 m-0.5 lg:m-0 shadow-sm">
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
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-6">
          {/* 搜索框 */}
          <div className="w-full md:flex-1 relative">
            <input
              type="text"
              placeholder="搜索费用标题或备注..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          
          {/* 筛选按钮 */}
          <div className="grid grid-cols-2 md:flex md:items-center gap-2 md:gap-0 md:space-x-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={transactionTypeFilter}
                onChange={(e) => setTransactionTypeFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500 appearance-none bg-white"
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500 appearance-none bg-white"
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500 appearance-none bg-white"
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500 appearance-none bg-white"
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
          </div>
          
          {/* 清除筛选按钮 - 只在有筛选条件时显示 */}
          {(searchTerm || transactionTypeFilter !== 'all' || typeFilter !== 'all' || yearFilter !== 'all' || monthFilter !== 'all') && (
          <div className="mb-6">
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
        </div>
        )}

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
                <th className="px-2 md:px-6 py-4 text-left text-base font-semibold text-gray-700 min-w-[50px]">操作</th>
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
                  <td className="px-2 md:px-6 py-4 whitespace-nowrap text-sm font-medium min-w-[50px]">
                    {/* 桌面端：横向图标 */}
                    <div className="hidden md:flex items-center space-x-2">
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
                    
                    {/* 手机端：三个点菜单 */}
                    <div className="md:hidden relative action-menu-container flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenActionMenuId(openActionMenuId === expense.id ? null : expense.id)
                        }}
                        className="text-gray-600 hover:text-gray-800 p-1.5 rounded hover:bg-gray-50"
                        title="操作"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      
                      {/* 下拉菜单 */}
                      {openActionMenuId === expense.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[140px]">
                          {expense.receipt_url && (() => {
                            const urls = expense.receipt_url.split(',').map(url => url.trim()).filter(url => url)
                            return (
                              <button
                                onClick={() => {
                                  setReceiptUrls(urls)
                                  setCurrentReceiptIndex(0)
                                  setReceiptModalOpen(true)
                                  setOpenActionMenuId(null)
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center space-x-2"
                              >
                                <Receipt className="w-4 h-4" />
                                <span>{urls.length > 1 ? `查看收据 (${urls.length}个)` : '查看收据'}</span>
                              </button>
                            )
                          })()}
                          <button
                            onClick={() => {
                              handleEdit(expense)
                              setOpenActionMenuId(null)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center space-x-2"
                          >
                            <Edit className="w-4 h-4" />
                            <span>编辑</span>
                          </button>
                          <button
                            onClick={() => {
                              handleDelete(expense.id)
                              setOpenActionMenuId(null)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>删除</span>
                          </button>
                        </div>
                      )}
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
                      onChange={(e) => {
                        setFormData({ ...formData, expense_type: e.target.value, title: '' })
                      }}
                      disabled={!formData.transaction_type}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                        !formData.transaction_type ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                      }`}
                      required
                    >
                      <option value="">请选择</option>
                      {formData.transaction_type === 'income' ? (
                        <>
                          <option value="membership_income">会员收入</option>
                          <option value="sponsorship_support">赞助与支持</option>
                          <option value="activity_related_income">活动相关收入</option>
                          <option value="investment_income">投资收益</option>
                          <option value="other_income">其他收入</option>
                        </>
                      ) : formData.transaction_type === 'expense' ? (
                        <>
                          <option value="activity_expense">活动支出</option>
                          <option value="investment_savings">投资与储蓄</option>
                          <option value="operating_expense">运营支出</option>
                          <option value="other_expense">其它支出</option>
                        </>
                      ) : null}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.transaction_type === 'income' ? '收入标题' : '费用标题'} *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list={`title-options-${formData.expense_type}`}
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder={formData.expense_type ? "选择或输入标题" : "请先选择类型"}
                      disabled={!formData.expense_type}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                        !formData.expense_type ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                      }`}
                      required
                    />
                    {formData.expense_type && (
                      <datalist id={`title-options-${formData.expense_type}`}>
                        {formData.transaction_type === 'income' ? (
                          formData.expense_type === 'membership_income' ? (
                            <>
                              <option value="会费" />
                            </>
                          ) : formData.expense_type === 'sponsorship_support' ? (
                            <>
                              <option value="赞助费" />
                            </>
                          ) : formData.expense_type === 'activity_related_income' ? (
                            <>
                              <option value="代收比赛球费" />
                              <option value="代收差点费" />
                              <option value="代收餐费" />
                            </>
                          ) : formData.expense_type === 'investment_income' ? (
                            <>
                              <option value="利息收入" />
                              <option value="GIC 赎回" />
                            </>
                          ) : formData.expense_type === 'other_income' ? (
                            <>
                              <option value="其他" />
                            </>
                          ) : null
                        ) : formData.transaction_type === 'expense' ? (
                          formData.expense_type === 'activity_expense' ? (
                            <>
                              <option value="比赛奖品及杂费" />
                              <option value="活动餐费及酒水" />
                              <option value="代付比赛费用 (含Zone4费用)" />
                              <option value="代付差点费" />
                              <option value="摄影师费用" />
                              <option value="退费" />
                            </>
                          ) : formData.expense_type === 'investment_savings' ? (
                            <>
                              <option value="存GIC" />
                            </>
                          ) : formData.expense_type === 'operating_expense' ? (
                            <>
                              <option value="银行费" />
                            </>
                          ) : formData.expense_type === 'other_expense' ? (
                            <>
                              <option value="其他" />
                            </>
                          ) : null
                        ) : null}
                      </datalist>
                    )}
                  </div>
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
                    disabled={isSubmitting}
                    className={`flex-1 px-6 py-3 rounded-lg transition-colors font-medium ${
                      isSubmitting 
                        ? 'bg-gray-400 cursor-not-allowed text-white' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isSubmitting ? '保存中...' : (editingExpense ? '更新费用' : '添加费用')}
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
