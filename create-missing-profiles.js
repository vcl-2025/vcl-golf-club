import { createClient } from '@supabase/supabase-js'

// 从环境变量读取配置
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('请确保在.env文件中设置了VITE_SUPABASE_URL和SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createMissingProfiles() {
  try {
    console.log('🔍 正在检查缺失的用户档案...')
    
    // 1. 获取所有认证用户
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('获取认证用户失败:', authError)
      return
    }
    
    console.log(`📊 找到 ${authUsers.users.length} 个认证用户`)
    
    // 2. 获取所有现有的用户档案
    const { data: existingProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id')
    
    if (profilesError) {
      console.error('获取用户档案失败:', profilesError)
      return
    }
    
    const existingProfileIds = new Set(existingProfiles.map(p => p.id))
    console.log(`📋 找到 ${existingProfiles.length} 个现有用户档案`)
    
    // 3. 找出缺失档案的用户
    const missingProfiles = authUsers.users.filter(user => !existingProfileIds.has(user.id))
    
    if (missingProfiles.length === 0) {
      console.log('✅ 所有认证用户都有对应的档案，无需创建')
      return
    }
    
    console.log(`\n⚠️  发现 ${missingProfiles.length} 个用户缺少档案:`)
    missingProfiles.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.id})`)
    })
    
    // 4. 为缺失的用户创建档案
    console.log('\n🔄 开始创建用户档案...')
    
    const profilesToCreate = missingProfiles.map(user => {
      // 从邮箱提取用户名作为默认姓名
      const emailName = user.email.split('@')[0]
      const defaultName = emailName.charAt(0).toUpperCase() + emailName.slice(1)
      
      return {
        id: user.id,
        full_name: defaultName,
        phone: '', // 留空，用户可以稍后填写
        membership_type: 'standard', // 默认为标准会员
        role: 'member' // 默认为普通会员
      }
    })
    
    // 批量插入用户档案
    const { data: insertedProfiles, error: insertError } = await supabase
      .from('user_profiles')
      .insert(profilesToCreate)
      .select()
    
    if (insertError) {
      console.error('创建用户档案失败:', insertError)
      return
    }
    
    console.log(`\n✅ 成功创建了 ${insertedProfiles.length} 个用户档案:`)
    insertedProfiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.full_name} (${profile.id})`)
      console.log(`   邮箱: ${missingProfiles[index].email}`)
      console.log(`   会员类型: ${profile.membership_type}`)
      console.log(`   角色: ${profile.role}`)
      console.log('')
    })
    
    console.log('🎉 所有缺失的用户档案已创建完成！')
    
  } catch (error) {
    console.error('创建用户档案失败:', error)
  }
}

createMissingProfiles()






