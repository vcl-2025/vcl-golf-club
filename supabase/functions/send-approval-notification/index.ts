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
    const { user_id, event_title, approval_status, approval_notes, test_email } = await req.json()

    if (!user_id || !event_title || !approval_status) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
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

    // 获取用户邮箱
    let userData
    
    if (user_id === 'test-user-id') {
      // 测试模式：使用测试邮箱
      userData = {
        email: test_email || 'test@example.com',
        full_name: '测试用户'
      }
    } else {
      // 正常模式：从数据库获取用户信息
      const { data: dbUserData, error: userError } = await supabaseClient
        .from('user_profiles')
        .select('email, full_name')
        .eq('id', user_id)
        .single()

      if (userError || !dbUserData) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      userData = dbUserData
    }

    // 准备邮件内容
    const isApproved = approval_status === 'approved'
    const subject = isApproved 
      ? `🎉 活动报名已批准 - ${event_title}`
      : `❌ 活动报名未通过 - ${event_title}`
    
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">
            ${isApproved ? '🎉 报名申请已批准' : '❌ 报名申请未通过'}
          </h1>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">
            亲爱的 ${userData.full_name || '会员'}，
          </p>
          
          <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">
            您的活动报名申请已处理完成：
          </p>
          
          <div style="background: white; padding: 16px; border-radius: 6px; border-left: 4px solid ${isApproved ? '#10b981' : '#ef4444'}; margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0; color: #111827; font-size: 18px;">
              ${event_title}
            </h3>
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
              状态：<strong style="color: ${isApproved ? '#10b981' : '#ef4444'}">${isApproved ? '已批准' : '未通过'}</strong>
            </p>
            ${approval_notes ? `
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                备注：${approval_notes}
              </p>
            ` : ''}
          </div>
          
          ${isApproved ? `
            <p style="margin: 16px 0; color: #374151; font-size: 16px;">
              🎉 恭喜！您已成功报名参加此活动。请按时参加活动，如有任何问题请及时联系我们。
            </p>
          ` : `
            <p style="margin: 16px 0; color: #374151; font-size: 16px;">
              很抱歉，您的报名申请未能通过。您可以查看其他活动或联系管理员了解更多信息。
            </p>
          `}
          
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              此邮件由系统自动发送，请勿回复。
            </p>
            <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
              如有疑问，请联系俱乐部管理员。
            </p>
          </div>
        </div>
      </div>
    `

    // 使用业务邮件发送功能
    const { data, error } = await supabaseClient.functions.invoke('send-business-email', {
      body: {
        to: userData.email,
        subject: subject,
        html: emailContent,
        type: 'business' // 明确指定为业务邮件
      }
    })

    if (error) {
      console.error('Email sending error:', error)
      // 即使邮件发送失败，也不影响审批流程
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Approval processed, but email notification failed',
          email_sent: false 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Approval processed and email notification sent',
        email_sent: true 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-approval-notification:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
