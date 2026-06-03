/** 活动报名记录（成绩录入 / 名单用） */
export type RegistrationEligibilityRow = {
  status?: string | null
  approval_status?: string | null
  payment_status?: string | null
}

/**
 * 是否算作「已报名、可录入成绩」：
 * - 已批准（含未付款）
 * - 或旧数据：无审批字段且已付款
 * 待审核、已拒绝、已取消不算。
 */
export function isScoreEligibleRegistration(reg: RegistrationEligibilityRow): boolean {
  if (reg.status !== 'registered') return false
  if (reg.approval_status === 'rejected') return false
  if (reg.approval_status === 'approved') return true
  if (reg.approval_status == null || reg.approval_status === '') {
    return reg.payment_status === 'paid'
  }
  return false
}

export function filterScoreEligibleRegistrations<T extends RegistrationEligibilityRow>(
  rows: T[] | null | undefined
): T[] {
  return (rows ?? []).filter(isScoreEligibleRegistration)
}
