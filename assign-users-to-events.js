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

async function assignUsersToEvents() {
  try {
    console.log('🔍 正在检查活动和用户数据...')
    
    // 1. 获取所有活动
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (eventsError) {
      console.error('获取活动失败:', eventsError)
      return
    }
    
    console.log(`📅 找到 ${events.length} 个活动`)
    
    // 2. 获取所有用户
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .order('created_at', { ascending: false })
    
    if (usersError) {
      console.error('获取用户失败:', usersError)
      return
    }
    
    console.log(`👥 找到 ${users.length} 个用户`)
    
    if (users.length < 5) {
      console.error('❌ 用户数量不足5个，无法为活动分配用户')
      return
    }
    
    // 3. 检查每个活动的现有报名情况
    for (const event of events) {
      console.log(`\n📋 处理活动: ${event.title}`)
      
      // 获取该活动的现有报名
      const { data: existingRegistrations, error: regError } = await supabase
        .from('event_registrations')
        .select('user_id')
        .eq('event_id', event.id)
      
      if (regError) {
        console.error(`获取活动 ${event.title} 的报名失败:`, regError)
        continue
      }
      
      const existingUserIds = new Set(existingRegistrations.map(r => r.user_id))
      const currentCount = existingUserIds.size
      
      console.log(`   现有报名人数: ${currentCount}`)
      
      // 如果报名人数不足5人，添加更多用户
      if (currentCount < 5) {
        const needed = 5 - currentCount
        console.log(`   需要添加 ${needed} 个用户`)
        
        // 找出还没有报名该活动的用户
        const availableUsers = users.filter(user => !existingUserIds.has(user.id))
        
        if (availableUsers.length < needed) {
          console.log(`   ⚠️  可用用户不足，只有 ${availableUsers.length} 个用户可用`)
        }
        
        // 选择用户进行报名（优先选择前几个用户）
        const usersToAdd = availableUsers.slice(0, needed)
        
        if (usersToAdd.length > 0) {
          // 创建报名记录
          const registrations = usersToAdd.map((user, index) => ({
            event_id: event.id,
            user_id: user.id,
            participant_name: user.full_name || `用户${index + 1}`,
            member_number: `M${String(index + 1).padStart(3, '0')}`,
            phone: `1380000${String(index + 1).padStart(4, '0')}`,
            payment_status: 'paid', // 设置为已支付
            status: 'registered',
            notes: '系统自动分配'
          }))
          
          const { data: insertedRegistrations, error: insertError } = await supabase
            .from('event_registrations')
            .insert(registrations)
            .select()
          
          if (insertError) {
            console.error(`   创建报名记录失败:`, insertError)
          } else {
            console.log(`   ✅ 成功添加 ${insertedRegistrations.length} 个用户报名`)
            insertedRegistrations.forEach(reg => {
              const user = users.find(u => u.id === reg.user_id)
              console.log(`      - ${user?.full_name} (${user?.email})`)
            })
          }
        }
      } else {
        console.log(`   ✅ 活动已有足够报名人数`)
      }
    }
    
    console.log('\n🎉 用户分配完成！')
    
    // 4. 显示最终统计
    console.log('\n📊 最终统计:')
    for (const event of events) {
      const { data: finalRegistrations } = await supabase
        .from('event_registrations')
        .select('user_id')
        .eq('event_id', event.id)
      
      console.log(`${event.title}: ${finalRegistrations?.length || 0} 人报名`)
    }
    
  } catch (error) {
    console.error('分配用户失败:', error)
  }
}

assignUsersToEvents()






