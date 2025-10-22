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

    console.log('获取到的订阅数据:', subscriptions)
    console.log('订阅数据长度:', subscriptions?.length)

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: '用户未订阅推送通知' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 使用web-push库发送真正的推送通知
    const results = []
    for (const sub of subscriptions) {
      try {
        // 记录推送信息
        console.log('准备发送推送通知:', {
          title,
          message,
          subscription: sub.subscription?.endpoint || 'no-endpoint'
        })

        // 构建推送载荷
        const payload = JSON.stringify({
          title,
          body: message,
          icon: '/icon-192x192.svg',
          badge: '/badge-72x72.svg',
          vibrate: [100, 50, 100],
          requireInteraction: true,
          actions: [
            { action: 'open', title: '查看详情' },
            { action: 'dismiss', title: '稍后提醒' }
          ],
          data: {
            url: url || '/',
            timestamp: Date.now()
          }
        })

        // 使用web-push发送推送通知
        const webpush = await import('https://esm.sh/web-push@3.6.7')
        
        // 配置VAPID详情
        webpush.setVapidDetails(
          'mailto:your-email@example.com',
          Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
          Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
        )

        // 发送推送通知
        await webpush.sendNotification(sub.subscription, payload)
        
        results.push({ 
          success: true, 
          subscription: sub.subscription?.endpoint || 'no-endpoint',
          message: '推送通知发送成功'
        })
        
        console.log('推送通知发送成功:', sub.subscription?.endpoint)
      } catch (error) {
        console.error('发送推送失败:', error)
        results.push({ success: false, error: error.message })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return new Response(
      JSON.stringify({
        success: true,
        message: `推送通知发送完成`,
        sent: successCount,
        failed: failCount,
        results
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
