import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { title, message, url } = await req.json()

    // OneSignal 配置
    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error('OneSignal 配置缺失')
    }

    // 构建 OneSignal 推送请求
    const pushData = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title, zh: title },
      contents: { en: message, zh: message },
      url: url || 'https://greenfield-golf-club.pages.dev',
      included_segments: ['All']
    }

    // 发送到 OneSignal API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(pushData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OneSignal API 错误: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('OneSignal 推送发送成功:', result)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '推送通知发送成功',
        onesignal_id: result.id 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('OneSignal 推送发送失败:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
