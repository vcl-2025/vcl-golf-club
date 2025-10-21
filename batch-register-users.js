const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const csv = require('csv-parser')
const xlsx = require('xlsx')
const bcrypt = require('bcryptjs')

// Supabase 配置
const supabaseUrl = 'https://mypglmtsgfgojtnpmkbc.supabase.co'
const supabaseKey = 'your-service-role-key' // 需要服务角色密钥
const supabase = createClient(supabaseUrl, supabaseKey)

// 批量注册用户
async function batchRegisterUsers(filePath, fileType = 'csv') {
  try {
    console.log('🚀 开始批量注册用户...')
    
    // 读取文件数据
    const users = await readUserData(filePath, fileType)
    console.log(`📊 读取到 ${users.length} 个用户数据`)
    
    // 验证数据
    const validatedUsers = validateUserData(users)
    console.log(`✅ 验证通过 ${validatedUsers.length} 个用户`)
    
    // 批量注册
    const results = await registerUsers(validatedUsers)
    
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

// 读取用户数据
async function readUserData(filePath, fileType) {
  return new Promise((resolve, reject) => {
    const users = []
    
    if (fileType === 'csv') {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          users.push(row)
        })
        .on('end', () => {
          resolve(users)
        })
        .on('error', reject)
    } else if (fileType === 'excel') {
      try {
        const workbook = xlsx.readFile(filePath)
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = xlsx.utils.sheet_to_json(worksheet)
        resolve(jsonData)
      } catch (error) {
        reject(error)
      }
    } else {
      reject(new Error('不支持的文件类型'))
    }
  })
}

// 验证用户数据
function validateUserData(users) {
  const validatedUsers = []
  const requiredFields = ['email', 'password', 'full_name']
  
  users.forEach((user, index) => {
    try {
      // 检查必填字段
      const missingFields = requiredFields.filter(field => !user[field])
      if (missingFields.length > 0) {
        throw new Error(`缺少必填字段: ${missingFields.join(', ')}`)
      }
      
      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(user.email)) {
        throw new Error('邮箱格式不正确')
      }
      
      // 验证密码长度
      if (user.password.length < 6) {
        throw new Error('密码长度至少6位')
      }
      
      // 设置默认值
      const validatedUser = {
        email: user.email.trim().toLowerCase(),
        password: user.password,
        full_name: user.full_name.trim(),
        phone: user.phone?.trim() || '',
        membership_type: user.membership_type?.trim() || 'standard',
        real_name: user.real_name?.trim() || '',
        // 用户元数据
        user_metadata: {
          full_name: user.full_name.trim(),
          phone: user.phone?.trim() || '',
          membership_type: user.membership_type?.trim() || 'standard'
        }
      }
      
      validatedUsers.push(validatedUser)
      
    } catch (error) {
      console.warn(`⚠️ 第 ${index + 1} 行数据验证失败: ${error.message}`)
    }
  })
  
  return validatedUsers
}

// 注册用户
async function registerUsers(users) {
  const results = {
    success: [],
    failed: []
  }
  
  for (const user of users) {
    try {
      console.log(`📝 注册用户: ${user.email}`)
      
      // 1. 在 auth.users 中创建用户
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // 自动确认邮箱
        user_metadata: user.user_metadata
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
          phone: user.phone,
          membership_type: user.membership_type,
          email: user.email,
          real_name: user.real_name
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
  
  return results
}

// 生成示例CSV文件
function generateSampleCSV() {
  const sampleData = [
    {
      email: 'user1@example.com',
      password: 'password123',
      full_name: '张三',
      phone: '13800138001',
      membership_type: 'standard',
      real_name: '张三'
    },
    {
      email: 'user2@example.com',
      password: 'password123',
      full_name: '李四',
      phone: '13800138002',
      membership_type: 'premium',
      real_name: '李四'
    },
    {
      email: 'user3@example.com',
      password: 'password123',
      full_name: '王五',
      phone: '13800138003',
      membership_type: 'vip',
      real_name: '王五'
    }
  ]
  
  const csvContent = [
    'email,password,full_name,phone,membership_type,real_name',
    ...sampleData.map(user => 
      `${user.email},${user.password},${user.full_name},${user.phone},${user.membership_type},${user.real_name}`
    )
  ].join('\n')
  
  fs.writeFileSync('sample-users.csv', csvContent)
  console.log('📄 示例CSV文件已生成: sample-users.csv')
}

// 主函数
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('📖 使用方法:')
    console.log('  node batch-register-users.js <文件路径> [文件类型]')
    console.log('  文件类型: csv (默认) 或 excel')
    console.log('')
    console.log('📄 示例:')
    console.log('  node batch-register-users.js users.csv')
    console.log('  node batch-register-users.js users.xlsx excel')
    console.log('')
    console.log('🔧 生成示例文件:')
    console.log('  node batch-register-users.js --generate-sample')
    return
  }
  
  if (args[0] === '--generate-sample') {
    generateSampleCSV()
    return
  }
  
  const filePath = args[0]
  const fileType = args[1] || 'csv'
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`)
    return
  }
  
  try {
    await batchRegisterUsers(filePath, fileType)
  } catch (error) {
    console.error('❌ 程序执行失败:', error.message)
  }
}

// 运行主函数
if (require.main === module) {
  main()
}

module.exports = {
  batchRegisterUsers,
  generateSampleCSV
}
