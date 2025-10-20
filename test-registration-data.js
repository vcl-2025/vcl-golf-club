// 测试报名记录数据获取的脚本
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mypglmtsgfgojtnpmkbc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cGdsbXRzZ2Znb2p0bnBta2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NzQ4MDAsImV4cCI6MjA1MDA1MDgwMH0.8Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRegistrationData() {
  try {
    console.log('开始测试报名记录数据获取...')
    
    // 1. 获取所有报名记录
    const { data: registrations, error: registrationsError } = await supabase
      .from('event_registrations')
      .select('*')
      .order('registration_time', { ascending: false })
      .limit(5)
    
    if (registrationsError) {
      console.error('获取报名记录失败:', registrationsError)
      return
    }
    
    console.log('找到报名记录:', registrations)
    
    if (registrations && registrations.length > 0) {
      // 2. 获取用户资料
      const userIds = [...new Set(registrations.map(r => r.user_id))]
      console.log('用户ID列表:', userIds)
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, phone')
        .in('id', userIds)
      
      if (profilesError) {
        console.error('获取用户资料失败:', profilesError)
        return
      }
      
      console.log('用户资料数据:', profilesData)
      
      // 3. 合并数据并显示
      const registrationsWithProfiles = registrations.map(registration => {
        const userProfile = profilesData?.find(p => p.id === registration.user_id)
        return {
          ...registration,
          user_profiles: userProfile || { full_name: '未知用户', email: '', phone: '' }
        }
      })
      
      console.log('合并后的数据:')
      registrationsWithProfiles.forEach((reg, index) => {
        console.log(`记录 ${index + 1}:`)
        console.log('- 用户ID:', reg.user_id)
        console.log('- 姓名:', reg.user_profiles?.full_name)
        console.log('- 邮箱:', reg.user_profiles?.email)
        console.log('- 电话:', reg.user_profiles?.phone)
        console.log('- 报名时间:', reg.registration_time)
        console.log('---')
      })
    }
    
  } catch (error) {
    console.error('测试过程中出错:', error)
  }
}

// 运行测试
testRegistrationData()



