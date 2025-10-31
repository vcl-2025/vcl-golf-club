// 测试统一存储桶的所有上传功能
// 这个脚本用于验证所有图片上传功能是否正常工作

const { createClient } = require('@supabase/supabase-js')

// 配置 Supabase 客户端
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseKey)

// 测试路径配置
const testPaths = {
  'posters': 'golf-club-images/posters',
  'events': 'golf-club-images/events',
  'articles': 'golf-club-images/articles',
  'avatars': 'golf-club-images/avatars',
  'expenses': 'golf-club-images/expenses',
  'payment-proofs': 'golf-club-images/payment-proofs'
}

async function testUploadPermissions() {
  console.log('测试统一存储桶权限...')
  
  for (const [category, path] of Object.entries(testPaths)) {
    try {
      console.log(`\n测试 ${category} 路径: ${path}`)
      
      // 创建一个测试文件
      const testContent = `测试文件 - ${new Date().toISOString()}`
      const testFile = new Blob([testContent], { type: 'text/plain' })
      const testFileName = `test-${Date.now()}.txt`
      const fullPath = `${path}/${testFileName}`
      
      // 尝试上传
      const { data, error: uploadError } = await supabase.storage
        .from('golf-club-images')
        .upload(fullPath, testFile, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (uploadError) {
        console.error(`❌ 上传失败: ${uploadError.message}`)
        continue
      }
      
      console.log(`✅ 上传成功: ${data.path}`)
      
      // 尝试获取公开URL
      const { data: urlData } = supabase.storage
        .from('golf-club-images')
        .getPublicUrl(fullPath)
      
      console.log(`✅ 公开URL: ${urlData.publicUrl}`)
      
      // 尝试删除测试文件
      const { error: deleteError } = await supabase.storage
        .from('golf-club-images')
        .remove([fullPath])
      
      if (deleteError) {
        console.error(`❌ 删除失败: ${deleteError.message}`)
      } else {
        console.log(`✅ 删除成功`)
      }
      
    } catch (error) {
      console.error(`测试 ${category} 时出错:`, error)
    }
  }
  
  console.log('\n测试完成！')
}

// 执行测试
testUploadPermissions().catch(console.error)






