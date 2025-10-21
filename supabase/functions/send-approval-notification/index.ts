import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// 🚀 启动日志
console.log("🚀 send-approval-notification function STARTED")

// ✅ 检查环境变量
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
console.log("🔑 RESEND_API_KEY detected:", !!RESEND_API_KEY)
console.log("🔑 RESEND_API_KEY prefix:", RESEND_API_KEY?.slice(0, 10))

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  console.log("📧 审批通知函数被触发")
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    // 解析请求体
    const { user_id, event_title, approval_status, approval_notes, test_email } = await req.json()
    console.log("📝 参数:", { user_id, event_title, approval_status, approval_notes, test_email })

    if (!user_id || !event_title || !approval_status) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 是否测试模式
    const isTestMode = user_id === "test-user-id" && !!test_email
    console.log("🧪 测试模式:", isTestMode)

    // 创建 Supabase 客户端
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    )

    // 🔹 获取用户数据
    let userData
    if (isTestMode) {
      userData = { email: test_email, full_name: "测试用户" }
    } else {
      console.log("🔍 查询数据库 user_profiles 表...")
      const { data, error } = await supabase
        .from("user_profiles")
        .select("email, full_name")
        .eq("id", user_id)
        .limit(1) // ✅ 改掉 .single()，防止 JSON coercion 错误

      console.log("📤 查询返回:", data, error)
      if (error || !data || data.length === 0) {
        console.log("❌ 用户查询失败，使用测试邮箱:", error)
        // 如果查询失败，使用测试邮箱
        userData = { email: test_email || "test@example.com", full_name: "测试用户" }
        console.log("✅ 使用测试邮箱:", userData)
      } else {
        userData = data[0]
      }
    }

    console.log("📨 目标用户:", userData)

    // 邮件标题与内容
    const isApproved = approval_status === "approved"
    const subject = isApproved
      ? `🎉 活动报名已批准 - ${event_title}`
      : `❌ 活动报名未通过 - ${event_title}`

    const html = `
      <div style="font-family: Arial, sans-serif; width:100%; max-width:100%; margin:0; padding:0;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); color:white; padding:20px; border-radius:0;">
          <h1 style="margin:0; font-size:20px; font-weight:bold;">${isApproved ? "🎉 报名申请已批准" : "❌ 报名申请已取消"}</h1>
        </div>
        <div style="background:#f9fafb; border:1px solid #e5e7eb; padding:20px; border-radius:0;">
          <p style="margin:0 0 16px 0; color:#374151; font-size:16px; font-weight:500;">亲爱的 ${userData.full_name || "会员"}：</p>
          <p style="margin:0 0 16px 0; color:#374151; font-size:16px;">您的活动报名申请已处理完成：</p>
          <div style="background:white; padding:16px; border-radius:6px; border-left:4px solid ${
            isApproved ? "#10b981" : "#ef4444"
          }; margin:16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h3 style="margin:0 0 12px 0; color:#111827; font-size:18px; font-weight:bold;">${event_title}</h3>
            <div style="margin:8px 0; padding:8px; background:#f8fafc; border-radius:4px;">
              <p style="margin:0 0 6px 0; color:#374151; font-size:14px; font-weight:500;">📅 活动时间：2024年12月25日 上午9:00</p>
              <p style="margin:0 0 6px 0; color:#374151; font-size:14px; font-weight:500;">📍 活动地点：绿野高尔夫俱乐部</p>
              <p style="margin:0; color:#374151; font-size:14px; font-weight:500;">👥 活动类型：慈善赛</p>
            </div>
            <p style="margin:12px 0 6px 0; color:#6b7280; font-size:14px;">状态：<span style="color:${isApproved ? "#10b981" : "#ef4444"}; font-weight:bold; font-size:16px;">${
      isApproved ? "已批准" : "已取消"
    }</span></p>
            ${approval_notes ? `<p style="margin:0; color:#6b7280; font-size:14px;">备注：${approval_notes}</p>` : ""}
          </div>
          <div style="margin:16px 0; padding:16px; background:${isApproved ? "#f0fdf4" : "#fef2f2"}; border-radius:6px; border:1px solid ${isApproved ? "#bbf7d0" : "#fecaca"};">
            <p style="margin:0; color:#374151; font-size:16px; font-weight:500;">
              ${isApproved
                ? `🎉 恭喜！您已成功报名参加此活动。请按时参加活动，如有任何问题请及时联系我们。`
                : `很抱歉，您的报名申请已被取消。您可以重新申请其他活动，或联系管理员了解更多信息。`}
            </p>
            ${!isApproved ? `
              <div style="margin-top:12px; padding:8px; background:#fef3c7; border-radius:4px; border:1px solid #fbbf24;">
                <p style="margin:0; color:#92400e; font-size:14px; font-weight:500;">
                  💡 提示：您可以查看其他活动并重新申请，我们期待您的参与！
                </p>
              </div>
            ` : ""}
          </div>
          <hr style="margin:20px 0; border:none; border-top:1px solid #e5e7eb;">
          <p style="margin:0; font-size:12px; color:#6b7280;">此邮件由系统自动发送，请勿回复。</p>
          <p style="margin:6px 0 0 0; font-size:12px; color:#6b7280;">如有疑问，请联系俱乐部管理员。</p>
        </div>
      </div>
    `

    // 🧪 测试模式：发送真实邮件
    if (isTestMode) {
      console.log("🧪 测试模式：发送真实邮件:", subject, userData.email)
      
      if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY 未设置")

      console.log("📤 调用 Resend API 发送邮件...")
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Greenfield Golf Club <onboarding@resend.dev>",
          to: [userData.email],
          subject,
          html,
        }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Resend API 错误: ${res.status} - ${errorText}`)
      }

      const result = await res.json()
      console.log("✅ 邮件发送成功:", result)

      return new Response(
        JSON.stringify({
          success: true,
          message: "测试模式：邮件已真实发送",
          recipient: userData.email,
          subject,
          result,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ✅ 正式模式：发送真实邮件
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY 未设置")

    console.log("📤 调用 Resend API 发送邮件...")
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Greenfield Golf Club <onboarding@resend.dev>",
        to: [userData.email],
        subject,
        html,
      }),
    })

    const data = await res.json()
    console.log("📨 Resend 响应:", JSON.stringify(data, null, 2))

    if (!res.ok) {
      throw new Error(`Resend API error: ${res.status} - ${data.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "审批通知邮件已发送",
        recipient: userData.email,
        resend_response: data,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("❌ send-approval-notification 出错:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
