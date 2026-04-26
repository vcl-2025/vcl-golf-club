import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** 始终返回 200 + JSON，避免 supabase-js invoke 只提示 non-2xx 而看不到具体原因 */
function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return json({
        success: false,
        error: '服务端环境变量缺失（SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY）'
      })
    }

    let body: { userId?: string; newPassword?: string }
    try {
      body = await req.json()
    } catch {
      return json({ success: false, error: '请求体不是合法 JSON' })
    }

    const { userId, newPassword } = body
    if (!userId || !newPassword) {
      return json({ success: false, error: '缺少必要参数 userId 或 newPassword' })
    }

    const rawAuth = req.headers.get('Authorization') ?? req.headers.get('authorization')
    if (!rawAuth?.trim()) {
      return json({ success: false, error: '未登录，缺少授权信息' })
    }

    const token = rawAuth.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return json({ success: false, error: '未登录，缺少有效 Token' })
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const { data: authData, error: authError } = await userClient.auth.getUser(token)
    if (authError || !authData.user) {
      return json({
        success: false,
        error: authError?.message || '登录状态无效，请重新登录'
      })
    }

    const requesterId = authData.user.id

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const { data: requesterProfile, error: profileError } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('id', requesterId)
      .maybeSingle()

    if (profileError) {
      return json({ success: false, error: `读取操作者角色失败: ${profileError.message}` })
    }

    const role = String(requesterProfile?.role || '').toLowerCase()
    if (role !== 'admin') {
      return json({ success: false, error: '仅管理员可重置密码' })
    }

    const { error: resetError } = await adminClient.auth.admin.updateUserById(String(userId), {
      password: String(newPassword)
    })

    if (resetError) {
      return json({ success: false, error: resetError.message || '重置密码失败' })
    }

    return json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('reset-user-password error:', error)
    return json({ success: false, error: message || '重置密码失败' })
  }
})
