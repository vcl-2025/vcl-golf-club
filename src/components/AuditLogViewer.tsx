/**
 * 审计日志查看器
 * 管理员可以查看所有数据变更的审计日志
 */

import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Search, Filter, ChevronDown, ChevronUp, Calendar, User, Database, FileText } from 'lucide-react'

interface AuditLog {
  id: string
  table_name: string
  record_id: string
  field_name: string | null
  old_value: any
  new_value: any
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  user_id: string
  user_email: string | null
  user_role: string | null
  user_name: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

interface FilterState {
  tableName: string
  operation: string
  userId: string
  dateFrom: string
  dateTo: string
  searchTerm: string
}

export default function AuditLogViewer() {
  const { user, loading: authLoading } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<FilterState>({
    tableName: '',
    operation: '',
    userId: '',
    dateFrom: '',
    dateTo: '',
    searchTerm: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 50

  // 获取可用的表名列表
  const [tableNames, setTableNames] = useState<string[]>([])

  useEffect(() => {
    // 等待认证加载完成后再查询
    if (authLoading) {
      setLoading(true)
      return
    }

    fetchTableNames()
    fetchLogs()
  }, [filters, page, user, authLoading])

  const fetchTableNames = async () => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('table_name')
        .order('table_name')

      if (error) throw error

      const uniqueTables = Array.from(
        new Set((data || []).map((item) => item.table_name))
      )
      setTableNames(uniqueTables)
    } catch (error) {
      console.error('获取表名列表失败:', error)
    }
  }

  const fetchLogs = async () => {
    if (!supabase) {
      console.warn('Supabase未初始化')
      setLoading(false)
      return
    }

    // 即使没有user也尝试查询（RLS策略会控制访问）
    setLoading(true)
    try {
      // 直接查询 audit_log 表
      let query = supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      // 应用过滤器
      if (filters.tableName) {
        query = query.eq('table_name', filters.tableName)
      }

      if (filters.operation) {
        query = query.eq('operation', filters.operation)
      }

      if (filters.userId) {
        query = query.eq('user_id', filters.userId)
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59')
      }

      if (filters.searchTerm) {
        query = query.or(
          `table_name.ilike.%${filters.searchTerm}%,field_name.ilike.%${filters.searchTerm}%,user_email.ilike.%${filters.searchTerm}%`
        )
      }

      const { data, error, count } = await query

      if (error) {
        console.error('获取审计日志失败:', error)
        console.error('错误详情:', JSON.stringify(error, null, 2))
        // 显示错误信息
        alert(`获取审计日志失败: ${error.message}\n\n请检查：\n1. 数据库迁移是否已运行\n2. 您是否有管理员权限\n3. RLS策略是否正确`)
        throw error
      }

      console.log('查询到的审计日志:', data?.length || 0, '条')
      console.log('总数:', count)

      // 处理数据
      const processedData = (data || []).map((log: any) => ({
        ...log,
        user_name: log.user_name || null
      }))

      setLogs(processedData)
      setTotalCount(count || 0)
    } catch (error: any) {
      console.error('获取审计日志失败:', error)
      // 如果查询失败，尝试直接查询 audit_log 表（不使用关联）
      try {
        const { data, error: simpleError } = await supabase
          .from('audit_log')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1)

        if (simpleError) {
          console.error('简单查询也失败:', simpleError)
          console.error('错误详情:', JSON.stringify(simpleError, null, 2))
          alert(`查询审计日志失败: ${simpleError.message}\n\n请检查：\n1. 数据库迁移是否已运行\n2. 您是否有管理员权限\n3. RLS策略是否正确\n\n错误代码: ${simpleError.code || 'N/A'}`)
        } else {
          console.log('备用查询成功，获取到', data?.length || 0, '条记录')
          setLogs((data || []).map((log: any) => ({ ...log, user_name: null })))
          setTotalCount(count || data?.length || 0)
        }
      } catch (fallbackError: any) {
        console.error('备用查询也失败:', fallbackError)
        alert(`查询审计日志失败: ${fallbackError.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (logId: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedLogs(newExpanded)
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '(空)'
    
    // 处理日期时间字符串（ISO格式）
    if (typeof value === 'string') {
      // 检查是否是ISO日期时间格式
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      if (isoDateRegex.test(value)) {
        try {
          const date = new Date(value)
          if (!isNaN(date.getTime())) {
            // 格式化为本地时间：YYYY-MM-DD HH:mm:ss
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const hours = String(date.getHours()).padStart(2, '0')
            const minutes = String(date.getMinutes()).padStart(2, '0')
            const seconds = String(date.getSeconds()).padStart(2, '0')
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
          }
        } catch (e) {
          // 如果解析失败，返回原值
        }
      }
    }
    
    // 处理日期对象
    if (value instanceof Date) {
      const year = value.getFullYear()
      const month = String(value.getMonth() + 1).padStart(2, '0')
      const day = String(value.getDate()).padStart(2, '0')
      const hours = String(value.getHours()).padStart(2, '0')
      const minutes = String(value.getMinutes()).padStart(2, '0')
      const seconds = String(value.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return 'bg-green-100 text-green-800'
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800'
      case 'DELETE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6">
      {/* 标题和搜索 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">审计日志</h2>
          <p className="text-sm text-gray-600 mt-1">
            查看所有数据变更记录，共 {totalCount} 条
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Filter className="w-4 h-4" />
          <span>筛选</span>
        </button>
      </div>

      {/* 筛选器 */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                表名
              </label>
              <select
                value={filters.tableName}
                onChange={(e) =>
                  setFilters({ ...filters, tableName: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-transparent"
              >
                <option value="">全部表</option>
                {tableNames.map((table) => (
                  <option key={table} value={table}>
                    {table}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                操作类型
              </label>
              <select
                value={filters.operation}
                onChange={(e) =>
                  setFilters({ ...filters, operation: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-transparent"
              >
                <option value="">全部操作</option>
                <option value="INSERT">新增</option>
                <option value="UPDATE">修改</option>
                <option value="DELETE">删除</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                开始日期
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters({ ...filters, dateFrom: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                结束日期
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters({ ...filters, dateTo: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                搜索
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.searchTerm}
                  onChange={(e) =>
                    setFilters({ ...filters, searchTerm: e.target.value })
                  }
                  placeholder="搜索表名、字段名、用户邮箱..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() =>
                setFilters({
                  tableName: '',
                  operation: '',
                  userId: '',
                  dateFrom: '',
                  dateTo: '',
                  searchTerm: '',
                })
              }
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              清除筛选
            </button>
          </div>
        </div>
      )}

      {/* 日志列表 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading || authLoading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            暂无审计日志
            {!user && (
              <div className="mt-2 text-sm text-gray-400">
                请确保已登录并具有管理员权限
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {logs.map((log) => {
              const isExpanded = expandedLogs.has(log.id)
              return (
                <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => toggleExpand(log.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getOperationColor(
                            log.operation
                          )}`}
                        >
                          {log.operation}
                        </span>
                        <span className="flex items-center gap-1 text-sm text-gray-600">
                          <Database className="w-4 h-4" />
                          {log.table_name}
                        </span>
                        {log.field_name && (
                          <span className="flex items-center gap-1 text-sm text-gray-600">
                            <FileText className="w-4 h-4" />
                            {log.field_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {log.user_name || log.user_email || '未知用户'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatValue(log.created_at)}
                        </span>
                      </div>
                    </div>
                    <button className="ml-4 text-gray-400 hover:text-gray-600">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            旧值
                          </h4>
                          <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                            {formatValue(log.old_value)}
                          </pre>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            新值
                          </h4>
                          <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                            {formatValue(log.new_value)}
                          </pre>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">记录ID:</span>{' '}
                          <span className="font-mono text-xs">
                            {log.record_id}
                          </span>
                        </div>
                        {log.user_role && (
                          <div>
                            <span className="text-gray-600">用户角色:</span>{' '}
                            <span>{log.user_role}</span>
                          </div>
                        )}
                        {log.ip_address && (
                          <div>
                            <span className="text-gray-600">IP地址:</span>{' '}
                            <span>{log.ip_address}</span>
                          </div>
                        )}
                        {log.user_agent && (
                          <div className="md:col-span-2">
                            <span className="text-gray-600">用户代理:</span>{' '}
                            <span className="text-xs">{log.user_agent}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              第 {page} 页，共 {totalPages} 页
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

