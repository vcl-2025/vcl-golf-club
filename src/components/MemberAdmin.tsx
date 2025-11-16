import React, { useState, useEffect } from 'react'
import {
  Users, Search, Filter, Edit, Trash2, Download, Mail, Phone, Calendar,
  User, Crown, Star, CheckCircle, XCircle, UserCog, ToggleLeft, ToggleRight, Upload, UserPlus, Eye, EyeOff,
  Key, Shield, Lock
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useModal } from './ModalProvider'
import { getUserModulePermissions } from '../lib/modulePermissions'
import { useAuth } from '../hooks/useAuth'

interface Member {
  id: string
  full_name: string
  real_name?: string
  phone: string
  email: string
  membership_type: 'standard' | 'premium' | 'vip'
  role?: string
  avatar_url?: string
  handicap?: number
  clothing_size?: string
  vancouver_residence?: string
  domestic_residence?: string
  main_club_membership?: string
  industry?: string
  golf_preferences?: string
  golf_motto?: string
  other_interests?: string
  created_at: string
  last_sign_in_at?: string
  email_confirmed_at?: string
  is_active: boolean
}


export default function MemberAdmin() {
  const { user } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const modal = useModal()
  const [modulePermissions, setModulePermissions] = useState({
    can_create: false,
    can_update: false,
    can_delete: false
  })
  
  // 搜索和筛选状态
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(true)
  
  // 排序状态
  const [sortField, setSortField] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // 批量导入状态
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResults, setImportResults] = useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)

  // 注册新会员状态
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerGolfLifeName, setRegisterGolfLifeName] = useState('')
  const [registerPassword, setRegisterPassword] = useState('12345678')
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('12345678')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerError, setRegisterError] = useState('')

  // 权限管理状态
  const [selectedMemberForPermission, setSelectedMemberForPermission] = useState<Member | null>(null)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)

  // 获取可用年份
  const availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  useEffect(() => {
    fetchMembers()
    // 获取模块权限
    if (user?.id) {
      getUserModulePermissions(user.id).then(permissions => {
        setModulePermissions(permissions.members)
      }).catch(error => {
        console.error('获取模块权限失败:', error)
      })
    }
  }, [user])

  // 排序函数
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // 获取排序后的会员列表
  const getSortedMembers = () => {
    if (!sortField) return filteredMembers

    return [...filteredMembers].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'name':
          aValue = a.full_name
          bValue = b.full_name
          break
        case 'email':
          aValue = a.email
          bValue = b.email
          break
        case 'phone':
          aValue = a.phone
          bValue = b.phone
          break
        case 'role':
          aValue = a.role
          bValue = b.role
          break
        case 'status':
          aValue = a.is_active ? 'active' : 'inactive'
          bValue = b.is_active ? 'active' : 'inactive'
          break
        case 'created_at':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  useEffect(() => {
    filterMembers()
  }, [members, searchTerm, selectedRole, selectedYear, selectedMonth, showInactive])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      
      if (!supabase) return
      
      // console.log('🔍 开始获取会员数据...')
      
      // 获取所有会员信息（包含邮箱和最后登录时间）
      const response = await supabase
        .from('user_profiles')
        .select(`
          id,
          full_name,
          real_name,
          phone,
          email,
          membership_type,
          role,
          avatar_url,
          handicap,
          clothing_size,
          vancouver_residence,
          domestic_residence,
          main_club_membership,
          industry,
          golf_preferences,
          golf_motto,
          other_interests,
          created_at,
          last_sign_in_at,
          is_active
        `)
        .order('created_at', { ascending: false })

      // console.log('📊 查询结果:', response)
      
      if (response.error) {
        console.error('❌ 查询错误:', response.error)
        throw response.error
      }

      // console.log('✅ 获取到的会员数据:', response.data?.length, '条记录')
      // console.log('📋 会员详情:', response.data)

      // 处理会员数据
      // 直接使用数据库中的 is_active 字段
      const membersWithStatus = response.data || []

      // console.log('🎯 处理后的会员数据:', membersWithStatus.length, '条记录')
      setMembers(membersWithStatus)
    } catch (error) {
      console.error('获取会员信息失败:', error)
      modal.showError('获取会员信息失败: ' + (error as any)?.message || '未知错误')
    } finally {
      setLoading(false)
    }
  }


  const filterMembers = () => {
    let filtered = [...members]
    
    // console.log('🔍 开始筛选会员数据...')
    // console.log('📊 原始会员数据:', members.length, '条')
    // console.log('🎯 筛选条件:', {
    //   searchTerm,
    //   selectedRole,
    //   selectedYear,
    //   selectedMonth,
    //   showInactive
    // })

    // 搜索过滤
    if (searchTerm) {
      const beforeSearch = filtered.length
      filtered = filtered.filter(member =>
        member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.real_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.phone?.includes(searchTerm) ||
        member.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      // console.log('🔍 搜索过滤:', beforeSearch, '->', filtered.length)
    }

    // 角色过滤
    if (selectedRole !== 'all') {
      const beforeRole = filtered.length
      filtered = filtered.filter(member => member.role === selectedRole)
      // console.log('👥 角色过滤:', beforeRole, '->', filtered.length)
    }

    // 年份过滤
    if (selectedYear !== 'all') {
      const beforeYear = filtered.length
      filtered = filtered.filter(member => 
        new Date(member.created_at).getFullYear() === parseInt(selectedYear)
      )
      // console.log('📅 年份过滤:', beforeYear, '->', filtered.length)
    }

    // 月份过滤
    if (selectedMonth !== 'all') {
      const beforeMonth = filtered.length
      filtered = filtered.filter(member => 
        new Date(member.created_at).getMonth() === parseInt(selectedMonth) - 1
      )
      // console.log('📆 月份过滤:', beforeMonth, '->', filtered.length)
    }

    // 活跃状态过滤
    if (!showInactive) {
      const beforeActive = filtered.length
      const activeMembers = filtered.filter(member => member.is_active)
      const inactiveMembers = filtered.filter(member => !member.is_active)
      // console.log('⚡ 活跃状态过滤前:', beforeActive, '条 (活跃:', activeMembers.length, ', 非活跃:', inactiveMembers.length, ')')
      filtered = activeMembers
      // console.log('⚡ 活跃状态过滤后:', filtered.length, '条')
    } else {
      // console.log('⚡ 显示所有会员 (包括非活跃)')
    }

    // console.log('✅ 最终筛选结果:', filtered.length, '条')
    setFilteredMembers(filtered)
  }

  // 重置密码
  const handleResetPassword = async (memberId: string) => {
    try {
      const confirmed = await modal.confirmDelete(
        '重置密码',
        '确定要将该用户的密码重置为 12345678 吗？用户下次登录时需要使用新密码。'
      )
      if (!confirmed) return

      // 使用 Supabase Admin API 重置密码
      const { error } = await supabase.auth.admin.updateUserById(memberId, {
        password: '12345678'
      })

      if (error) throw error

      modal.showSuccess('密码已重置为 12345678')
      setShowResetPasswordModal(false)
      setSelectedMemberForPermission(null)
    } catch (error: any) {
      console.error('重置密码失败:', error)
      modal.showError('重置密码失败: ' + (error.message || '未知错误'))
    }
  }

  // 更新用户角色
  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error

      modal.showSuccess('角色已更新')
      setShowRoleModal(false)
      setSelectedMemberForPermission(null)
      await fetchMembers()
    } catch (error: any) {
      console.error('更新角色失败:', error)
      modal.showError('更新角色失败: ' + (error.message || '未知错误'))
    }
  }


  // 获取角色显示文本
  const getRoleText = (role?: string) => {
    const roleMap: Record<string, string> = {
      'admin': '超级管理员',
      'finance': '财务',
      'editor': '文档编辑者',
      'score_manager': '成绩管理员',
      'viewer': '查看者',
      'member': '普通会员'
    }
    return roleMap[role || 'member'] || '普通会员'
  }

  // 获取角色图标
  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'admin':
        return <UserCog className="w-5 h-5 text-orange-600" />
      case 'finance':
        return <Shield className="w-5 h-5 text-green-600" />
      case 'editor':
        return <Edit className="w-5 h-5 text-blue-600" />
      case 'score_manager':
        return <Star className="w-5 h-5 text-purple-600" />
      case 'viewer':
        return <Eye className="w-5 h-5 text-indigo-600" />
      default:
        return <User className="w-4 h-4 text-gray-600" />
    }
  }

  const handleToggleMemberStatus = async (memberId: string, currentStatus: boolean) => {
    try {
      if (!supabase) return
      
      const newStatus = !currentStatus
      
      // 更新 user_profiles 表的 is_active 状态
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ is_active: newStatus })
        .eq('id', memberId)

      if (profileError) throw profileError

      // 通过 RPC 调用更新 auth.users 表的 banned_until 状态
      const { error: authError } = await supabase.rpc('update_user_auth_status', {
        user_id: memberId,
        is_banned: !newStatus
      })

      if (authError) {
        console.warn('更新认证状态失败，但用户资料已更新:', authError)
        // 即使认证状态更新失败，用户资料状态已更新，继续执行
      }

      // 更新本地状态
      setMembers(members.map(m => 
        m.id === memberId ? { ...m, is_active: newStatus } : m
      ))

      const statusText = newStatus ? '启用' : '禁用'
      modal.showSuccess(`会员已${statusText}！${!newStatus ? '该用户将无法登录系统。' : ''}`)
    } catch (error) {
      console.error('更新会员状态失败:', error)
      modal.showError('更新失败，请重试')
    }
  }

  // 注册新会员
  const handleRegisterMember = async () => {
    setRegisterError('')
    
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!registerEmail || !emailRegex.test(registerEmail)) {
      setRegisterError('请输入合法的邮箱地址')
      return
    }

    // 验证密码
    if (!registerPassword || registerPassword.length < 6) {
      setRegisterError('密码长度至少为6位')
      return
    }

    // 验证两次密码是否一致
    if (registerPassword !== registerConfirmPassword) {
      setRegisterError('两次输入的密码不一致')
      return
    }

    try {
      setRegisterLoading(true)
      if (!supabase) {
        throw new Error('Supabase客户端未初始化')
      }

      // 检查当前是否有管理员登录
      const { data: currentSession } = await supabase.auth.getSession()
      if (!currentSession?.session) {
        throw new Error('请先登录管理员账户')
      }

      // 使用 Edge Function 注册用户，避免影响当前 session
      // 如果没有填写 Golf Life 用户名，使用邮箱前缀作为昵称
      const fullName = registerGolfLifeName || registerEmail.split('@')[0]
      
      const { data: functionData, error: functionError } = await supabase.functions.invoke('register-user', {
        body: {
          email: registerEmail,
          password: registerPassword,
          full_name: fullName
        }
      })

      if (functionError) {
        // 如果 Edge Function 不存在或失败，使用直接注册方式（会创建session）
        console.warn('Edge Function 注册失败，使用直接注册方式:', functionError)
        
        // 保存当前管理员的完整 session，以便注册后恢复
        const adminSession = currentSession.session
        
        // 直接注册方式（会创建 session）
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: registerEmail,
          password: registerPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          }
        })

        if (authError) throw authError

        if (!authData.user) {
          throw new Error('注册失败，未返回用户信息')
        }

        // 更新 user_profiles 表的 full_name 和 email 字段
        // 如果没有填写 Golf Life 用户名，使用邮箱前缀作为昵称
        const fullName = registerGolfLifeName || registerEmail.split('@')[0]
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ 
            full_name: fullName,
            email: registerEmail // 确保邮箱正确保存
          })
          .eq('id', authData.user.id)

        if (updateError) {
          console.warn('更新 full_name 失败:', updateError)
          // 不影响注册流程
        }

        // 如果注册时自动创建了session，需要立即恢复管理员 session
        if (authData.session) {
          // 先登出新注册的用户
          await supabase.auth.signOut()
          
          // 等待一小段时间确保登出完成
          await new Promise(resolve => setTimeout(resolve, 200))
          
          // 恢复管理员的 session
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: adminSession.access_token,
            refresh_token: adminSession.refresh_token
          })
          
          if (setSessionError) {
            console.error('恢复管理员 session 失败:', setSessionError)
            throw new Error('注册成功，但需要重新登录管理员账户。请刷新页面后重新登录。')
          }
          
          // 验证 session 是否恢复成功
          const { data: verifySession } = await supabase.auth.getSession()
          if (!verifySession?.session || verifySession.session.user.id !== adminSession.user.id) {
            throw new Error('注册成功，但无法恢复管理员 session。请刷新页面后重新登录。')
          }
        }
      } else {
        // Edge Function 注册成功，不会影响当前 session
        if (!functionData?.user) {
          throw new Error('注册失败，未返回用户信息')
        }
      }

      // 发送欢迎邮件
      try {
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: registerEmail,
            subject: '欢迎加入溫哥華華人女子高爾夫俱樂部',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #F15B98;">欢迎加入溫哥華華人女子高爾夫俱樂部！</h2>
                <p>您的账户已成功注册。</p>
                <p><strong>登录地址：</strong> <a href="${window.location.origin}">${window.location.origin}</a></p>
                <p><strong>初始密码：</strong> 12345678</p>
                <p style="color: #666; margin-top: 20px;">为了您的账户安全，请登录后尽快修改密码。</p>
                <p style="color: #666;">如有任何问题，请联系管理员。</p>
              </div>
            `
          }
        })

        if (emailError) {
          console.warn('发送邮件失败:', emailError)
          // 邮件发送失败不影响注册成功
        }
      } catch (emailErr) {
        console.warn('发送邮件时出错:', emailErr)
      }

      // 如果使用 Edge Function 注册成功，确保 full_name 已正确设置（golf life用户名或昵称）
      // Edge Function 已经设置了 full_name，这里不需要再更新
      // 但如果需要确保一致性，可以在这里再次更新

      // 刷新会员列表
      await fetchMembers()

      // 关闭模态框并重置表单
      setShowRegisterModal(false)
      setRegisterEmail('')
      setRegisterGolfLifeName('')
      setRegisterPassword('12345678')
      setRegisterConfirmPassword('12345678')
      setShowPassword(false)
      setShowConfirmPassword(false)

      modal.showSuccess('会员注册成功！欢迎邮件已发送。')
    } catch (error: any) {
      console.error('注册失败:', error)
      setRegisterError(error.message || '注册失败，请重试')
    } finally {
      setRegisterLoading(false)
    }
  }

  const exportToCSV = () => {
    const headers = ['姓名', '真实姓名', '手机号', '邮箱', '会员类型', '角色', '注册时间', '最后登录', '状态']
    const csvContent = [
      headers.join(','),
      ...filteredMembers.map(member => [
        member.full_name || '',
        member.real_name || '',
        member.phone || '',
        member.email || '',
        member.membership_type,
        member.role || '',
        new Date(member.created_at).toLocaleDateString(),
        member.last_sign_in_at ? new Date(member.last_sign_in_at).toLocaleDateString() : '从未登录',
        member.is_active ? '活跃' : '非活跃'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `会员列表_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // 处理CSV文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      modal.showError('请选择CSV文件')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const csvText = e.target?.result as string
      parseAndImportCSV(csvText)
    }
    reader.readAsText(file, 'utf-8')
  }

  // 解析CSV并批量导入
  const parseAndImportCSV = async (csvText: string) => {
    try {
      setIsImporting(true)
      setImportProgress(0)
      setImportResults(null)

      const lines = csvText.split('\n').filter(line => line.trim())
      if (lines.length < 2) {
        modal.showError('CSV文件格式不正确，至少需要标题行和一行数据')
        return
      }

      // 解析CSV数据
      const headers = lines[0].split(',').map(h => h.trim())
      const requiredHeaders = ['email', 'password', 'full_name', 'phone', 'membership_type']
      
      // 检查必需字段
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
      if (missingHeaders.length > 0) {
        modal.showError(`CSV文件缺少必需字段: ${missingHeaders.join(', ')}`)
        return
      }

      const users = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        if (values.length !== headers.length) continue

        const user: any = {}
        headers.forEach((header, index) => {
          user[header] = values[index]
        })

        // 验证必需字段
        if (user.email && user.password && user.full_name && user.phone && user.membership_type) {
          users.push(user)
        }
      }

      if (users.length === 0) {
        modal.showError('没有找到有效的用户数据')
        return
      }

      // 调用批量导入API
      if (!supabase) {
        throw new Error('Supabase客户端未初始化')
      }
      
      const { data, error } = await supabase.functions.invoke('batch-import-users', {
        body: { users }
      })

      if (error) {
        throw error
      }

      setImportResults({
        success: data.success || 0,
        failed: data.failed || 0,
        errors: data.errors || []
      })

      // 刷新会员列表
      await fetchMembers()
      
      modal.showSuccess(`批量导入完成！成功: ${data.success || 0}，失败: ${data.failed || 0}`)

    } catch (error) {
      console.error('批量导入失败:', error)
      modal.showError('批量导入失败: ' + (error as any)?.message)
    } finally {
      setIsImporting(false)
      setImportProgress(0)
    }
  }

  const getMembershipTypeIcon = (type: string) => {
    switch (type) {
      case 'vip': return <Crown className="w-4 h-4 text-yellow-500" />
      case 'premium': return <Star className="w-4 h-4 text-blue-500" />
      default: return <User className="w-4 h-4 text-gray-500" />
    }
  }

  const getMembershipTypeText = (type: string) => {
    switch (type) {
      case 'vip': return 'VIP会员'
      case 'premium': return '高级会员'
      default: return '普通会员'
    }
  }

  const getMembershipTypeColor = (type: string) => {
    switch (type) {
      case 'vip': return 'bg-yellow-100 text-yellow-800'
      case 'premium': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-golf-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 会员列表 */}
      <div className="bg-white rounded-lg shadow-sm border p-[5px] lg:p-0 m-0.5 lg:m-0">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-medium text-gray-900">
              会员列表 ({filteredMembers.length})
            </h3>
            {(searchTerm || selectedRole !== 'all' || selectedYear !== 'all' || selectedMonth !== 'all' || !showInactive) && (
              <span className="text-sm text-blue-600">
                (已过滤，共 {members.length} 个会员)
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {modulePermissions.can_create && (
              <button
                onClick={() => setShowRegisterModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-[#F15B98] text-white rounded-md hover:bg-[#E0487A] transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>注册新会员</span>
              </button>
            )}
            
            {modulePermissions.can_update && (
              <button
                onClick={exportToCSV}
                className="flex items-center space-x-2 px-4 py-2 bg-golf-600 text-white rounded-md hover:bg-golf-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>导出CSV</span>
              </button>
            )}
            
            {modulePermissions.can_create && (
              <label className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{isImporting ? '导入中...' : '批量导入'}</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isImporting}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* 导入结果显示 */}
        {importResults && (
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-green-700 font-medium">成功: {importResults.success}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-red-700 font-medium">失败: {importResults.failed}</span>
                </div>
              </div>
              <button
                onClick={() => setImportResults(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            {importResults.errors.length > 0 && (
              <div className="mt-2 text-sm text-red-600">
                <div className="font-medium">错误详情:</div>
                <ul className="list-disc list-inside ml-4">
                  {importResults.errors.slice(0, 5).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {importResults.errors.length > 5 && (
                    <li>...还有 {importResults.errors.length - 5} 个错误</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 搜索和筛选 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
            {/* 搜索框 */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="搜索会员姓名、手机号或邮箱..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500 text-sm"
                />
              </div>
            </div>

            {/* 年份选择 */}
            <div className="w-32">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500 appearance-none bg-white text-sm"
                >
                  <option value="all">全部年份</option>
                  {availableYears.map(year => (
                    <option key={year} value={year.toString()}>{year}年</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 月份选择 */}
            <div className="w-32">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500 appearance-none bg-white text-sm"
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

            {/* 角色选择 */}
            <div className="w-32">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-golf-500 appearance-none bg-white text-sm"
                >
                  <option value="all">所有角色</option>
                  <option value="admin">超级管理员</option>
                  <option value="finance">财务</option>
                  <option value="editor">文档编辑者</option>
                  <option value="score_manager">成绩管理员</option>
                  <option value="viewer">查看者</option>
                  <option value="member">普通会员</option>
                </select>
              </div>
            </div>

            {/* 清除筛选按钮 - 只在有筛选条件时显示 */}
            {(searchTerm || selectedRole !== 'all' || selectedYear !== 'all' || selectedMonth !== 'all' || !showInactive) && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedRole('all')
                  setSelectedYear('all')
                  setSelectedMonth('all')
                  setShowInactive(true)
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                清除所有筛选
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-600">显示所有会员 (包括非活跃)</span>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-4 text-left text-base font-semibold text-gray-700 cursor-pointer hover:bg-green-100 select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>会员信息</span>
                    {sortField === 'name' && (
                      <span className="text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-base font-semibold text-gray-700 cursor-pointer hover:bg-green-100 select-none"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center space-x-1">
                    <span>联系方式</span>
                    {sortField === 'email' && (
                      <span className="text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-base font-semibold text-gray-700 cursor-pointer hover:bg-green-100 select-none"
                  onClick={() => handleSort('role')}
                >
                  <div className="flex items-center space-x-1">
                    <span>角色</span>
                    {sortField === 'role' && (
                      <span className="text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
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
                <th 
                  className="px-6 py-4 text-left text-base font-semibold text-gray-700 cursor-pointer hover:bg-green-100 select-none"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center space-x-1">
                    <span>注册时间</span>
                    {sortField === 'created_at' && (
                      <span className="text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                {(modulePermissions.can_update || modulePermissions.can_delete) && (
                  <th className="px-6 py-4 text-left text-base font-semibold text-gray-700">
                    操作
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getSortedMembers().map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-golf-100 overflow-hidden">
                          {member.avatar_url ? (
                            <img 
                              src={member.avatar_url} 
                              alt={member.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <User className="h-6 w-6 text-golf-600" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {member.full_name}
                        </div>
                        {member.real_name && (
                          <div className="text-sm text-gray-500">
                            真实姓名: {member.real_name}
                          </div>
                        )}
                        <div className="flex items-center space-x-3 text-xs text-gray-400 mt-1">
                          {member.handicap && (
                            <span className="flex items-center space-x-1">
                              <span>🏌️</span>
                              <span>差点: {member.handicap}</span>
                            </span>
                          )}
                          {member.industry && (
                            <span className="flex items-center space-x-1">
                              <span>💼</span>
                              <span>{member.industry}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center space-x-1">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{member.phone || '未设置'}</span>
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">{member.email || '未设置'}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-gray-400 mt-1">
                        {member.vancouver_residence && (
                          <span className="flex items-center space-x-1">
                            <span>📍</span>
                            <span>{member.vancouver_residence}</span>
                          </span>
                        )}
                        {member.clothing_size && (
                          <span className="flex items-center space-x-1">
                            <span>👕</span>
                            <span>{member.clothing_size}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <div className="flex items-center space-x-1">
                          {getRoleIcon(member.role)}
                          <span className={`text-sm font-semibold px-2 py-1 rounded-full ${
                            member.role === 'admin' ? 'text-orange-700 bg-orange-50' :
                            member.role === 'finance' ? 'text-green-700 bg-green-50' :
                            member.role === 'editor' ? 'text-blue-700 bg-blue-50' :
                            member.role === 'score_manager' ? 'text-purple-700 bg-purple-50' :
                            member.role === 'viewer' ? 'text-indigo-700 bg-indigo-50' :
                            'text-gray-900 bg-gray-50'
                          }`}>
                            {getRoleText(member.role)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {member.main_club_membership && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center space-x-1">
                        <span>🏆</span>
                        <span className="truncate max-w-32" title={member.main_club_membership}>
                          {member.main_club_membership}
                        </span>
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {member.is_active ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`text-sm ${member.is_active ? 'text-green-600' : 'text-red-600'}`}>
                        {member.is_active ? '活跃' : '非活跃'}
                      </span>
                    </div>
                    {member.last_sign_in_at && (
                      <div className="text-xs text-gray-500 mt-1">
                        最后登录: {new Date(member.last_sign_in_at).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                  
                  {(modulePermissions.can_update || modulePermissions.can_delete) && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2 flex-wrap gap-2">
                        {modulePermissions.can_update && (
                          <>
                            <button
                              onClick={() => handleToggleMemberStatus(member.id, member.is_active)}
                              className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                member.is_active 
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                              title={member.is_active ? '当前已启用，点击禁用' : '当前已禁用，点击启用'}
                            >
                              {member.is_active ? (
                                <>
                                  <ToggleRight className="w-4 h-4" />
                                  <span>已启用</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="w-4 h-4" />
                                  <span>已禁用</span>
                                </>
                              )}
                            </button>
                            
                            {/* 权限管理按钮 */}
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedMemberForPermission(member)
                                  setShowResetPasswordModal(true)
                                }}
                                className="flex items-center justify-center w-7 h-7 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                                title="重置密码"
                              >
                                <Key className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => {
                                  setSelectedMemberForPermission(member)
                                  setShowRoleModal(true)
                                }}
                                className="flex items-center justify-center w-7 h-7 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                                title="分配角色"
                              >
                                <Shield className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredMembers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchTerm || selectedRole !== 'all' || selectedYear !== 'all' || selectedMonth !== 'all' || showInactive
              ? '没有找到匹配的会员'
              : '暂无会员数据'
            }
          </div>
        )}
      </div>

      {/* 注册新会员模态框 */}
      {showRegisterModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
          onClick={() => !registerLoading && setShowRegisterModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">注册新会员</h3>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              {/* 邮箱输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  邮箱 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder="请输入合法邮箱地址"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F15B98] focus:border-transparent"
                  disabled={registerLoading}
                />
              </div>

              {/* Golf Life 用户名输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Golf Life 用户名
                  <span className="text-xs text-gray-500 ml-2">(用于导入数据)</span>
                </label>
                <input
                  type="text"
                  value={registerGolfLifeName}
                  onChange={(e) => setRegisterGolfLifeName(e.target.value)}
                  placeholder="请输入 Golf Life 用户名"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F15B98] focus:border-transparent"
                  disabled={registerLoading}
                />
              </div>

              {/* 密码输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  密码 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="默认密码：12345678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F15B98] focus:border-transparent pr-10"
                    disabled={registerLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={registerLoading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* 确认密码输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  确认密码 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F15B98] focus:border-transparent pr-10"
                    disabled={registerLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={registerLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* 错误提示 */}
              {registerError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {registerError}
                </div>
              )}

              {/* 提示信息 */}
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-sm">
                <p>• 默认密码为：<strong>12345678</strong></p>
                <p>• 注册成功后，系统将自动发送欢迎邮件给新会员</p>
                <p>• 邮件中包含登录地址和初始密码</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  if (!registerLoading) {
                    setShowRegisterModal(false)
                    setRegisterError('')
                    setRegisterEmail('')
                    setRegisterGolfLifeName('')
                    setRegisterPassword('12345678')
                    setRegisterConfirmPassword('12345678')
                    setShowPassword(false)
                    setShowConfirmPassword(false)
                  }
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={registerLoading}
              >
                取消
              </button>
              <button
                onClick={handleRegisterMember}
                disabled={registerLoading}
                className="px-4 py-2 bg-[#F15B98] text-white rounded-md hover:bg-[#E0487A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {registerLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{registerLoading ? '注册中...' : '确认注册'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 重置密码模态框 */}
      {showResetPasswordModal && selectedMemberForPermission && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
          onClick={() => setShowResetPasswordModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Key className="w-5 h-5 text-blue-600" />
                <span>重置密码</span>
              </h3>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-sm">
                <p><strong>用户：</strong>{selectedMemberForPermission.full_name}</p>
                <p><strong>邮箱：</strong>{selectedMemberForPermission.email}</p>
                <p className="mt-2">密码将被重置为：<strong>12345678</strong></p>
                <p className="mt-1 text-xs">用户下次登录时需要使用新密码。</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowResetPasswordModal(false)
                  setSelectedMemberForPermission(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleResetPassword(selectedMemberForPermission.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Lock className="w-4 h-4" />
                <span>确认重置</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 角色分配模态框 */}
      {showRoleModal && selectedMemberForPermission && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
          onClick={() => setShowRoleModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <span>分配角色</span>
              </h3>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>用户：</strong>{selectedMemberForPermission.full_name} ({selectedMemberForPermission.email})
                </p>
                <p className="text-sm text-gray-600">
                  <strong>当前角色：</strong>{getRoleText(selectedMemberForPermission.role)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择新角色
                </label>
                <select
                  value={selectedMemberForPermission.role || 'member'}
                  onChange={(e) => {
                    setSelectedMemberForPermission({
                      ...selectedMemberForPermission,
                      role: e.target.value
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="member">普通会员</option>
                  <option value="admin">超级管理员</option>
                  <option value="finance">财务</option>
                  <option value="editor">文档编辑者</option>
                  <option value="score_manager">成绩管理员</option>
                  <option value="viewer">查看者</option>
                </select>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md text-sm">
                <p><strong>角色说明：</strong></p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li><strong>超级管理员：</strong>所有权限</li>
                  <li><strong>财务：</strong>费用和投资管理</li>
                  <li><strong>文档编辑者：</strong>信息中心、海报、活动内容编辑</li>
                  <li><strong>成绩管理员：</strong>成绩管理</li>
                  <li><strong>查看者：</strong>可查看所有模块，不能操作（适合领导）</li>
                  <li><strong>普通会员：</strong>只读权限</li>
                </ul>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRoleModal(false)
                  setSelectedMemberForPermission(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (selectedMemberForPermission.role) {
                    handleUpdateRole(selectedMemberForPermission.id, selectedMemberForPermission.role)
                  }
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center space-x-2"
              >
                <Shield className="w-4 h-4" />
                <span>确认分配</span>
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}
