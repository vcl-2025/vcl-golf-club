import { supabase } from '../lib/supabase'
import {
  computeTeamSummaryScores,
  isHigherTeamScoreBetter,
  type ScoringMode,
  type TeamManualScores,
  type TeamScoreRow,
} from './teamEventScores'

export const ANNUAL_TEAM_TIMEZONE = 'America/Vancouver'

export interface AnnualTeamMatchResult {
  eventId: string
  eventTitle: string
  startTime: string
  scoringMode: ScoringMode
  redScore: number
  greenScore: number
  winner: '红队' | '绿队' | '平局'
}

export interface AnnualTeamStandingResult {
  year: number
  asOfDate: string
  redWins: number
  greenWins: number
  ties: number
  matches: AnnualTeamMatchResult[]
}

function vancouverYear(date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: ANNUAL_TEAM_TIMEZONE,
      year: 'numeric',
    }).format(date)
  )
}

function vancouverDateLabel(date = new Date()): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: ANNUAL_TEAM_TIMEZONE,
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

function normalizeTeamKey(name: string): '红队' | '绿队' | null {
  const t = name.trim()
  if (t === '红队' || t === '红') return '红队'
  if (t === '绿队' || t === '绿') return '绿队'
  if (/红/.test(t) && !/绿/.test(t)) return '红队'
  if (/绿/.test(t) && !/红/.test(t)) return '绿队'
  return null
}

function pickRedGreenScores(
  summaries: Array<{ team_name: string; score: number }>
): { red: number; green: number } | null {
  let red: number | null = null
  let green: number | null = null
  for (const row of summaries) {
    const key = normalizeTeamKey(row.team_name)
    if (key === '红队') red = row.score
    if (key === '绿队') green = row.score
  }
  if (red == null || green == null) return null
  return { red, green }
}

/**
 * 本年度红绿团体对决胜场：仅统计同时有红队、绿队成绩，且上场队伍恰好两队的团体赛。
 */
export async function fetchAnnualTeamStanding(options?: {
  year?: number
}): Promise<AnnualTeamStandingResult> {
  const year = options?.year ?? vancouverYear()
  const empty: AnnualTeamStandingResult = {
    year,
    asOfDate: vancouverDateLabel(),
    redWins: 0,
    greenWins: 0,
    ties: 0,
    matches: [],
  }

  if (!supabase) return empty

  const { data: events, error: eventError } = await supabase
    .from('events')
    .select(
      'id, title, start_time, event_type, scoring_mode, team_manual_scores, team_colors'
    )
    .eq('event_type', '团体赛')

  if (eventError) {
    console.error('获取团体赛活动失败:', eventError)
    throw eventError
  }

  const yearEvents = (events || []).filter(
    (e) => eventYearInVancouver(e.start_time) === year
  )
  if (yearEvents.length === 0) return empty

  const eventIds = yearEvents.map((e) => e.id)

  const [{ data: memberScores, error: scoreError }, { data: guestScores, error: guestError }] =
    await Promise.all([
      supabase
        .from('scores')
        .select(
          'event_id, team_name, group_number, hole_scores, net_strokes, total_strokes'
        )
        .in('event_id', eventIds),
      supabase
        .from('guest_scores')
        .select(
          'event_id, team_name, group_number, hole_scores, net_strokes, total_strokes'
        )
        .in('event_id', eventIds),
    ])

  if (scoreError) {
    console.error('获取会员团体成绩失败:', scoreError)
    throw scoreError
  }
  if (guestError) {
    console.error('获取访客团体成绩失败:', guestError)
    throw guestError
  }

  const scoresByEvent = new Map<string, TeamScoreRow[]>()
  for (const row of [...(memberScores || []), ...(guestScores || [])]) {
    const eventId = String((row as { event_id: string }).event_id)
    if (!scoresByEvent.has(eventId)) scoresByEvent.set(eventId, [])
    scoresByEvent.get(eventId)!.push(row as TeamScoreRow)
  }

  const matches: AnnualTeamMatchResult[] = []

  for (const event of yearEvents) {
    const scoringMode = ((event.scoring_mode as ScoringMode) ||
      'ryder_cup') as ScoringMode
    const manual = (event.team_manual_scores || null) as TeamManualScores | null
    const rows = scoresByEvent.get(event.id) || []

    const summaries = computeTeamSummaryScores(rows, scoringMode, manual)
    if (summaries.length === 0) continue

    // 只统计「恰好红绿两队」的对决场次（四队等活动不计入）
    const allAreRedGreen = summaries.every((s) => normalizeTeamKey(s.team_name) != null)
    if (!allAreRedGreen || summaries.length !== 2) continue

    const rg = pickRedGreenScores(summaries)
    if (!rg) continue

    const higherBetter = isHigherTeamScoreBetter(scoringMode)
    let winner: AnnualTeamMatchResult['winner'] = '平局'
    if (rg.red !== rg.green) {
      const redWinsMatch = higherBetter ? rg.red > rg.green : rg.red < rg.green
      winner = redWinsMatch ? '红队' : '绿队'
    }

    matches.push({
      eventId: event.id,
      eventTitle: (event.title || '未命名活动').trim() || '未命名活动',
      startTime: event.start_time || '',
      scoringMode,
      redScore: rg.red,
      greenScore: rg.green,
      winner,
    })
  }

  matches.sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime))

  return {
    year,
    asOfDate: vancouverDateLabel(),
    redWins: matches.filter((m) => m.winner === '红队').length,
    greenWins: matches.filter((m) => m.winner === '绿队').length,
    ties: matches.filter((m) => m.winner === '平局').length,
    matches,
  }
}
