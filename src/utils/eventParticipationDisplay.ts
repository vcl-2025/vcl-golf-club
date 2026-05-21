import { supabase } from '../lib/supabase'

export interface EventParticipationSummary {
  total: number
  members: number
  guests: number
}

/** 例：40人参赛 嘉宾：2（已录入成绩人数） */
export function formatEventParticipationLabel(
  summary: Pick<EventParticipationSummary, 'total' | 'guests'>
): string {
  const base = `${summary.total}人参赛`
  return summary.guests > 0 ? `${base} 嘉宾：${summary.guests}` : base
}

export async function fetchEventParticipationSummary(
  eventId: string
): Promise<EventParticipationSummary | null> {
  if (!supabase) return null

  const [memberRes, guestRes] = await Promise.all([
    supabase
      .from('scores')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId),
    supabase
      .from('guest_scores')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId),
  ])

  if (memberRes.error) console.error('获取会员成绩人数失败:', memberRes.error)
  if (guestRes.error) console.error('获取嘉宾成绩人数失败:', guestRes.error)

  const members = memberRes.count ?? 0
  const guests = guestRes.count ?? 0
  if (members + guests > 0) {
    return { total: members + guests, members, guests }
  }

  // 无成绩记录时回退为有效报名人数（与活动列表统计口径一致）
  const { data: stats, error: statsError } = await supabase.rpc('get_event_stats', {
    event_uuid: eventId,
  })
  if (statsError) {
    console.error('获取活动报名统计失败:', statsError)
    return { total: 0, members: 0, guests: 0 }
  }
  const registered = Number(stats?.total_registrations ?? 0)
  return { total: registered, members: registered, guests: 0 }
}
