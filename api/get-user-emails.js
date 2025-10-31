// API 端点：获取用户邮箱
// 部署到 Vercel/Netlify 等平台

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // 使用服务端密钥

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { user_ids } = req.body

    if (!user_ids || !Array.isArray(user_ids)) {
      return res.status(400).json({ error: 'user_ids is required and must be an array' })
    }

    // 使用 Admin API 查询 auth.users
    const { data, error } = await supabase.auth.admin.listUsers()

    if (error) {
      throw error
    }

    // 过滤出需要的用户
    const filteredUsers = data.users
      .filter(user => user_ids.includes(user.id))
      .map(user => ({
        id: user.id,
        email: user.email
      }))

    res.status(200).json(filteredUsers)
  } catch (error) {
    console.error('Error fetching user emails:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}








