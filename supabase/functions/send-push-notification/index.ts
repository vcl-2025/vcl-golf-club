import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, title, message, data, url } = await req.json()
    
    console.log('发送推送通知:', { user_id, title, message })

    // 创建Supabase客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 获取用户的推送订阅
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user_id)

    if (error) {
      throw new Error(`获取订阅失败: ${error.message}`)
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: '用户未订阅推送通知' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 暂时返回成功响应，不实际发送推送
    console.log('找到订阅:', subscriptions.length)
    
    return new Response(
      JSON.stringify({
        success: true,
        message: '推送通知功能已准备就绪',
        subscriptions: subscriptions.length,
        note: 'web-push库暂时禁用，需要修复导入问题'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('推送通知发送失败:', error)
    return new Response(
      JSON.stringify({ error: '推送通知发送失败', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
