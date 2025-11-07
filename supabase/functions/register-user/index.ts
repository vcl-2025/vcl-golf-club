import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, full_name } = await req.json()
    
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: '邮箱和密码是必需的' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 创建Supabase客户端（使用服务角色密钥，不会创建session）
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 使用 admin API 创建用户（不会创建session）
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // 自动确认邮箱
    })

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: '注册失败，未返回用户信息' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 检查 user_profiles 是否已存在（可能由触发器创建）
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', authData.user.id)
      .single()

    // 如果用户资料不存在，创建一个基本的用户资料
    if (!existingProfile) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          full_name: full_name || email.split('@')[0], // golf life用户名，用于导入数据
          email: email, // 确保保存正确的邮箱
          membership_type: 'standard',
          is_active: true
        })

      if (profileError) {
        console.error('创建用户资料失败:', profileError)
        // 即使创建用户资料失败，用户已经创建，所以继续
      }
    } else {
      // 如果用户资料已存在，更新 full_name 和 email
      const updateData: any = {}
      if (full_name) {
        updateData.full_name = full_name
      }
      // 确保邮箱是最新的
      updateData.email = email
      
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', authData.user.id)

      if (updateError) {
        console.error('更新用户资料失败:', updateError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('注册用户失败:', error)
    return new Response(
      JSON.stringify({ error: error.message || '注册失败' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

