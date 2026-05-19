import type { SupabaseClient } from '@supabase/supabase-js'

/** 读取「报名是否需要管理员审批」。查询失败或未登录客户端时默认 true。 */
export async function fetchRegistrationRequiresApproval(
  client: SupabaseClient | null
): Promise<boolean> {
  if (!client) return true
  const { data, error } = await client
    .from('club_settings')
    .select('registration_requires_approval')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    console.warn('读取 club_settings 失败，默认需要审批:', error.message)
    return true
  }
  if (data == null || data.registration_requires_approval === undefined) {
    return true
  }
  return Boolean(data.registration_requires_approval)
}
