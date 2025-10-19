import { supabase } from '../lib/supabase'

// 检测设备类型
function detectDeviceType(): string {
  const userAgent = navigator.userAgent.toLowerCase()
  
  // 移动设备检测
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini|windows phone/i.test(userAgent)) {
    return 'mobile'
  }
  
  // 平板检测
  if (/tablet|ipad/i.test(userAgent)) {
    return 'tablet'
  }
  
  // 桌面设备
  return 'desktop'
}

// 记录用户登录
export async function logUserLogin() {
  try {
    const deviceType = detectDeviceType()
    const userAgent = navigator.userAgent
    
    // 获取当前用户ID
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // console.log('用户未登录，跳过日志记录')
      return
    }
    
    // console.log('准备记录登录日志:', { userId: user.id, deviceType, userAgent })
    
    // 插入登录日志
    const { data, error } = await supabase
      .from('login_logs')
      .insert({
        user_id: user.id,
        device_type: deviceType,
        user_agent: userAgent
      })
      .select()
    
    if (error) {
      console.error('记录登录日志失败:', error)
    } else {
      // console.log('登录日志记录成功:', data)
    }
  } catch (error) {
    console.error('登录日志记录异常:', error)
  }
}
