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

/** 会员本年度单场成绩（用于榜单下钻） */
export interface MemberYearScoreEvent {
  scoreId: string
  eventId: string
  eventTitle: string
  startTime: string
  location: string | null
  eventType: string | null
  totalStrokes: number
  netStrokes: number | null
  handicap: number
  rank: number | null
  notes: string | null
  holeScores: number[] | null
  groupNumber: number | null
  teamName: string | null
  par: number[] | null
}

function normalizeHoleScores(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const nums = raw.map((v) => Number(v))
  if (nums.every((n) => !Number.isFinite(n) || n <= 0)) return null
  return nums.map((n) => (Number.isFinite(n) ? n : 0))
}

function normalizePar(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const nums = raw.map((v) => Number(v))
  if (!nums.some((n) => Number.isFinite(n) && n > 0)) return null
  return nums.map((n) => (Number.isFinite(n) ? n : 0))
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

/**
 * 某会员本年度参赛成绩列表（与榜单同一套温哥华年过滤 + 同场取更优净杆）。
 */
export async function fetchMemberYearScores(options: {
  userId: string
  year?: number
}): Promise<MemberYearScoreEvent[]> {
  const year = options.year ?? vancouverYear()
  const userId = options.userId

  if (!supabase || !userId) return []

  const { data, error } = await supabase
    .from('scores')
    .select(
      `
      id,
      user_id,
      event_id,
      total_strokes,
      net_strokes,
      handicap,
      rank,
      notes,
      hole_scores,
      group_number,
      team_name,
      events!inner (
        id,
        title,
        start_time,
        location,
        event_type,
        par
      )
    `
    )
    .eq('user_id', userId)
    .not('net_strokes', 'is', null)

  if (error) {
    console.error('获取会员年度成绩失败:', error)
    throw error
  }

  type Raw = {
    id: string
    user_id: string
    event_id: string
    total_strokes: number | string | null
    net_strokes: number | string | null
    handicap: number | string | null
    rank: number | string | null
    notes: string | null
    hole_scores: unknown
    group_number: number | string | null
    team_name: string | null
    events:
      | {
          id?: string
          title?: string | null
          start_time?: string | null
          location?: string | null
          event_type?: string | null
          par?: unknown
        }
      | {
          id?: string
          title?: string | null
          start_time?: string | null
          location?: string | null
          event_type?: string | null
          par?: unknown
        }[]
      | null
  }

  const byEvent = new Map<string, MemberYearScoreEvent>()

  for (const raw of (data || []) as Raw[]) {
    const event = Array.isArray(raw.events) ? raw.events[0] : raw.events
    const startTime = event?.start_time || ''
    if (eventYearInVancouver(startTime) !== year) continue

    const net = Number(raw.net_strokes)
    if (!Number.isFinite(net)) continue

    const eventId = String(raw.event_id)
    const total = Number(raw.total_strokes)
    const item: MemberYearScoreEvent = {
      scoreId: String(raw.id),
      eventId,
      eventTitle: (event?.title || '未命名活动').trim() || '未命名活动',
      startTime,
      location: event?.location || null,
      eventType: event?.event_type || null,
      totalStrokes: Number.isFinite(total) ? total : 0,
      netStrokes: net,
      handicap: Number(raw.handicap) || 0,
      rank: raw.rank == null || raw.rank === '' ? null : Number(raw.rank),
      notes: raw.notes || null,
      holeScores: normalizeHoleScores(raw.hole_scores),
      groupNumber:
        raw.group_number == null || raw.group_number === ''
          ? null
          : Number(raw.group_number),
      teamName: raw.team_name || null,
      par: normalizePar(event?.par),
    }

    const existing = byEvent.get(eventId)
    if (!existing || (item.netStrokes ?? Infinity) < (existing.netStrokes ?? Infinity)) {
      byEvent.set(eventId, item)
    }
  }

  return Array.from(byEvent.values()).sort(
    (a, b) => Date.parse(b.startTime) - Date.parse(a.startTime)
  )
}
