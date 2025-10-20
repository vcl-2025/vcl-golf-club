import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { to, subject, html, type = 'business' } = await req.json()

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: to, subject, html' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 创建 Supabase 客户端
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    let result

    if (type === 'auth') {
      // 使用 Supabase 内置邮件功能（仅限认证邮件）
      console.log('📧 使用 Supabase 内置邮件服务')
      
      // 这里只能发送认证相关邮件，业务邮件需要第三方服务
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Supabase 内置邮件服务仅支持认证邮件，请使用第三方邮件服务发送业务邮件' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
      
    } else {
      // 使用第三方邮件服务发送业务邮件
      console.log('📧 使用第三方邮件服务发送业务邮件')
      
      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')
      
      if (resendApiKey) {
        // 使用 Resend
        const response = await fetch('https://api.resend.com/emails', {
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
          const errorData = await response.text()
          throw new Error(`Resend API error: ${response.status} - ${errorData}`)
        }

        result = await response.json()
        console.log('📧 Resend 邮件发送成功:', result)
        
      } else if (sendgridApiKey) {
        // 使用 SendGrid
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sendgridApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: 'noreply@golfclub.com' },
            subject: subject,
            content: [{ type: 'text/html', value: html }]
          })
        })

        if (!response.ok) {
          const errorData = await response.text()
          throw new Error(`SendGrid API error: ${response.status} - ${errorData}`)
        }

        result = { success: true, service: 'SendGrid' }
        console.log('📧 SendGrid 邮件发送成功')
        
      } else {
        // 没有配置邮件服务，使用控制台输出
        console.log('📧 未配置邮件服务，使用控制台输出:')
        console.log('To:', to)
        console.log('Subject:', subject)
        console.log('Content:', html.substring(0, 200) + '...')
        
        result = { 
          success: true, 
          service: 'console',
          message: '邮件服务未配置，请配置 Resend 或 SendGrid API Key' 
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        service: result.service || 'unknown',
        to: to,
        subject: subject,
        result: result
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-business-email:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
