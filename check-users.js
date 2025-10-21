import { createClient } from '@supabase/supabase-js'

// Supabase 配置
const supabaseUrl = 'https://mypglmtsgfgojtnpmkbc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cGdsbXRzZ2Znb2p0bnBta2JjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUxNjg2NiwiZXhwIjoyMDczMDkyODY2fQ.tVi2KR6IBHzgqbGzdhFXJ_YVnHzj7SzVCaV_jcoSqXc'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUsers() {
  try {
    console.log('🔍 检查用户数据...')
    
    // 检查 auth.users 表
    console.log('\n📋 检查 auth.users 表:')
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ 获取认证用户失败:', authError.message)
      return
    }
    
    console.log(`✅ 找到 ${authUsers.users.length} 个认证用户`)
    
    // 显示最近注册的用户
    const recentUsers = authUsers.users
      .filter(user => user.email?.includes('user11') || user.email?.includes('user12'))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    
    console.log('\n📧 最近注册的用户:')
    recentUsers.forEach(user => {
      console.log(`- ${user.email} (ID: ${user.id})`)
      console.log(`  创建时间: ${user.created_at}`)
      console.log(`  邮箱确认: ${user.email_confirmed_at ? '是' : '否'}`)
    })
    
    // 检查 user_profiles 表
    console.log('\n📋 检查 user_profiles 表:')
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (profileError) {
      console.error('❌ 获取用户资料失败:', profileError.message)
      return
    }
    
    console.log(`✅ 找到 ${profiles.length} 个用户资料`)
    
    // 显示最近创建的用户资料
    const recentProfiles = profiles.filter(profile => 
      profile.email?.includes('user11') || profile.email?.includes('user12')
    )
    
    console.log('\n👤 最近创建的用户资料:')
    recentProfiles.forEach(profile => {
      console.log(`- ${profile.email} (ID: ${profile.id})`)
      console.log(`  姓名: ${profile.full_name}`)
      console.log(`  手机: ${profile.phone}`)
      console.log(`  会员类型: ${profile.membership_type}`)
      console.log(`  创建时间: ${profile.created_at}`)
    })
    
    // 检查数据一致性
    console.log('\n🔍 数据一致性检查:')
    const authUserIds = new Set(authUsers.users.map(u => u.id))
    const profileUserIds = new Set(profiles.map(p => p.id))
    
    const missingProfiles = [...authUserIds].filter(id => !profileUserIds.has(id))
    const missingAuth = [...profileUserIds].filter(id => !authUserIds.has(id))
    
    if (missingProfiles.length > 0) {
      console.log(`⚠️  有 ${missingProfiles.length} 个认证用户缺少用户资料`)
    }
    
    if (missingAuth.length > 0) {
      console.log(`⚠️  有 ${missingAuth.length} 个用户资料缺少认证用户`)
    }
    
    if (missingProfiles.length === 0 && missingAuth.length === 0) {
      console.log('✅ 数据一致性检查通过')
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message)
  }
}

checkUsers()