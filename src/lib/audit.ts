/**
 * 审计工具函数
 * 提供统一的数据修改入口，自动记录审计日志
 */

import { supabase } from './supabase'
import { canModifyField, canModifyFields, type UserRole } from './fieldPermissions'

export interface AuditContext {
  userId: string
  userEmail?: string
  userRole?: UserRole
  ipAddress?: string
  userAgent?: string
}

export interface AuditLogEntry {
  table_name: string
  record_id: string
  field_name?: string
  old_value?: any
  new_value?: any
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  user_id: string
  user_email?: string
  user_role?: string
  ip_address?: string
  user_agent?: string
}

/**
 * 获取客户端IP地址和User Agent
 */
function getClientInfo(): { ipAddress?: string; userAgent?: string } {
  if (typeof window === 'undefined') {
    return {}
  }

  return {
    userAgent: navigator.userAgent,
    // 注意：前端无法直接获取真实IP，需要通过后端API获取
    // 这里可以留空，或者通过Edge Function获取
    ipAddress: undefined,
  }
}

/**
 * 获取用户信息（用于审计日志）
 */
async function getUserInfo(userId: string): Promise<{
  email?: string
  role?: UserRole
}> {
  if (!supabase) return {}

  try {
    // 获取用户邮箱
    const { data: authData } = await supabase.auth.getUser()
    const email = authData?.user?.email

    // 获取用户角色
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single()

    return {
      email: email || undefined,
      role: (profileData?.role as UserRole) || undefined,
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return {}
  }
}

/**
 * 记录审计日志
 */
async function logAudit(entries: AuditLogEntry[]): Promise<void> {
  if (!supabase) {
    console.warn('Supabase不可用，无法记录审计日志')
    return
  }

  try {
    const { error } = await supabase.from('audit_log').insert(entries)

    if (error) {
      console.error('记录审计日志失败:', error)
      // 注意：审计日志失败不应该阻止主操作，但应该记录错误
    }
  } catch (error) {
    console.error('记录审计日志异常:', error)
  }
}

/**
 * 创建审计上下文
 */
export async function createAuditContext(userId: string): Promise<AuditContext> {
  const clientInfo = getClientInfo()
  const userInfo = await getUserInfo(userId)

  return {
    userId,
    userEmail: userInfo.email,
    userRole: userInfo.role,
    ipAddress: clientInfo.ipAddress,
    userAgent: clientInfo.userAgent,
  }
}

/**
 * 带审计的更新操作
 * @param tableName 表名
 * @param recordId 记录ID
 * @param changes 要修改的字段和值
 * @param context 审计上下文
 * @param userRole 用户角色（用于权限检查）
 * @returns 更新结果
 */
export async function updateWithAudit<T = any>(
  tableName: string,
  recordId: string,
  changes: Record<string, any>,
  context: AuditContext,
  userRole: UserRole
): Promise<{ data: T | null; error: any }> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase不可用') }
  }

  // 1. 权限检查
  const fields = Object.keys(changes)
  const permissionCheck = canModifyFields(tableName, fields, userRole)

  if (!permissionCheck.allowed) {
    return {
      data: null,
      error: new Error(
        `无权限修改字段: ${permissionCheck.deniedFields.join(', ')}`
      ),
    }
  }

  // 2. 获取旧数据
  const { data: oldData, error: fetchError } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', recordId)
    .single()

  if (fetchError) {
    return { data: null, error: fetchError }
  }

  if (!oldData) {
    return { data: null, error: new Error('记录不存在') }
  }

  // 3. 执行更新
  const { data: newData, error: updateError } = await supabase
    .from(tableName)
    .update(changes)
    .eq('id', recordId)
    .select()
    .single()

  if (updateError) {
    return { data: null, error: updateError }
  }

  // 4. 记录审计日志（字段级别）
  // 辅助函数：比较两个值是否相等（处理日期、null、undefined等特殊情况）
  const valuesEqual = (oldVal: any, newVal: any): boolean => {
    // 处理 null 和 undefined
    if (oldVal === null || oldVal === undefined) {
      return newVal === null || newVal === undefined
    }
    if (newVal === null || newVal === undefined) {
      return false
    }

    // 处理日期类型：统一转换为ISO字符串进行比较
    if (oldVal instanceof Date || newVal instanceof Date) {
      const oldDate = oldVal instanceof Date ? oldVal.toISOString() : new Date(oldVal).toISOString()
      const newDate = newVal instanceof Date ? newVal.toISOString() : new Date(newVal).toISOString()
      // 比较到秒级精度（忽略毫秒差异）
      return oldDate.substring(0, 19) === newDate.substring(0, 19)
    }

    // 处理字符串日期格式（ISO格式）
    if (typeof oldVal === 'string' && typeof newVal === 'string') {
      // 检查是否是ISO日期格式
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      if (isoDateRegex.test(oldVal) && isoDateRegex.test(newVal)) {
        // 比较到秒级精度
        return oldVal.substring(0, 19) === newVal.substring(0, 19)
      }
    }

    // 处理数字类型：使用精度比较
    if (typeof oldVal === 'number' && typeof newVal === 'number') {
      return Math.abs(oldVal - newVal) < 0.0001
    }

    // 其他类型：使用深度比较
    try {
      return JSON.stringify(oldVal) === JSON.stringify(newVal)
    } catch {
      // 如果JSON序列化失败，使用严格相等
      return oldVal === newVal
    }
  }

  const auditEntries: AuditLogEntry[] = fields
    .filter((field) => {
      // 只记录实际发生变化的字段
      const oldValue = oldData[field]
      const newValue = changes[field]
      
      // 如果字段不在旧数据中，且新值为null/undefined，则不记录
      if (oldValue === undefined && (newValue === null || newValue === undefined)) {
        return false
      }
      
      return !valuesEqual(oldValue, newValue)
    })
    .map((field) => ({
      table_name: tableName,
      record_id: recordId,
      field_name: field,
      old_value: oldData[field] !== undefined ? oldData[field] : null,
      new_value: changes[field] !== undefined ? changes[field] : null,
      operation: 'UPDATE' as const,
      user_id: context.userId,
      user_email: context.userEmail,
      user_role: context.userRole,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
    }))

  if (auditEntries.length > 0) {
    await logAudit(auditEntries)
  }

  return { data: newData as T, error: null }
}

/**
 * 带审计的插入操作
 * @param tableName 表名
 * @param data 要插入的数据
 * @param context 审计上下文
 * @param userRole 用户角色（用于权限检查）
 * @returns 插入结果
 */
export async function insertWithAudit<T = any>(
  tableName: string,
  data: Record<string, any>,
  context: AuditContext,
  userRole: UserRole
): Promise<{ data: T | null; error: any }> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase不可用') }
  }

  // 1. 权限检查
  const fields = Object.keys(data)
  const permissionCheck = canModifyFields(tableName, fields, userRole)

  if (!permissionCheck.allowed) {
    return {
      data: null,
      error: new Error(
        `无权限创建字段: ${permissionCheck.deniedFields.join(', ')}`
      ),
    }
  }

  // 2. 执行插入
  const { data: newData, error: insertError } = await supabase
    .from(tableName)
    .insert(data)
    .select()
    .single()

  if (insertError) {
    return { data: null, error: insertError }
  }

  // 3. 记录审计日志
  const recordId = newData.id || (newData as any).id

  if (!recordId) {
    return { data: newData as T, error: null }
  }

  const auditEntry: AuditLogEntry = {
    table_name: tableName,
    record_id: recordId,
    field_name: undefined, // 插入操作不记录具体字段
    old_value: null,
    new_value: data,
    operation: 'INSERT',
    user_id: context.userId,
    user_email: context.userEmail,
    user_role: context.userRole,
    ip_address: context.ipAddress,
    user_agent: context.userAgent,
  }

  await logAudit([auditEntry])

  return { data: newData as T, error: null }
}

/**
 * 带审计的删除操作
 * @param tableName 表名
 * @param recordId 记录ID
 * @param context 审计上下文
 * @param userRole 用户角色（用于权限检查）
 * @returns 删除结果
 */
export async function deleteWithAudit(
  tableName: string,
  recordId: string,
  context: AuditContext,
  userRole: UserRole
): Promise<{ error: any }> {
  if (!supabase) {
    return { error: new Error('Supabase不可用') }
  }

  // 删除操作通常只有管理员可以执行
  if (userRole !== 'admin') {
    return { error: new Error('无权限删除记录') }
  }

  // 1. 获取旧数据（用于审计日志）
  const { data: oldData, error: fetchError } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', recordId)
    .single()

  if (fetchError) {
    return { error: fetchError }
  }

  // 2. 执行删除
  const { error: deleteError } = await supabase
    .from(tableName)
    .delete()
    .eq('id', recordId)

  if (deleteError) {
    return { error: deleteError }
  }

  // 3. 记录审计日志
  const auditEntry: AuditLogEntry = {
    table_name: tableName,
    record_id: recordId,
    field_name: undefined, // 删除操作不记录具体字段
    old_value: oldData,
    new_value: null,
    operation: 'DELETE',
    user_id: context.userId,
    user_email: context.userEmail,
    user_role: context.userRole,
    ip_address: context.ipAddress,
    user_agent: context.userAgent,
  }

  await logAudit([auditEntry])

  return { error: null }
}

/**
 * 批量更新（带审计）
 * 用于一次更新多条记录
 */
export async function batchUpdateWithAudit<T = any>(
  tableName: string,
  updates: Array<{ id: string; changes: Record<string, any> }>,
  context: AuditContext,
  userRole: UserRole
): Promise<{ data: T[] | null; error: any }> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase不可用') }
  }

  const results: T[] = []
  const auditEntries: AuditLogEntry[] = []

  for (const update of updates) {
    // 权限检查
    const fields = Object.keys(update.changes)
    const permissionCheck = canModifyFields(tableName, fields, userRole)

    if (!permissionCheck.allowed) {
      continue // 跳过无权限的记录
    }

    // 获取旧数据
    const { data: oldData } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', update.id)
      .single()

    if (!oldData) continue

    // 执行更新
    const { data: newData, error } = await supabase
      .from(tableName)
      .update(update.changes)
      .eq('id', update.id)
      .select()
      .single()

    if (error || !newData) continue

    results.push(newData as T)

    // 收集审计日志
    fields.forEach((field) => {
      const oldValue = oldData[field]
      const newValue = update.changes[field]
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        auditEntries.push({
          table_name: tableName,
          record_id: update.id,
          field_name: field,
          old_value: oldValue !== undefined ? oldValue : null,
          new_value: newValue !== undefined ? newValue : null,
          operation: 'UPDATE',
          user_id: context.userId,
          user_email: context.userEmail,
          user_role: context.userRole,
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
        })
      }
    })
  }

  // 批量记录审计日志
  if (auditEntries.length > 0) {
    await logAudit(auditEntries)
  }

  return { data: results, error: null }
}

/**
 * 记录批量操作的简单审计日志
 * 只记录操作者、时间等基本信息，不记录每条记录的详情
 * @param tableName 表名
 * @param operation 操作类型（如 'BATCH_INSERT', 'BATCH_DELETE'）
 * @param recordCount 操作的记录数量
 * @param context 审计上下文
 * @param additionalInfo 额外信息（如 event_id）
 */
export async function logBatchOperation(
  tableName: string,
  operation: string,
  recordCount: number,
  context: AuditContext,
  additionalInfo?: Record<string, any>
): Promise<void> {
  if (!supabase) {
    console.warn('Supabase不可用，无法记录审计日志')
    return
  }

  try {
    const auditEntry: AuditLogEntry = {
      table_name: tableName,
      record_id: 'batch_operation', // 批量操作使用特殊ID
      field_name: undefined,
      old_value: null,
      new_value: {
        operation,
        record_count: recordCount,
        ...additionalInfo,
      },
      operation: operation as any,
      user_id: context.userId,
      user_email: context.userEmail,
      user_role: context.userRole,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
    }

    await logAudit([auditEntry])
  } catch (error) {
    console.error('记录批量操作审计日志失败:', error)
  }
}

