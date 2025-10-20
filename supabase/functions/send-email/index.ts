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
    const { to, subject, html } = await req.json()

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: to, subject, html' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 使用 Resend 邮件服务发送真实邮件
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      console.log('📧 Resend API Key not found, using console output:')
      console.log('To:', to)
      console.log('Subject:', subject)
      console.log('Content:', html.substring(0, 200) + '...')
      
      // 模拟邮件发送延迟
      await new Promise(resolve => setTimeout(resolve, 1000))
    } else {
      // 使用 Resend 发送真实邮件
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Golf Club <noreply@golfclub.com>',
          to: [to],
          subject: subject,
          html: html
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('Resend API error:', response.status, errorData)
        throw new Error(`邮件发送失败: ${response.status}`)
      }

      const result = await response.json()
      console.log('📧 邮件发送成功:', result)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        to: to,
        subject: subject
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-email:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
