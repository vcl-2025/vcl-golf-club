// 测试活动可见性的脚本
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://mypglmtsgfgojtnpmkbc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cGdsbXRzZ2Znb2p0bnBta2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NzQ4MDAsImV4cCI6MjA1MDA1MDgwMH0.8Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testEventsVisibility() {
  try {
    console.log('开始测试活动可见性...')
    
    // 1. 检查所有活动
    const { data: allEvents, error: allEventsError } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (allEventsError) {
      console.error('获取所有活动失败:', allEventsError)
      return
    }
    
    console.log('所有活动数量:', allEvents?.length || 0)
    console.log('所有活动列表:')
    allEvents?.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title}`)
      console.log(`   - ID: ${event.id}`)
      console.log(`   - 状态: ${event.status}`)
      console.log(`   - 开始时间: ${event.start_time}`)
      console.log(`   - 结束时间: ${event.end_time}`)
      console.log(`   - 创建时间: ${event.created_at}`)
      console.log('---')
    })
    
    // 2. 检查活动状态过滤
    const now = new Date()
    console.log('当前时间:', now.toISOString())
    
    const displayableEvents = (allEvents || []).filter(event => {
      const startTime = new Date(event.start_time)
      const endTime = new Date(event.end_time)
      
      // 检查活动状态
      let status = 'upcoming'
      if (event.status === 'cancelled') {
        status = 'cancelled'
      } else if (now < startTime) {
        status = 'upcoming'
      } else if (now > endTime) {
        status = 'completed'
      } else {
        status = 'active'
      }
      
      console.log(`活动 "${event.title}" 状态: ${status}`)
      return status !== 'cancelled'
    })
    
    console.log('可显示的活动数量:', displayableEvents.length)
    console.log('可显示的活动:')
    displayableEvents.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title} (${event.status})`)
    })
    
  } catch (error) {
    console.error('测试过程中出错:', error)
  }
}

// 运行测试
testEventsVisibility()


