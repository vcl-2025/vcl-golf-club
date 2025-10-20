// 直接运行迁移脚本
import { createClient } from '@supabase/supabase-js'

// 使用你的 Supabase 配置
const supabaseUrl = 'https://mypglmtsgfgojtnpmkbc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cGdsbXRzZ2Znb2p0bnBta2JjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzE0NzQ4MCwiZXhwIjoyMDUyNzIzNDgwfQ.YOUR_SERVICE_ROLE_KEY' // 需要替换为实际的服务角色密钥

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkBuckets() {
  console.log('🔍 检查现有存储桶...')
  
  try {
    // 检查现有存储桶
    const { data: buckets, error } = await supabase.storage.listBuckets()
    
    if (error) {
      console.error('❌ 获取存储桶列表失败:', error)
      return
    }
    
    console.log('📁 现有存储桶:')
    buckets.forEach(bucket => {
      console.log(`  - ${bucket.name} (${bucket.public ? '公开' : '私有'})`)
    })
    
    // 检查每个存储桶中的文件
    const oldBuckets = ['poster-images', 'event-images', 'expenses', 'avatars', 'payment-proofs']
    
    for (const bucketName of oldBuckets) {
      try {
        const { data: files, error: listError } = await supabase.storage
          .from(bucketName)
          .list('', { limit: 10 })
        
        if (listError) {
          console.log(`❌ ${bucketName}: 无法访问 (${listError.message})`)
        } else if (files && files.length > 0) {
          console.log(`📄 ${bucketName}: ${files.length} 个文件`)
        } else {
          console.log(`📄 ${bucketName}: 空`)
        }
      } catch (error) {
        console.log(`❌ ${bucketName}: 错误 - ${error.message}`)
      }
    }
    
  } catch (error) {
    console.error('❌ 检查存储桶时出错:', error)
  }
}

// 执行检查
checkBuckets().catch(console.error)



