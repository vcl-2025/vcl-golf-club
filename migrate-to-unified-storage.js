// 迁移现有文件到统一存储桶的脚本
// 这个脚本需要手动执行，因为需要 Supabase 管理员权限

const { createClient } = require('@supabase/supabase-js')

// 配置 Supabase 客户端
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseKey)

// 需要迁移的存储桶和对应的新路径
const migrationMap = {
  'poster-images': 'golf-club-images/posters',
  'event-images': 'golf-club-images/events', 
  'expenses': 'golf-club-images/expenses',
  'avatars': 'golf-club-images/avatars',
  'payment-proofs': 'golf-club-images/payment-proofs'
}

async function migrateFiles() {
  console.log('开始迁移文件到统一存储桶...')
  
  for (const [oldBucket, newPath] of Object.entries(migrationMap)) {
    try {
      console.log(`\n处理存储桶: ${oldBucket} -> ${newPath}`)
      
      // 列出旧存储桶中的所有文件
      const { data: files, error: listError } = await supabase.storage
        .from(oldBucket)
        .list('', { limit: 1000 })
      
      if (listError) {
        console.error(`列出 ${oldBucket} 文件失败:`, listError)
        continue
      }
      
      if (!files || files.length === 0) {
        console.log(`${oldBucket} 存储桶为空，跳过`)
        continue
      }
      
      console.log(`找到 ${files.length} 个文件需要迁移`)
      
      // 迁移每个文件
      for (const file of files) {
        try {
          // 下载文件
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(oldBucket)
            .download(file.name)
          
          if (downloadError) {
            console.error(`下载文件 ${file.name} 失败:`, downloadError)
            continue
          }
          
          // 上传到新位置
          const newFilePath = `${newPath}/${file.name}`
          const { error: uploadError } = await supabase.storage
            .from('golf-club-images')
            .upload(newFilePath, fileData, {
              cacheControl: '3600',
              upsert: true
            })
          
          if (uploadError) {
            console.error(`上传文件 ${newFilePath} 失败:`, uploadError)
            continue
          }
          
          console.log(`✅ 迁移成功: ${file.name}`)
          
        } catch (error) {
          console.error(`迁移文件 ${file.name} 时出错:`, error)
        }
      }
      
    } catch (error) {
      console.error(`处理存储桶 ${oldBucket} 时出错:`, error)
    }
  }
  
  console.log('\n迁移完成！')
}

// 执行迁移
migrateFiles().catch(console.error)




