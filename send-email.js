import { Resend } from "resend";

const resend = new Resend("re_BdgPMyuv_897K7xQXyBgWemEWMeQBTbcL");

// 封装一个函数：发欢迎或验证邮件
export async function sendEmail(to, subject, htmlContent) {
  try {
    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev", // ✅ 直接用测试发信地址
      to, // 可以是字符串或字符串数组
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error("❌ 邮件发送失败:", error);
      return false;
    }

    console.log("✅ 邮件发送成功:", data.id);
    return true;
  } catch (err) {
    console.error("⚠️ 发送过程出错:", err);
    return false;
  }
}

// 测试发送邮件
async function testSendEmail() {
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">🎉 报名申请已批准</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
        <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">亲爱的会员，</p>
        
        <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">您的活动报名申请已处理完成：</p>
        
        <div style="background: white; padding: 16px; border-radius: 6px; border-left: 4px solid #10b981; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0; color: #111827; font-size: 18px;">2024年度高尔夫慈善赛</h3>
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">状态：<strong style="color: #10b981">已批准</strong></p>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">备注：恭喜您通过审批！</p>
        </div>
        
        <p style="margin: 16px 0; color: #374151; font-size: 16px;">🎉 恭喜！您已成功报名参加此活动。请按时参加活动，如有任何问题请及时联系我们。</p>
        
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">此邮件由系统自动发送，请勿回复。</p>
          <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">如有疑问，请联系俱乐部管理员。</p>
        </div>
      </div>
    </div>
  `;

  const success = await sendEmail(
    "jing_curie@hotmail.com",
    "🎉 活动报名已批准 - 2024年度高尔夫慈善赛",
    emailContent
  );

  if (success) {
    console.log("🎉 测试邮件发送成功！");
  } else {
    console.log("❌ 测试邮件发送失败！");
  }
}

// 运行测试
testSendEmail();
