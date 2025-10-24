// 服务端 API：发送邮件通知
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { user_ids, subject, content } = req.body

    // 获取用户邮箱
    const { data: users, error } = await supabase.auth.admin.listUsers()
    
    if (error) throw error

    // 过滤出需要的用户
    const targetUsers = users.users
      .filter(user => user_ids.includes(user.id))
      .map(user => ({ id: user.id, email: user.email }))

    // 发送邮件（这里需要集成邮件服务，如 SendGrid, AWS SES 等）
    const emailPromises = targetUsers.map(user => 
      sendEmail(user.email, subject, content)
    )

    await Promise.all(emailPromises)

    res.status(200).json({ 
      success: true, 
      sent_to: targetUsers.length 
    })
  } catch (error) {
    console.error('Error sending notifications:', error)
    res.status(500).json({ error: 'Failed to send notifications' })
  }
}

async function sendEmail(to, subject, content) {
  // 集成邮件服务
  // 例如：SendGrid, AWS SES, Nodemailer 等
  console.log(`Sending email to ${to}: ${subject}`)
}






