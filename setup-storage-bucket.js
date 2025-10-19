import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  console.error('需要设置 SUPABASE_SERVICE_ROLE_KEY 环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupStorageBucket() {
  console.log('开始设置存储桶...\n')

  try {
    // 1. 创建 poster-images 存储桶
    console.log('1. 创建 poster-images 存储桶...')
    const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('poster-images', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    })

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✓ poster-images 存储桶已存在')
      } else {
        console.error('❌ 创建存储桶失败:', bucketError.message)
        return
      }
    } else {
      console.log('✓ poster-images 存储桶创建成功')
    }

    // 2. 设置存储桶策略
    console.log('\n2. 设置存储桶访问策略...')
    
    const policies = [
      // 允许所有人查看图片
      `CREATE POLICY "Public can view poster images"
       ON storage.objects FOR SELECT
       USING (bucket_id = 'poster-images');`,
      
      // 允许认证用户上传图片
      `CREATE POLICY "Authenticated users can upload poster images"
       ON storage.objects FOR INSERT
       TO authenticated
       WITH CHECK (bucket_id = 'poster-images');`,
      
      // 允许认证用户更新图片
      `CREATE POLICY "Authenticated users can update poster images"
       ON storage.objects FOR UPDATE
       TO authenticated
       USING (bucket_id = 'poster-images');`,
      
      // 允许认证用户删除图片
      `CREATE POLICY "Authenticated users can delete poster images"
       ON storage.objects FOR DELETE
       TO authenticated
       USING (bucket_id = 'poster-images');`
    ]

    for (const policy of policies) {
      try {
        const { error: policyError } = await supabase.rpc('exec_sql', { sql: policy })
        if (policyError) {
          console.log('策略可能已存在，跳过...')
        } else {
          console.log('✓ 策略设置成功')
        }
      } catch (error) {
        console.log('策略设置跳过（可能已存在）')
      }
    }

    console.log('\n✓ 存储桶设置完成！')
    console.log('\n现在可以测试图片上传功能了。')

  } catch (error) {
    console.error('❌ 设置过程中出现错误:', error.message)
  }
}

setupStorageBucket()

