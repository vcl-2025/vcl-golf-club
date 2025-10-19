import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStorageBucket() {
  console.log('检查存储桶配置...\n')

  try {
    // 1. 检查存储桶是否存在
    console.log('1. 检查 poster-images 存储桶...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('❌ 获取存储桶列表失败:', bucketsError.message)
      return
    }

    const posterBucket = buckets.find(bucket => bucket.id === 'poster-images')
    if (posterBucket) {
      console.log('✓ poster-images 存储桶存在')
      console.log('  - 名称:', posterBucket.name)
      console.log('  - 公开:', posterBucket.public)
      console.log('  - 文件大小限制:', posterBucket.file_size_limit)
      console.log('  - 允许的MIME类型:', posterBucket.allowed_mime_types)
    } else {
      console.log('❌ poster-images 存储桶不存在')
      console.log('可用的存储桶:', buckets.map(b => b.id).join(', '))
    }

    // 2. 测试上传功能
    console.log('\n2. 测试上传功能...')
    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' })
    const testPath = `test-uploads/${Date.now()}-test.txt`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('poster-images')
      .upload(testPath, testFile)

    if (uploadError) {
      console.error('❌ 上传测试失败:', uploadError.message)
      console.error('错误代码:', uploadError.statusCode)
    } else {
      console.log('✓ 上传测试成功')
      console.log('  - 路径:', uploadData.path)
      
      // 清理测试文件
      await supabase.storage.from('poster-images').remove([testPath])
      console.log('✓ 测试文件已清理')
    }

    // 3. 检查现有文件
    console.log('\n3. 检查现有文件...')
    const { data: files, error: filesError } = await supabase.storage
      .from('poster-images')
      .list('', { limit: 10 })

    if (filesError) {
      console.error('❌ 获取文件列表失败:', filesError.message)
    } else {
      console.log('✓ 现有文件数量:', files.length)
      if (files.length > 0) {
        console.log('文件列表:')
        files.forEach(file => {
          console.log(`  - ${file.name} (${file.metadata?.size || 'unknown'} bytes)`)
        })
      }
    }

  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error.message)
  }
}

checkStorageBucket()

