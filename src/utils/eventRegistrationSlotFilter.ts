/** PostgREST `.or(...)`：占用名额的报名（已通过 + 待批 + 无审批字段的旧数据），不含驳回 */
export const REGISTRATION_OCCUPYING_SLOT_OR_FILTER =
  'approval_status.is.null,approval_status.eq.pending,approval_status.eq.approved'
