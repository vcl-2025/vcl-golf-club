import { supabase } from '../lib/supabase'

export const ANNUAL_RANKING_MIN_EVENTS = 3
export const ANNUAL_RANKING_TIMEZONE = 'America/Vancouver'

export interface AnnualMemberRankingRow {
  userId: string
  fullName: string
  avatarUrl: string | null
  avatarPositionX: number
  avatarPositionY: number
  eventCount: number
  avgNet: number
  bestNet: number
  rank: number
}

export interface AnnualMemberRankingResult {
  year: number
  asOfDate: string
  rows: AnnualMemberRankingRow[]
}

function vancouverYear(date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: ANNUAL_RANKING_TIMEZONE,
      year: 'numeric',
    }).format(date)
  )
}

function vancouverDateLabel(date = new Date()): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: ANNUAL_RANKING_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function eventYearInVancouver(startTime: string | null | undefined): number | null {
  if (!startTime) return null
  const ms = Date.parse(startTime)
  if (!Number.isFinite(ms)) return null
  return vancouverYear(new Date(ms))
}

/**
 * 本年度会员净杆榜：仅会员 scores，按平均净杆升序。
 * 门槛：至少参赛 ANNUAL_RANKING_MIN_EVENTS 场且 net_strokes 非空。
 */
export async function fetchAnnualMemberRanking(options?: {
  year?: number
  minEvents?: number
}): Promise<AnnualMemberRankingResult> {
  const year = options?.year ?? vancouverYear()
  const minEvents = options?.minEvents ?? ANNUAL_RANKING_MIN_EVENTS

  if (!supabase) {
    return { year, asOfDate: vancouverDateLabel(), rows: [] }
  }

  const { data, error } = await supabase
    .from('scores')
    .select(
      `
      user_id,
      event_id,
      net_strokes,
      events!inner (
        id,
        start_time
      ),
      user_profiles (
        id,
        full_name,
        avatar_url,
        avatar_position_x,
        avatar_position_y
      )
    `
    )
    .not('net_strokes', 'is', null)
    .not('user_id', 'is', null)

  if (error) {
    console.error('获取本年度会员榜失败:', error)
    throw error
  }

  type ScoreRow = {
    user_id: string
    event_id: string
    net_strokes: number | string | null
    events:
      | { id?: string; start_time?: string }
      | { id?: string; start_time?: string }[]
      | null
    user_profiles:
      | {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          avatar_position_x?: number | null
          avatar_position_y?: number | null
        }
      | {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          avatar_position_x?: number | null
          avatar_position_y?: number | null
        }[]
      | null
  }

  const byUserEvent = new Map<string, { userId: string; eventId: string; net: number; profile: ScoreRow['user_profiles'] }>()

  for (const raw of (data || []) as ScoreRow[]) {
    const event = Array.isArray(raw.events) ? raw.events[0] : raw.events
    const y = eventYearInVancouver(event?.start_time)
    if (y !== year) continue

    const net = Number(raw.net_strokes)
    if (!Number.isFinite(net)) continue

    const userId = String(raw.user_id)
    const eventId = String(raw.event_id)
    const key = `${userId}::${eventId}`
    const existing = byUserEvent.get(key)
    // 同一人同一场多条时取更优净杆
    if (!existing || net < existing.net) {
      byUserEvent.set(key, {
        userId,
        eventId,
        net,
        profile: raw.user_profiles,
      })
    }
  }

  const byUser = new Map<
    string,
    {
      nets: number[]
      profile: ScoreRow['user_profiles']
    }
  >()

  for (const item of byUserEvent.values()) {
    const bucket = byUser.get(item.userId) || { nets: [], profile: item.profile }
    bucket.nets.push(item.net)
    if (!bucket.profile && item.profile) {
      bucket.profile = item.profile
    }
    byUser.set(item.userId, bucket)
  }

  const rows: Omit<AnnualMemberRankingRow, 'rank'>[] = []

  for (const [userId, bucket] of byUser.entries()) {
    if (bucket.nets.length < minEvents) continue
    const profile = Array.isArray(bucket.profile) ? bucket.profile[0] : bucket.profile
    const sum = bucket.nets.reduce((acc, n) => acc + n, 0)
    const avgNet = Math.round((sum / bucket.nets.length) * 10) / 10
    const bestNet = Math.min(...bucket.nets)
    rows.push({
      userId,
      fullName: (profile?.full_name || '会员').trim() || '会员',
      avatarUrl: profile?.avatar_url || null,
      avatarPositionX: Number(profile?.avatar_position_x ?? 50),
      avatarPositionY: Number(profile?.avatar_position_y ?? 50),
      eventCount: bucket.nets.length,
      avgNet,
      bestNet,
    })
  }

  rows.sort((a, b) => {
    if (a.avgNet !== b.avgNet) return a.avgNet - b.avgNet
    if (a.bestNet !== b.bestNet) return a.bestNet - b.bestNet
    return b.eventCount - a.eventCount
  })

  return {
    year,
    asOfDate: vancouverDateLabel(),
    rows: rows.map((row, index) => ({ ...row, rank: index + 1 })),
  }
}
