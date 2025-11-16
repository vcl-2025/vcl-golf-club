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
      // 尝试使用验证过的域名，如果失败则回退到默认地址
      const VERIFIED_DOMAIN = "vcl-golf-club.pages.dev"
      const REGISTERED_EMAIL = "vclgolfclub@hotmail.com"
      
      // 首先尝试使用验证过的域名
      let response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `Greenfield Golf Club <noreply@${VERIFIED_DOMAIN}>`,
          to: [to],
          subject: subject,
          html: html
        })
      })

      let errorData: any = {}
      if (!response.ok) {
        const errorText = await response.text()
        errorData = JSON.parse(errorText || "{}")
        console.error('Resend API error:', response.status, errorData)
        
        // 如果域名未验证，回退到使用默认地址（只能发送到注册邮箱）
        if (response.status === 403 && (errorData.message?.includes("not verified") || errorData.message?.includes("domain"))) {
          console.warn("⚠️ 域名未验证，回退到使用默认地址（只能发送到注册邮箱）")
          
          // 检查收件人是否是注册邮箱
          if (to?.toLowerCase() !== REGISTERED_EMAIL.toLowerCase()) {
            throw new Error(`域名 ${VERIFIED_DOMAIN} 尚未验证。目前只能发送邮件到注册邮箱 ${REGISTERED_EMAIL}。请在 Resend 控制台完成域名验证：https://resend.com/domains`)
          }
          
          // 使用默认地址发送到注册邮箱
          response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Greenfield Golf Club <onboarding@resend.dev>',
              to: [to],
              subject: subject,
              html: html
            })
          })
          
          if (!response.ok) {
            const errorText2 = await response.text()
            errorData = JSON.parse(errorText2 || "{}")
          }
        }
      }

      if (!response.ok) {
        // 检查是否是域名验证错误
        if (response.status === 403 && errorData.message?.includes("testing emails")) {
          throw new Error(`Resend 域名未验证：${errorData.message}。请在 https://resend.com/domains 验证域名后，将 from 地址改为使用该域名的邮箱。`)
        }
        
        throw new Error(`邮件发送失败: ${response.status} - ${errorData.message || JSON.stringify(errorData)}`)
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
    
    // 尝试提取错误信息
    let errorMessage = 'Internal server error'
    let errorDetails: any = { error: errorMessage }
    
    if (error instanceof Error) {
      errorMessage = error.message
      // 尝试解析 JSON 格式的错误信息
      try {
        const parsed = JSON.parse(errorMessage)
        if (parsed.message) {
          errorDetails = parsed
        } else {
          errorDetails = { error: errorMessage, details: error.stack }
        }
      } catch {
        // 不是 JSON，使用原始错误信息
        errorDetails = { error: errorMessage, details: error.stack }
      }
    }
    
    return new Response(
      JSON.stringify(errorDetails),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
