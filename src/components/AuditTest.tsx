/**
 * 审计功能测试组件
 * 用于测试审计功能是否正常工作
 */

import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { updateWithAudit, insertWithAudit, createAuditContext } from '../lib/audit'
import { useAuth } from '../hooks/useAuth'
import { useModal } from './ModalProvider'

export default function AuditTest() {
  const { user } = useAuth()
  const { showSuccess, showError } = useModal()
  const [testing, setTesting] = useState(false)

  const testAudit = async () => {
    if (!user || !supabase) {
      showError('请先登录')
      return
    }

    setTesting(true)
    try {
      // 1. 获取用户角色
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const userRole = (profile?.role || 'member') as 'admin' | 'member' | 'editor'

      // 2. 创建审计上下文
      const context = await createAuditContext(user.id)

      // 3. 测试插入操作
      const testData = {
        title: `审计测试活动 - ${new Date().toLocaleString()}`,
        description: '这是一个审计功能测试活动',
        start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
        location: '测试球场',
        fee: 0,
        max_participants: 10,
        registration_deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        event_type: '普通活动',
      }

      const { data: insertedData, error: insertError } = await insertWithAudit(
        'events',
        testData,
        context,
        userRole
      )

      if (insertError) {
        showError(`插入测试失败: ${insertError.message}`)
        return
      }

      if (!insertedData) {
        showError('插入测试失败: 没有返回数据')
        return
      }

      // 4. 等待一下，确保审计日志已写入
      await new Promise(resolve => setTimeout(resolve, 500))

      // 5. 测试更新操作
      const { data: updatedData, error: updateError } = await updateWithAudit(
        'events',
        insertedData.id,
        { title: `审计测试活动（已更新） - ${new Date().toLocaleString()}` },
        context,
        userRole
      )

      if (updateError) {
        showError(`更新测试失败: ${updateError.message}`)
        return
      }

      // 6. 检查审计日志
      await new Promise(resolve => setTimeout(resolve, 500))

      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_log')
        .select('*')
        .eq('record_id', insertedData.id)
        .order('created_at', { ascending: false })

      if (auditError) {
        showError(`查询审计日志失败: ${auditError.message}`)
        return
      }

      // 7. 清理测试数据
      await supabase
        .from('events')
        .delete()
        .eq('id', insertedData.id)

      showSuccess(
        `审计功能测试成功！\n` +
        `- 创建了测试活动\n` +
        `- 更新了活动标题\n` +
        `- 记录了 ${auditLogs?.length || 0} 条审计日志\n` +
        `- 已清理测试数据\n\n` +
        `请到"审计日志"页面查看详细记录。`
      )
    } catch (error: any) {
      console.error('测试失败:', error)
      showError(`测试失败: ${error.message || '未知错误'}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">审计功能测试</h3>
      <p className="text-sm text-gray-600 mb-4">
        点击下面的按钮测试审计功能。系统会创建一个测试活动，然后更新它，最后检查审计日志是否正确记录。
      </p>
      <button
        onClick={testAudit}
        disabled={testing || !user}
        className="px-4 py-2 bg-[#F15B98] text-white rounded-lg hover:bg-[#E0487A] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {testing ? '测试中...' : '开始测试'}
      </button>
      {!user && (
        <p className="text-sm text-red-600 mt-2">请先登录</p>
      )}
    </div>
  )
}


