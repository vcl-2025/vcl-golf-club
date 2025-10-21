import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Supabase 配置
const supabaseUrl = 'https://mypglmtsgfgojtnpmkbc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cGdsbXRzZ2Znb2p0bnBta2JjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUxNjg2NiwiZXhwIjoyMDczMDkyODY2fQ.tVi2KR6IBHzgqbGzdhFXJ_YVnHzj7SzVCaV_jcoSqXc' // 需要服务角色密钥
const supabase = createClient(supabaseUrl, supabaseKey)

// 解析CSV文件（简单版本）
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim())
  const headers = lines[0].split(',').map(h => h.trim())
  const data = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    data.push(row)
  }
  
  return data
}

// 批量注册用户
async function batchRegisterUsers(csvFilePath) {
  try {
    console.log('🚀 开始批量注册用户...')
    
    // 读取CSV文件
    const content = fs.readFileSync(csvFilePath, 'utf8')
    const users = parseCSV(content)
    console.log(`📊 读取到 ${users.length} 个用户数据`)
    
    const results = {
      success: [],
      failed: []
    }
    
    // 逐个注册用户
    for (const user of users) {
      try {
        console.log(`📝 注册用户: ${user.email}`)
        
        // 验证必填字段
        if (!user.email || !user.password || !user.full_name) {
          throw new Error('缺少必填字段')
        }
        
        // 1. 在 auth.users 中创建用户
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            full_name: user.full_name,
            phone: user.phone || '',
            membership_type: user.membership_type || 'standard'
          }
        })
        
        if (authError) {
          throw new Error(`认证用户创建失败: ${authError.message}`)
        }
        
        // 2. 在 user_profiles 中创建用户资料
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            full_name: user.full_name,
            phone: user.phone || '',
            membership_type: user.membership_type || 'standard',
            email: user.email,
            real_name: user.real_name || ''
          })
        
        if (profileError) {
          // 如果用户资料创建失败，删除已创建的认证用户
          await supabase.auth.admin.deleteUser(authData.user.id)
          throw new Error(`用户资料创建失败: ${profileError.message}`)
        }
        
        results.success.push({
          email: user.email,
          id: authData.user.id,
          full_name: user.full_name
        })
        
        console.log(`✅ 用户 ${user.email} 注册成功`)
        
      } catch (error) {
        results.failed.push({
          email: user.email,
          error: error.message
        })
        console.error(`❌ 用户 ${user.email} 注册失败: ${error.message}`)
      }
    }
    
    // 输出结果
    console.log('\n📋 注册结果:')
    console.log(`✅ 成功: ${results.success.length} 个`)
    console.log(`❌ 失败: ${results.failed.length} 个`)
    
    if (results.failed.length > 0) {
      console.log('\n❌ 失败详情:')
      results.failed.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}: ${user.error}`)
      })
    }
    
    return results
    
  } catch (error) {
    console.error('❌ 批量注册失败:', error.message)
    throw error
  }
}

// 生成示例CSV文件
function generateSampleCSV() {
  const sampleData = [
    'email,password,full_name,phone,membership_type,real_name',
    'user11@example.com,password123,赵六,13800138011,standard,赵六',
    'user12@example.com,password123,钱七,13800138012,premium,钱七'
  ].join('\n')
  
  fs.writeFileSync('sample-users.csv', sampleData)
  console.log('📄 示例CSV文件已生成: sample-users.csv')
  console.log('📋 文件内容:')
  console.log(sampleData)
}

// 主函数
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('📖 使用方法:')
    console.log('  node simple-batch-register.js <CSV文件路径>')
    console.log('  node simple-batch-register.js --generate-sample')
    console.log('')
    console.log('📄 示例:')
    console.log('  node simple-batch-register.js users.csv')
    console.log('  node simple-batch-register.js --generate-sample')
    return
  }
  
  if (args[0] === '--generate-sample') {
    generateSampleCSV()
    return
  }
  
  const csvFilePath = args[0]
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ 文件不存在: ${csvFilePath}`)
    return
  }
  
  try {
    await batchRegisterUsers(csvFilePath)
  } catch (error) {
    console.error('❌ 程序执行失败:', error.message)
  }
}

// 运行主函数
main()
