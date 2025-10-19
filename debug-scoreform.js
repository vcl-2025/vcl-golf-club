// 调试 ScoreForm 的查询问题
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('请确保在.env文件中设置了VITE_SUPABASE_URL和SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugScoreForm() {
  try {
    console.log('🔍 调试 ScoreForm 查询问题...\n')

    // 1. 获取所有活动
    console.log('1. 获取所有活动:')
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, start_time')
      .order('created_at', { ascending: false })

    if (eventsError) {
      console.error('获取活动失败:', eventsError)
      return
    }

    console.log(`找到 ${events.length} 个活动:`)
    events.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.title} (ID: ${event.id})`)
    })

    if (events.length === 0) {
      console.log('❌ 没有找到任何活动')
      return
    }

    // 2. 检查第一个活动的报名情况
    const firstEvent = events[0]
    console.log(`\n2. 检查活动 "${firstEvent.title}" 的报名情况:`)

    // 2.1 直接查询报名记录
    console.log('\n2.1 直接查询报名记录:')
    const { data: registrations, error: regError } = await supabase
      .from('event_registrations')
      .select('id, user_id, payment_status, registration_number')
      .eq('event_id', firstEvent.id)

    if (regError) {
      console.error('查询报名记录失败:', regError)
    } else {
      console.log(`找到 ${registrations.length} 条报名记录:`)
      registrations.forEach((reg, index) => {
        console.log(`  ${index + 1}. User ID: ${reg.user_id}, Payment: ${reg.payment_status}, Number: ${reg.registration_number}`)
      })
    }

    // 2.2 查询已付费的报名记录
    console.log('\n2.2 查询已付费的报名记录:')
    const { data: paidRegistrations, error: paidError } = await supabase
      .from('event_registrations')
      .select('id, user_id, payment_status, registration_number')
      .eq('event_id', firstEvent.id)
      .eq('payment_status', 'paid')

    if (paidError) {
      console.error('查询已付费报名记录失败:', paidError)
    } else {
      console.log(`找到 ${paidRegistrations.length} 条已付费报名记录`)
    }

    // 2.3 尝试关联查询（ScoreForm 使用的查询）
    console.log('\n2.3 尝试关联查询 (ScoreForm 使用的查询):')
    const { data: participants, error: participantsError } = await supabase
      .from('event_registrations')
      .select(`
        id,
        user_id,
        registration_number,
        user_profiles!event_registrations_user_id_fkey (
          full_name,
          email
        )
      `)
      .eq('event_id', firstEvent.id)
      .eq('payment_status', 'paid')
      .order('registration_number')

    if (participantsError) {
      console.error('❌ 关联查询失败:', participantsError)
      console.log('\n🔧 尝试修复方案...')
      
      // 尝试不同的关联方式
      console.log('\n2.4 尝试简化的关联查询:')
      const { data: simpleParticipants, error: simpleError } = await supabase
        .from('event_registrations')
        .select(`
          id,
          user_id,
          registration_number,
          user_profiles (
            full_name,
            email
          )
        `)
        .eq('event_id', firstEvent.id)
        .eq('payment_status', 'paid')
        .order('registration_number')

      if (simpleError) {
        console.error('❌ 简化关联查询也失败:', simpleError)
      } else {
        console.log(`✅ 简化关联查询成功，找到 ${simpleParticipants.length} 个参与者`)
        simpleParticipants.forEach((p, index) => {
          console.log(`  ${index + 1}. ${p.user_profiles?.full_name || 'Unknown'} (${p.user_profiles?.email || 'No email'})`)
        })
      }
    } else {
      console.log(`✅ 关联查询成功，找到 ${participants.length} 个参与者`)
      participants.forEach((p, index) => {
        console.log(`  ${index + 1}. ${p.user_profiles?.full_name || 'Unknown'} (${p.user_profiles?.email || 'No email'})`)
      })
    }

    // 3. 检查外键关系
    console.log('\n3. 检查外键关系:')
    const { data: fkInfo, error: fkError } = await supabase
      .rpc('get_foreign_keys', { table_name: 'event_registrations' })
      .catch(() => ({ data: null, error: 'RPC not available' }))

    if (fkError) {
      console.log('无法获取外键信息，但我们可以手动检查...')
    }

  } catch (error) {
    console.error('调试过程中出错:', error)
  }
}

debugScoreForm()




