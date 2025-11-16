import React, { useState, useEffect } from 'react'
import { Shield, Settings, Save, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useModal } from './ModalProvider'

type Role = 'admin' | 'finance' | 'editor' | 'score_manager' | 'viewer' | 'member'
type ModuleName = 'members' | 'events' | 'scores' | 'expenses' | 'information' | 'posters' | 'investments' | 'audit'

interface ModulePermission {
  can_access: boolean
  can_create: boolean
  can_update: boolean
  can_delete: boolean
}

interface RolePermissions {
  [role: string]: {
    [module: string]: ModulePermission
  }
}

const moduleNames: Record<ModuleName, string> = {
  'members': '会员管理',
  'events': '活动管理',
  'scores': '成绩管理',
  'expenses': '费用管理',
  'information': '信息中心',
  'posters': '海报管理',
  'investments': '投资管理',
  'audit': '审计日志'
}

const roleNames: Record<Role, string> = {
  'admin': '超级管理员',
  'finance': '财务',
  'editor': '文档编辑者',
  'score_manager': '成绩管理员',
  'viewer': '查看者',
  'member': '普通会员'
}

const allRoles: Role[] = ['admin', 'finance', 'editor', 'score_manager', 'viewer', 'member']
const allModules: ModuleName[] = ['members', 'events', 'scores', 'expenses', 'information', 'posters', 'investments', 'audit']

export default function RolePermissionsManager() {
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const modal = useModal()

  useEffect(() => {
    fetchRolePermissions()
  }, [])

  const fetchRolePermissions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('module_permissions')
        .select('*')
        .order('role')
        .order('module')

      if (error) throw error

      const permissions: RolePermissions = {}
      
      // 初始化所有角色和模块
      allRoles.forEach(role => {
        permissions[role] = {}
        allModules.forEach(module => {
          permissions[role][module] = {
            can_access: false,
            can_create: false,
            can_update: false,
            can_delete: false
          }
        })
      })

      // 填充数据库中的权限
      data?.forEach((perm: any) => {
        if (perm.role && perm.module) {
          permissions[perm.role][perm.module] = {
            can_access: perm.can_access || false,
            can_create: perm.can_create || false,
            can_update: perm.can_update || false,
            can_delete: perm.can_delete || false
          }
        }
      })

      // admin 默认拥有所有权限
      allModules.forEach(module => {
        permissions['admin'][module] = {
          can_access: true,
          can_create: true,
          can_update: true,
          can_delete: module === 'audit' ? false : true
        }
      })

      setRolePermissions(permissions)
      if (!selectedRole) {
        setSelectedRole('finance') // 默认选择财务角色
      }
    } catch (error: any) {
      console.error('获取角色权限失败:', error)
      modal.showError('获取角色权限失败: ' + (error.message || '未知错误'))
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionChange = (role: Role, module: ModuleName, field: keyof ModulePermission, value: boolean) => {
    setRolePermissions(prev => {
      const newPerms = { ...prev }
      if (!newPerms[role]) {
        newPerms[role] = {}
      }
      if (!newPerms[role][module]) {
        newPerms[role][module] = {
          can_access: false,
          can_create: false,
          can_update: false,
          can_delete: false
        }
      }

      newPerms[role][module] = {
        ...newPerms[role][module],
        [field]: value
      }

      // 如果取消访问权限，同时取消所有操作权限
      if (field === 'can_access' && !value) {
        newPerms[role][module] = {
          can_access: false,
          can_create: false,
          can_update: false,
          can_delete: false
        }
      }

      return newPerms
    })
  }

  const handleSave = async () => {
    if (!selectedRole) return

    try {
      setSaving(true)

      // admin 角色不允许修改（始终拥有所有权限）
      if (selectedRole === 'admin') {
        modal.showWarning('超级管理员拥有所有权限，无需修改')
        return
      }

      const updates = allModules.map(module => {
        const perm = rolePermissions[selectedRole][module]
        return {
          role: selectedRole,
          module,
          can_access: perm.can_access || false,
          can_create: perm.can_create || false,
          can_update: perm.can_update || false,
          can_delete: perm.can_delete || false
        }
      })

      // 使用 upsert 更新权限
      for (const update of updates) {
        const { error } = await supabase
          .from('module_permissions')
          .upsert(update, { onConflict: 'role,module' })

        if (error) throw error
      }

      modal.showSuccess('角色权限已保存')
    } catch (error: any) {
      console.error('保存角色权限失败:', error)
      modal.showError('保存角色权限失败: ' + (error.message || '未知错误'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-[5px] lg:p-6 m-0.5 lg:m-0 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900">角色权限管理</h2>
        </div>
        <button
          onClick={fetchRolePermissions}
          className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>刷新</span>
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-700">
          <strong>说明：</strong>权限是基于角色的，修改某个角色的权限会影响所有该角色的用户。超级管理员拥有所有权限，无需配置。
        </p>
      </div>

      {/* 角色选择 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择要配置的角色
        </label>
        <div className="flex flex-wrap gap-2">
          {allRoles.map(role => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedRole === role
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {roleNames[role]}
            </button>
          ))}
        </div>
      </div>

      {selectedRole && (
        <div className="space-y-4">
          {selectedRole === 'admin' ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <Shield className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="text-lg font-semibold text-green-700 mb-2">超级管理员</p>
              <p className="text-sm text-green-600">拥有所有模块的完整权限，无需单独配置</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  配置 {roleNames[selectedRole]} 的权限
                </h3>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>保存中...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>保存权限</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-3">
                {allModules.map(module => {
                  const perm = rolePermissions[selectedRole]?.[module] || {
                    can_access: false,
                    can_create: false,
                    can_update: false,
                    can_delete: false
                  }

                  return (
                    <div key={module} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">{moduleNames[module]}</h4>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={perm.can_access}
                            onChange={(e) => handlePermissionChange(selectedRole, module, 'can_access', e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-700">允许访问</span>
                        </label>
                      </div>
                      
                      {perm.can_access && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={perm.can_create}
                              onChange={(e) => handlePermissionChange(selectedRole, module, 'can_create', e.target.checked)}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <span className="text-xs text-gray-600">创建</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={perm.can_update}
                              onChange={(e) => handlePermissionChange(selectedRole, module, 'can_update', e.target.checked)}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <span className="text-xs text-gray-600">更新</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={perm.can_delete}
                              onChange={(e) => handlePermissionChange(selectedRole, module, 'can_delete', e.target.checked)}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <span className="text-xs text-gray-600">删除</span>
                          </label>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

