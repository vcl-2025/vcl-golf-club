import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 批量导入用户开始...')
    
    const { users } = await req.json()
    console.log('📋 收到用户数据:', users.length, '个用户')
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      return new Response(
        JSON.stringify({ error: '没有提供用户数据' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 创建Supabase客户端（使用服务角色密钥）
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let successCount = 0
    let failedCount = 0
    let skippedCount = 0
    const errors: string[] = []
    const skipped: string[] = []

    console.log('🔄 开始处理用户...')

    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      console.log(`处理用户 ${i + 1}/${users.length}: ${user.email}`)

      try {
        // 验证必需字段（membership_type 可以为空，使用默认值）
        if (!user.email || !user.password || !user.full_name || !user.phone) {
          throw new Error('缺少必需字段: email, password, full_name, phone')
        }

        // 检查用户是否已存在
        const { data: existingUser } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', user.email)
          .single()

        if (existingUser) {
          // 用户已存在，跳过（不计入失败）
          skippedCount++
          skipped.push(`${user.email}: 用户已存在，已跳过`)
          console.log(`⏭️  用户 ${user.email} 已存在，跳过`)
          continue
        }

        // 创建认证用户
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true
        })

        if (authError) {
          throw new Error(`创建认证用户失败: ${authError.message}`)
        }

        console.log('✅ 认证用户创建成功:', authUser.user?.id)

        // 处理 handicap 和 bc_handicap（转换为数字，处理非数字值）
        const parseHandicap = (value: any): number | null => {
          if (!value) return null
          const num = parseFloat(value)
          if (isNaN(num)) return null
          return num
        }

        // 处理生日（确保格式正确）
        let birthdayValue: string | null = null
        if (user.birthday) {
          // 尝试解析日期格式 YYYY-MM-DD
          const dateStr = String(user.birthday).trim()
          if (dateStr && dateStr !== '') {
            // 验证日期格式
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/
            if (dateRegex.test(dateStr)) {
              birthdayValue = dateStr
            } else {
              console.warn(`日期格式不正确: ${dateStr}，跳过`)
            }
          }
        }

        // 处理 membership_type（确保值在允许的列表中）
        const allowedMembershipTypes = ['standard', 'premium', 'vip']
        let membershipType = (user.membership_type || 'standard').toLowerCase().trim()
        if (!allowedMembershipTypes.includes(membershipType)) {
          console.warn(`membership_type "${user.membership_type}" 不在允许列表中，使用默认值 'standard'`)
          membershipType = 'standard'
        }

        // 创建用户档案（使用 upsert，因为触发器可能已经创建了记录）
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: authUser.user!.id,
            email: user.email,
            full_name: user.full_name,
            real_name: user.real_name || user.full_name,
            phone: user.phone,
            membership_type: membershipType,
            role: user.role || 'member',
            handicap: parseHandicap(user.handicap),
            bc_handicap: parseHandicap(user.bc_handicap),
            golflive_name: user.golflive_name || null,
            birthday: birthdayValue,
            clothing_size: user.clothing_size || null,
            vancouver_residence: user.vancouver_residence || null,
            domestic_residence: user.domestic_residence || null,
            main_club_membership: user.main_club_membership || null,
            industry: user.industry || null,
            golf_preferences: user.golf_preferences || null,
            golf_motto: user.golf_motto || null,
            other_interests: user.other_interests || null,
            is_active: true
          }, {
            onConflict: 'id'
          })

        if (profileError) {
          // 如果档案创建失败，删除认证用户
          await supabase.auth.admin.deleteUser(authUser.user!.id)
          throw new Error(`创建用户档案失败: ${profileError.message}`)
        }

        console.log('✅ 用户档案创建成功')
        successCount++

      } catch (error) {
        console.error('❌ 用户创建失败:', error)
        failedCount++
        errors.push(`${user.email}: ${error.message}`)
      }
    }

    console.log('📊 批量导入完成:', { success: successCount, failed: failedCount })

    return new Response(
      JSON.stringify({
        success: successCount,
        failed: failedCount,
        skipped: skippedCount,
        errors: errors,
        skippedUsers: skipped,
        message: `批量导入完成！成功: ${successCount}，失败: ${failedCount}，跳过: ${skippedCount}`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ 批量导入失败:', error)
    return new Response(
      JSON.stringify({ 
        error: '批量导入失败', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
