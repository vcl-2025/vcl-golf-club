import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Mail, Send, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react'

// 辅助函数：直接调用 Edge Function 并处理错误
async function invokeFunctionWithErrorHandling(functionName: string, body: any) {
  if (!supabase) {
    throw new Error('Supabase 客户端未初始化')
  }

  const { data: session } = await supabase.auth.getSession()
  const accessToken = session?.session?.access_token

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  })

  const responseData = await response.json()

  if (!response.ok) {
    // 如果响应包含错误信息，提取它
    const errorMessage = responseData.message || responseData.error || `HTTP ${response.status}: ${response.statusText}`
    const error = new Error(errorMessage)
    ;(error as any).status = response.status
    ;(error as any).responseData = responseData
    throw error
  }

  return responseData
}

export default function EmailTestPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // 简单邮件发送表单
  const [simpleEmail, setSimpleEmail] = useState({
    to: 'vclgolfclub@hotmail.com', // 默认使用注册邮箱
    subject: '测试邮件',
    html: '<h1>这是一封测试邮件</h1><p>如果您收到这封邮件，说明邮件功能正常工作！</p>'
  })

  // 审批通知邮件表单
  const [approvalEmail, setApprovalEmail] = useState({
    to: 'vclgolfclub@hotmail.com', // 默认使用注册邮箱
    event_title: '2025年妇女之友系列大赛庆功晚宴',
    approval_status: 'approved' as 'approved' | 'rejected',
    approval_notes: '这是一封测试邮件，用于验证审批通知功能。'
  })

  // 测试简单邮件发送
  const testSimpleEmail = async () => {
    if (!user) {
      setError('请先登录')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const data = await invokeFunctionWithErrorHandling('send-email', {
        to: simpleEmail.to,
        subject: simpleEmail.subject,
        html: simpleEmail.html
      })

      setResult({ success: true, data })
    } catch (err: any) {
      // 提取错误信息
      let errorMessage = err.message || '发送失败'
      
      // 如果错误响应包含详细信息，使用它
      if (err.responseData) {
        if (err.responseData.message) {
          errorMessage = err.responseData.message
        } else if (err.responseData.error) {
          errorMessage = err.responseData.error
        }
      }
      
      setError(errorMessage)
      setResult({ success: false, error: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  // 测试审批通知邮件
  const testApprovalEmail = async () => {
    if (!user) {
      setError('请先登录')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const data = await invokeFunctionWithErrorHandling('send-approval-notification', {
        user_id: 'test-user-id', // 使用测试用户 ID 触发测试模式
        event_title: approvalEmail.event_title,
        approval_status: approvalEmail.approval_status,
        approval_notes: approvalEmail.approval_notes,
        test_email: approvalEmail.to // 测试模式使用指定邮箱
      })

      setResult({ success: true, data })
    } catch (err: any) {
      // 提取错误信息
      let errorMessage = err.message || '发送失败'
      
      // 如果错误响应包含详细信息，使用它
      if (err.responseData) {
        if (err.responseData.message) {
          errorMessage = err.responseData.message
        } else if (err.responseData.error) {
          errorMessage = err.responseData.error
        }
      }
      
      setError(errorMessage)
      setResult({ success: false, error: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-golf-50 to-golf-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-8 h-8 text-golf-600" />
            <h1 className="text-2xl font-bold text-gray-900">邮件发送测试</h1>
          </div>
          <p className="text-gray-600 text-sm">
            测试邮件发送功能。注意：Resend 未验证域名时，只能发送到注册邮箱 <code className="bg-gray-100 px-2 py-1 rounded">vclgolfclub@hotmail.com</code>
          </p>
        </div>

        {/* 简单邮件测试 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Send className="w-5 h-5" />
            简单邮件发送测试
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                收件人邮箱
              </label>
              <input
                type="email"
                value={simpleEmail.to}
                onChange={(e) => setSimpleEmail({ ...simpleEmail, to: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                placeholder="vclgolfclub@hotmail.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                未验证域名时，只能发送到注册邮箱
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                邮件主题
              </label>
              <input
                type="text"
                value={simpleEmail.subject}
                onChange={(e) => setSimpleEmail({ ...simpleEmail, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                placeholder="测试邮件"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                邮件内容 (HTML)
              </label>
              <textarea
                value={simpleEmail.html}
                onChange={(e) => setSimpleEmail({ ...simpleEmail, html: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent font-mono text-sm"
                placeholder="<h1>邮件内容</h1>"
              />
            </div>

            <button
              onClick={testSimpleEmail}
              disabled={loading || !user}
              className="w-full px-4 py-2 bg-golf-600 text-white rounded-lg hover:bg-golf-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  发送中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  发送测试邮件
                </>
              )}
            </button>
          </div>
        </div>

        {/* 审批通知邮件测试 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5" />
            审批通知邮件测试
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                收件人邮箱
              </label>
              <input
                type="email"
                value={approvalEmail.to}
                onChange={(e) => setApprovalEmail({ ...approvalEmail, to: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                placeholder="vclgolfclub@hotmail.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                活动名称
              </label>
              <input
                type="text"
                value={approvalEmail.event_title}
                onChange={(e) => setApprovalEmail({ ...approvalEmail, event_title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                placeholder="活动名称"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                审批状态
              </label>
              <select
                value={approvalEmail.approval_status}
                onChange={(e) => setApprovalEmail({ ...approvalEmail, approval_status: e.target.value as 'approved' | 'rejected' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
              >
                <option value="approved">已批准</option>
                <option value="rejected">已拒绝</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                审批备注
              </label>
              <textarea
                value={approvalEmail.approval_notes}
                onChange={(e) => setApprovalEmail({ ...approvalEmail, approval_notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                placeholder="审批备注"
              />
            </div>

            <button
              onClick={testApprovalEmail}
              disabled={loading || !user}
              className="w-full px-4 py-2 bg-golf-600 text-white rounded-lg hover:bg-golf-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  发送中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  发送审批通知邮件
                </>
              )}
            </button>
          </div>
        </div>

        {/* 结果显示 */}
        {(result || error) && (
          <div className={`bg-white rounded-lg shadow-lg p-6 ${
            result?.success ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'
          }`}>
            <div className="flex items-start gap-3">
              {result?.success ? (
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className={`font-semibold mb-2 ${
                  result?.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {result?.success ? '发送成功！' : '发送失败'}
                </h3>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-red-700">
                        <p className="font-medium mb-1">错误信息：</p>
                        <p className="whitespace-pre-wrap">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
                {result?.data && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-mono text-gray-600 mb-2">响应数据：</p>
                    <pre className="text-xs text-gray-700 overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 提示信息 */}
        {!user && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700">
                请先登录才能测试邮件发送功能
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

