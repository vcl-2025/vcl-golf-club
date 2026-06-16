import type { EventRegistration } from '../types'

type RegistrationForCancel = Pick<
  EventRegistration,
  'approval_status' | 'payment_status' | 'status'
>

/** 会员可自助取消：待审批，或已通过但未付款（与报名截止时间无关） */
export function canMemberSelfCancelRegistration(
  registration: RegistrationForCancel | null | undefined
): boolean {
  if (!registration) return false
  if (registration.status === 'cancelled') return false
  if (registration.approval_status === 'pending') return true
  if (
    registration.approval_status === 'approved' &&
    registration.payment_status === 'pending'
  ) {
    return true
  }
  return false
}
