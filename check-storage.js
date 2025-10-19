// 检查存储桶状态的脚本
import { createClient } from '@supabase/supabase-js'

// 使用匿名密钥检查（只读操作）
const supabaseUrl = 'https://mypglmtsgfgojtnpmkbc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cGdsbXRzZ2Znb2p0bnBta2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcxNDc0ODAsImV4cCI6MjA1MjcyMzQ4MH0.YOUR_ANON_KEY' // 需要替换为实际的匿名密钥

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStorage() {
  console.log('🔍 检查存储桶状态...')
  
  const buckets = ['poster-images', 'event-images', 'expenses', 'avatars', 'payment-proofs', 'golf-club-images']
  
  for (const bucketName of buckets) {
    try {
      console.log(`\n📁 检查存储桶: ${bucketName}`)
      
      // 尝试列出文件
      const { data: files, error } = await supabase.storage
        .from(bucketName)
        .list('', { limit: 5 })
      
      if (error) {
        console.log(`❌ ${bucketName}: ${error.message}`)
      } else if (files && files.length > 0) {
        console.log(`✅ ${bucketName}: ${files.length} 个文件`)
        files.forEach(file => {
          console.log(`  - ${file.name}`)
        })
      } else {
        console.log(`📄 ${bucketName}: 空`)
      }
      
    } catch (error) {
      console.log(`❌ ${bucketName}: 错误 - ${error.message}`)
    }
  }
}

// 执行检查
checkStorage().catch(console.error)

