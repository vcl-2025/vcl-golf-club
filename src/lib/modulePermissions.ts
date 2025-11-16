/**
 * 模块权限管理
 * 用于检查用户是否有权限访问特定模块
 */

import { supabase } from './supabase'

export type ModuleName = 'members' | 'events' | 'scores' | 'expenses' | 'information' | 'posters' | 'investments' | 'audit'

export interface ModulePermission {
  can_access: boolean
  can_create: boolean
  can_update: boolean
  can_delete: boolean
}

/**
 * 获取用户的模块权限
 */
export async function getUserModulePermissions(userId: string): Promise<Record<ModuleName, ModulePermission>> {
  try {
    // 获取用户角色
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('获取用户角色失败:', profileError)
      return getDefaultPermissions()
    }

    const role = profile.role || 'member'

    // admin 拥有所有权限
    if (role === 'admin') {
      return getAllPermissions()
    }

    // 获取模块权限
    const { data: permissions, error: permError } = await supabase
      .from('module_permissions')
      .select('module, can_access, can_create, can_update, can_delete')
      .eq('role', role)

    if (permError) {
      console.error('获取模块权限失败:', permError)
      return getDefaultPermissions()
    }

    // 构建权限对象
    const result: Record<ModuleName, ModulePermission> = {
      members: { can_access: false, can_create: false, can_update: false, can_delete: false },
      events: { can_access: false, can_create: false, can_update: false, can_delete: false },
      scores: { can_access: false, can_create: false, can_update: false, can_delete: false },
      expenses: { can_access: false, can_create: false, can_update: false, can_delete: false },
      information: { can_access: false, can_create: false, can_update: false, can_delete: false },
      posters: { can_access: false, can_create: false, can_update: false, can_delete: false },
      investments: { can_access: false, can_create: false, can_update: false, can_delete: false },
      audit: { can_access: false, can_create: false, can_update: false, can_delete: false }
    }

    permissions?.forEach((perm: any) => {
      if (perm.module in result) {
        result[perm.module as ModuleName] = {
          can_access: perm.can_access === true,
          can_create: perm.can_create === true,
          can_update: perm.can_update === true,
          can_delete: perm.can_delete === true
        }
      }
    })

    return result
  } catch (error) {
    console.error('获取模块权限时出错:', error)
    return getDefaultPermissions()
  }
}

/**
 * 检查用户是否可以访问模块
 */
export async function canAccessModule(userId: string, module: ModuleName): Promise<boolean> {
  try {
    const permissions = await getUserModulePermissions(userId)
    return permissions[module]?.can_access || false
  } catch (error) {
    console.error('检查模块权限时出错:', error)
    return false
  }
}

/**
 * 检查用户是否可以在模块中执行操作
 */
export async function canOperateModule(
  userId: string,
  module: ModuleName,
  operation: 'create' | 'update' | 'delete'
): Promise<boolean> {
  try {
    const permissions = await getUserModulePermissions(userId)
    const modulePerm = permissions[module]
    if (!modulePerm?.can_access) {
      return false
    }

    switch (operation) {
      case 'create':
        return modulePerm.can_create || false
      case 'update':
        return modulePerm.can_update || false
      case 'delete':
        return modulePerm.can_delete || false
      default:
        return false
    }
  } catch (error) {
    console.error('检查操作权限时出错:', error)
    return false
  }
}

/**
 * 获取所有权限（admin）
 */
function getAllPermissions(): Record<ModuleName, ModulePermission> {
  return {
    members: { can_access: true, can_create: true, can_update: true, can_delete: true },
    events: { can_access: true, can_create: true, can_update: true, can_delete: true },
    scores: { can_access: true, can_create: true, can_update: true, can_delete: true },
    expenses: { can_access: true, can_create: true, can_update: true, can_delete: true },
    information: { can_access: true, can_create: true, can_update: true, can_delete: true },
    posters: { can_access: true, can_create: true, can_update: true, can_delete: true },
    investments: { can_access: true, can_create: true, can_update: true, can_delete: true },
    audit: { can_access: true, can_create: true, can_update: false, can_delete: false }
  }
}

/**
 * 获取默认权限（无权限）
 */
function getDefaultPermissions(): Record<ModuleName, ModulePermission> {
  return {
    members: { can_access: false, can_create: false, can_update: false, can_delete: false },
    events: { can_access: false, can_create: false, can_update: false, can_delete: false },
    scores: { can_access: false, can_create: false, can_update: false, can_delete: false },
    expenses: { can_access: false, can_create: false, can_update: false, can_delete: false },
    information: { can_access: false, can_create: false, can_update: false, can_delete: false },
    posters: { can_access: false, can_create: false, can_update: false, can_delete: false },
    investments: { can_access: false, can_create: false, can_update: false, can_delete: false },
    audit: { can_access: false, can_create: false, can_update: false, can_delete: false }
  }
}

