import { createClient } from '@supabase/supabase-js'

// Supabase 配置
const supabaseUrl = 'https://mypglmtsgfgojtnpmkbc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cGdsbXRzZ2Znb2p0bnBta2JjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUxNjg2NiwiZXhwIjoyMDczMDkyODY2fQ.tVi2KR6IBHzgqbGzdhFXJ_YVnHzj7SzVCaV_jcoSqXc'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSpecificUsers() {
  try {
    console.log('🔍 检查特定用户数据...')
    
    // 检查 user11 和 user12
    const testEmails = ['user11@example.com', 'user12@example.com']
    
    for (const email of testEmails) {
      console.log(`\n📧 检查用户: ${email}`)
      
      // 检查 auth.users
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      const authUser = authUsers.users.find(u => u.email === email)
      
      if (authUser) {
        console.log(`✅ 认证用户存在: ${authUser.id}`)
        console.log(`   创建时间: ${authUser.created_at}`)
        console.log(`   邮箱确认: ${authUser.email_confirmed_at ? '是' : '否'}`)
        
        // 检查 user_profiles
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()
        
        if (profileError) {
          console.log(`❌ 用户资料不存在: ${profileError.message}`)
        } else {
          console.log(`✅ 用户资料存在:`)
          console.log(`   姓名: ${profile.full_name}`)
          console.log(`   手机: ${profile.phone}`)
          console.log(`   会员类型: ${profile.membership_type}`)
          console.log(`   邮箱: ${profile.email}`)
          console.log(`   创建时间: ${profile.created_at}`)
        }
      } else {
        console.log(`❌ 认证用户不存在`)
      }
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message)
  }
}

checkSpecificUsers()
