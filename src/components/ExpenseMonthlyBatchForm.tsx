import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { X, Plus, Star, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useModal } from './ModalProvider'
import { createAuditContext, logBatchOperation } from '../lib/audit'
import { getCategoriesForTransaction } from '../lib/expenseCategoryConfig'
import {
  getSavedExpenseTitles,
  saveExpenseTitle,
  removeSavedExpenseTitle,
} from '../lib/expenseSavedTitles'

export type BatchRow = {
  id: string
  transaction_type: 'income' | 'expense'
  expense_type: string
  title: string
  amount: string
  isCustom: boolean
  saveAsCommon: boolean
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

function parseAmount(value: string): number | null {
  const v = value.trim().replace(/,/g, '')
  if (!v) return null
  const n = parseFloat(v)
  if (Number.isNaN(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

function rowKey(transaction_type: string, expense_type: string, title: string): string {
  return `${transaction_type}|${expense_type}|${title.trim()}`
}

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatCad(n: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CAD',
  }).format(n)
}

function buildInitialRows(transaction_type: 'income' | 'expense'): BatchRow[] {
  const categories = getCategoriesForTransaction(transaction_type)
  const saved = getSavedExpenseTitles().filter((s) => s.transaction_type === transaction_type)
  const rows: BatchRow[] = []
  const seen = new Set<string>()

  const addRow = (expense_type: string, title: string, isCustom: boolean) => {
    const t = title.trim()
    if (!t) return
    const key = rowKey(transaction_type, expense_type, t)
    if (seen.has(key)) return
    seen.add(key)
    rows.push({
      id: `${transaction_type}:${expense_type}:${t}`,
      transaction_type,
      expense_type,
      title: t,
      amount: '',
      isCustom,
      saveAsCommon: false,
    })
  }

  for (const cat of categories) {
    for (const title of cat.titles) {
      addRow(cat.value, title, false)
    }
    // 本机「常用」标题：可点右侧垃圾桶删除（会从 localStorage 移除）
    for (const s of saved.filter((x) => x.expense_type === cat.value)) {
      addRow(cat.value, s.title, true)
    }
  }

  return rows
}

function SectionTable({
  transactionType,
  rows,
  onAmountChange,
  onToggleSaveCommon,
  onRemoveCustom,
  onAddCustom,
}: {
  transactionType: 'income' | 'expense'
  rows: BatchRow[]
  onAmountChange: (id: string, amount: string) => void
  onToggleSaveCommon: (id: string, checked: boolean) => void
  onRemoveCustom: (id: string) => void
  onAddCustom: (expense_type: string, title: string) => void
}) {
  const [newCategory, setNewCategory] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const categories = getCategoriesForTransaction(transactionType)
  const label = transactionType === 'income' ? '收入' : '支出'

  const grouped = useMemo(() => {
    const map = new Map<string, BatchRow[]>()
    for (const row of rows) {
      const list = map.get(row.expense_type) || []
      list.push(row)
      map.set(row.expense_type, list)
    }
    return categories
      .filter((c) => map.has(c.value))
      .map((c) => ({ category: c, items: map.get(c.value) || [] }))
  }, [rows, categories])

  const sectionTotal = useMemo(() => {
    return rows.reduce((sum, r) => {
      const n = parseAmount(r.amount)
      return sum + (n ?? 0)
    }, 0)
  }, [rows])

  const handleAdd = () => {
    const title = newTitle.trim()
    if (!newCategory || !title) return
    onAddCustom(newCategory, title)
    setNewTitle('')
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">{label}</h4>
        <span className="text-sm font-medium text-gray-700">
          小计：<span className={transactionType === 'income' ? 'text-green-700' : 'text-red-700'}>
            {formatCad(sectionTotal)}
          </span>
        </span>
      </div>

      <div className="divide-y divide-gray-200">
        {grouped.map(({ category, items }) => {
          const isIncome = transactionType === 'income'
          const categoryBar = isIncome
            ? 'border-l-4 border-emerald-600 bg-emerald-50/90'
            : 'border-l-4 border-red-600 bg-red-50/90'
          const categoryText = isIncome ? 'text-emerald-900' : 'text-red-900'
          const categoryBadge = isIncome
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-red-100 text-red-800'

          return (
            <div key={category.value} className="py-1">
              {/* 一级分类 */}
              <div
                className={`mx-2 mt-2 mb-1 px-3 py-2 rounded-r-lg flex items-center gap-2 ${categoryBar}`}
              >
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${categoryBadge}`}
                >
                  分类
                </span>
                <span className={`text-sm font-semibold ${categoryText}`}>{category.label}</span>
              </div>

              {/* 二级标题（缩进 + 浅色底） */}
              <div className="ml-4 sm:ml-6 mr-2 mb-2 space-y-1.5 border-l-2 border-gray-200 pl-3 sm:pl-4">
                {items.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center gap-2 py-1.5 px-2 rounded-lg bg-white border border-gray-100 hover:border-gray-200"
                  >
                    <span className="text-gray-300 select-none shrink-0" aria-hidden>
                      └
                    </span>
                    <span className="flex-1 min-w-[100px] text-sm text-gray-600">{row.title}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.amount}
                      onChange={(e) => {
                        const v = e.target.value
                        if (/^[0-9]*\.?[0-9]*$/.test(v) || v === '') {
                          onAmountChange(row.id, v)
                        }
                      }}
                      placeholder="0.00"
                      className="w-28 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-right bg-gray-50"
                    />
                    {row.isCustom && (
                      <>
                        <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.saveAsCommon}
                            onChange={(e) => onToggleSaveCommon(row.id, e.target.checked)}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <Star className="w-3 h-3" />
                          常用
                        </label>
                        <button
                          type="button"
                          onClick={() => onRemoveCustom(row.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="删除此行（常用标题会从本机移除，下次不再显示）"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="p-3 bg-gray-50 border-t border-gray-200 flex flex-wrap items-end gap-2">
        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="flex-1 min-w-[140px] px-3 py-2 text-sm border border-gray-300 rounded-lg"
        >
          <option value="">选择分类</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="新标题名称"
          className="flex-1 min-w-[140px] px-3 py-2 text-sm border border-gray-300 rounded-lg"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newCategory || !newTitle.trim()}
          className="flex items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
        >
          <Plus className="w-4 h-4 mr-1" />
          添加{label}行
        </button>
      </div>
    </div>
  )
}

export default function ExpenseMonthlyBatchForm({ isOpen, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const { showSuccess, showError, showConfirm } = useModal()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [incomeRows, setIncomeRows] = useState<BatchRow[]>(() => buildInitialRows('income'))
  const [expenseRows, setExpenseRows] = useState<BatchRow[]>(() => buildInitialRows('expense'))
  const [paymentMethod, setPaymentMethod] = useState('transfer')
  const [status, setStatus] = useState('paid')
  const [replaceMonth, setReplaceMonth] = useState(false)
  const [loadingMonth, setLoadingMonth] = useState(false)
  const [saving, setSaving] = useState(false)
  const [existingCount, setExistingCount] = useState(0)
  const [expenseDate, setExpenseDate] = useState(() =>
    lastDayOfMonth(now.getFullYear(), now.getMonth() + 1)
  )

  const monthDateMin = `${year}-${String(month).padStart(2, '0')}-01`
  const monthDateMax = lastDayOfMonth(year, month)

  // 切换年月时，记账日期默认回到该月最后一天（可再手动改）
  useEffect(() => {
    setExpenseDate(lastDayOfMonth(year, month))
  }, [year, month])

  const incomeTotal = useMemo(
    () => incomeRows.reduce((s, r) => s + (parseAmount(r.amount) ?? 0), 0),
    [incomeRows]
  )
  const expenseTotal = useMemo(
    () => expenseRows.reduce((s, r) => s + (parseAmount(r.amount) ?? 0), 0),
    [expenseRows]
  )
  const netTotal = incomeTotal - expenseTotal

  const mergePrefillIntoRows = (
    base: BatchRow[],
    transaction_type: 'income' | 'expense',
    amountMap: Map<string, string>
  ): BatchRow[] => {
    const next = base.map((row) => {
      const key = rowKey(row.transaction_type, row.expense_type, row.title)
      const amt = amountMap.get(key)
      if (amt != null) {
        amountMap.delete(key)
        return { ...row, amount: amt }
      }
      return { ...row, amount: '' }
    })
    for (const [key, amt] of amountMap) {
      const [tt, et, ...titleParts] = key.split('|')
      const title = titleParts.join('|')
      if (tt !== transaction_type) continue
      next.push({
        id: `custom:${key}:${Date.now()}`,
        transaction_type,
        expense_type: et,
        title,
        amount: amt,
        isCustom: true,
        saveAsCommon: false,
      })
    }
    return next
  }

  const loadMonthData = useCallback(async () => {
    if (!supabase) return
    setLoadingMonth(true)
    try {
      const start = `${year}-${String(month).padStart(2, '0')}-01`
      const end = lastDayOfMonth(year, month)
      const { data, error } = await supabase
        .from('expenses')
        .select('transaction_type, expense_type, title, amount')
        .gte('expense_date', start)
        .lte('expense_date', end)

      if (error) throw error

      setExistingCount(data?.length ?? 0)

      const amountMap = new Map<string, string>()
      for (const r of data || []) {
        amountMap.set(rowKey(r.transaction_type, r.expense_type, r.title), String(r.amount))
      }

      const incomeBase = buildInitialRows('income')
      const expenseBase = buildInitialRows('expense')
      const incomeMap = new Map(amountMap)
      const expenseMap = new Map(amountMap)
      setIncomeRows(mergePrefillIntoRows(incomeBase, 'income', incomeMap))
      setExpenseRows(mergePrefillIntoRows(expenseBase, 'expense', expenseMap))
    } catch (e: any) {
      console.error(e)
      showError(e.message || '加载该月数据失败')
    } finally {
      setLoadingMonth(false)
    }
  }, [year, month, showError])

  useEffect(() => {
    if (!isOpen) return
    loadMonthData()
  }, [isOpen, year, month, loadMonthData])

  const updateAmount = (setter: React.Dispatch<React.SetStateAction<BatchRow[]>>, id: string, amount: string) => {
    setter((rows) => rows.map((r) => (r.id === id ? { ...r, amount } : r)))
  }

  const toggleSaveCommon = (setter: React.Dispatch<React.SetStateAction<BatchRow[]>>, id: string, checked: boolean) => {
    setter((rows) => rows.map((r) => (r.id === id ? { ...r, saveAsCommon: checked } : r)))
  }

  const removeCustom = (setter: React.Dispatch<React.SetStateAction<BatchRow[]>>, id: string) => {
    setter((rows) => {
      const row = rows.find((r) => r.id === id)
      if (row?.isCustom) {
        removeSavedExpenseTitle({
          transaction_type: row.transaction_type,
          expense_type: row.expense_type,
          title: row.title,
        })
      }
      return rows.filter((r) => r.id !== id)
    })
  }

  const addCustom = (
    setter: React.Dispatch<React.SetStateAction<BatchRow[]>>,
    transaction_type: 'income' | 'expense',
    expense_type: string,
    title: string
  ) => {
    const t = title.trim()
    if (!t) return
    setter((rows) => {
      const key = rowKey(transaction_type, expense_type, t)
      if (rows.some((r) => rowKey(r.transaction_type, r.expense_type, r.title) === key)) {
        return rows
      }
      return [
        ...rows,
        {
          id: `custom:${key}:${Date.now()}`,
          transaction_type,
          expense_type,
          title: t,
          amount: '',
          isCustom: true,
          saveAsCommon: false,
        },
      ]
    })
  }

  const handleSave = async () => {
    if (!supabase || !user) {
      showError('请先登录')
      return
    }

    const allRows = [...incomeRows, ...expenseRows]
    const toSave = allRows
      .map((r) => {
        const amt = parseAmount(r.amount)
        if (amt == null) return null
        return { ...r, parsedAmount: amt }
      })
      .filter((r): r is BatchRow & { parsedAmount: number } => r != null)

    if (toSave.length === 0) {
      showError('请至少填写一行金额')
      return
    }

    const doSave = async () => {
      setSaving(true)
      try {
        const start = `${year}-${String(month).padStart(2, '0')}-01`
        const end = lastDayOfMonth(year, month)

        if (replaceMonth && existingCount > 0) {
          const { error: delError } = await supabase
            .from('expenses')
            .delete()
            .gte('expense_date', start)
            .lte('expense_date', end)
          if (delError) throw delError
        }

        const inserts = toSave.map((r) => ({
          expense_type: r.expense_type,
          transaction_type: r.transaction_type,
          title: r.title.trim(),
          amount: r.parsedAmount,
          expense_date: expenseDate,
          payment_method: paymentMethod,
          receipt_url: null,
          notes: `月度批量录入 ${year}年${month}月`,
          status,
        }))

        const { error: insertError } = await supabase.from('expenses').insert(inserts)
        if (insertError) throw insertError

        for (const r of toSave) {
          if (r.saveAsCommon && r.isCustom) {
            saveExpenseTitle({
              transaction_type: r.transaction_type,
              expense_type: r.expense_type,
              title: r.title.trim(),
            })
          }
        }

        const context = await createAuditContext(user.id)
        await logBatchOperation('expenses', 'BATCH_MONTHLY_INSERT', inserts.length, context, {
          year,
          month,
          expense_date: expenseDate,
          income_total: incomeTotal,
          expense_total: expenseTotal,
          replaced: replaceMonth && existingCount > 0,
        })

        showSuccess(`已保存 ${inserts.length} 条记录（${year}年${month}月）`)
        onSaved()
        onClose()
      } catch (e: any) {
        console.error(e)
        showError(e.message || '保存失败')
      } finally {
        setSaving(false)
      }
    }

    if (existingCount > 0 && !replaceMonth) {
      showConfirm({
        title: '该月已有记录',
        message: `${year}年${month}月已有 ${existingCount} 条费用记录。继续保存将追加新记录（可能重复）。建议勾选「覆盖该月已有记录」后保存，或先勾选覆盖。`,
        type: 'warning',
        confirmText: '仍要追加保存',
        onConfirm: doSave,
      })
      return
    }

    if (replaceMonth && existingCount > 0) {
      showConfirm({
        title: '确认覆盖',
        message: `将删除 ${year}年${month}月 的全部 ${existingCount} 条记录，并写入本次 ${toSave.length} 条新记录。此操作不可撤销。`,
        type: 'danger',
        confirmText: '确认覆盖并保存',
        onConfirm: doSave,
      })
      return
    }

    await doSave()
  }

  if (!isOpen) return null

  const yearOptions = Array.from({ length: 8 }, (_, i) => now.getFullYear() - 3 + i)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80] p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-900">月度批量录入</h3>
            <p className="text-sm text-gray-500 mt-1">
              对照客户月结单填写金额；保存后拆分为多条记录写入数据库
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">年份</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y} 年
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">月份</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m} 月
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                记账日期
                <span className="text-gray-400 font-normal ml-1">（写入每条记录）</span>
              </label>
              <input
                type="date"
                value={expenseDate}
                min={monthDateMin}
                max={monthDateMax}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">收支方式</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              >
                <option value="transfer">转账</option>
                <option value="cash">现金</option>
                <option value="check">支票</option>
              </select>
            </div>
          </div>

          {existingCount > 0 && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <span className="text-amber-800">
                该月已有 {existingCount} 条记录，已尝试回填金额。
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-amber-900">
                <input
                  type="checkbox"
                  checked={replaceMonth}
                  onChange={(e) => setReplaceMonth(e.target.checked)}
                  className="rounded border-amber-400"
                />
                覆盖该月已有记录后再保存
              </label>
              <button
                type="button"
                onClick={loadMonthData}
                disabled={loadingMonth}
                className="text-amber-700 underline hover:no-underline disabled:opacity-50"
              >
                {loadingMonth ? '加载中…' : '重新加载该月'}
              </button>
            </div>
          )}

          {loadingMonth ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <SectionTable
                transactionType="income"
                rows={incomeRows}
                onAmountChange={(id, amt) => updateAmount(setIncomeRows, id, amt)}
                onToggleSaveCommon={(id, c) => toggleSaveCommon(setIncomeRows, id, c)}
                onRemoveCustom={(id) => removeCustom(setIncomeRows, id)}
                onAddCustom={(et, t) => addCustom(setIncomeRows, 'income', et, t)}
              />
              <SectionTable
                transactionType="expense"
                rows={expenseRows}
                onAmountChange={(id, amt) => updateAmount(setExpenseRows, id, amt)}
                onToggleSaveCommon={(id, c) => toggleSaveCommon(setExpenseRows, id, c)}
                onRemoveCustom={(id) => removeCustom(setExpenseRows, id)}
                onAddCustom={(et, t) => addCustom(setExpenseRows, 'expense', et, t)}
              />
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="text-center sm:text-left">
              <div className="text-xs text-gray-500">收入合计</div>
              <div className="text-lg font-bold text-green-700">{formatCad(incomeTotal)}</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-xs text-gray-500">支出合计</div>
              <div className="text-lg font-bold text-red-700">{formatCad(expenseTotal)}</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-xs text-gray-500">净额（收入 − 支出）</div>
              <div
                className={`text-lg font-bold ${netTotal >= 0 ? 'text-gray-900' : 'text-red-700'}`}
              >
                {formatCad(netTotal)}
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 p-4 sm:p-6 border-t border-gray-200 flex flex-wrap gap-3 justify-end bg-white rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loadingMonth}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            {saving ? '保存中…' : `保存 ${year}年${month}月`}
          </button>
        </div>
      </div>
    </div>
  )
}
