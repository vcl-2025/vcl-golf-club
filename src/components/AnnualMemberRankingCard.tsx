import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Trophy, X, ChevronRight, ChevronLeft, MapPin } from 'lucide-react'
import { formatEventDateInTimezone } from '../utils/eventDateTime'
import {
  ANNUAL_RANKING_MIN_EVENTS,
  fetchAnnualMemberRanking,
  fetchMemberYearScores,
  type AnnualMemberRankingRow,
  type AnnualMemberRankingResult,
  type MemberYearScoreEvent,
} from '../utils/annualMemberRanking'
import {
  fetchAnnualTeamStanding,
  type AnnualTeamStandingResult,
} from '../utils/annualTeamStanding'
import { formatTeamScoreDisplay } from '../utils/teamEventScores'

/** 金银铜奖牌：直接使用设计样板图，不用 SVG 重画 */
function RankMedal({ rank }: { rank: number }) {
  if (rank === 1 || rank === 2 || rank === 3) {
    return (
      <img
        src={`/rank-medal-${rank}.png`}
        alt={`第${rank}名`}
        className="h-10 w-10 shrink-0 object-contain"
      />
    )
  }
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-500">
      {rank}
    </span>
  )
}

/** 无头像时用设计样板同款粉色女球手剪影 */
function DefaultGolferAvatar() {
  return (
    <img
      src="/default-golfer-avatar.png"
      alt=""
      className="h-11 w-11 shrink-0 rounded-full object-cover border border-[#F15B98]/25 shadow-sm bg-[#FFF7FA]"
    />
  )
}

function MemberAvatar({
  row,
  size = 'md',
}: {
  row: Pick<
    AnnualMemberRankingRow,
    'fullName' | 'avatarUrl' | 'avatarPositionX' | 'avatarPositionY'
  >
  size?: 'md' | 'lg'
}) {
  const sizeClass = size === 'lg' ? 'h-14 w-14' : 'h-11 w-11'
  if (row.avatarUrl) {
    return (
      <img
        src={row.avatarUrl}
        alt={row.fullName}
        className={`${sizeClass} shrink-0 rounded-full object-cover border border-gray-100 shadow-sm`}
        style={{
          objectPosition: `${row.avatarPositionX}% ${row.avatarPositionY}%`,
        }}
      />
    )
  }
  if (size === 'lg') {
    return (
      <img
        src="/default-golfer-avatar.png"
        alt=""
        className="h-14 w-14 shrink-0 rounded-full object-cover border border-[#F15B98]/25 shadow-sm bg-[#FFF7FA]"
      />
    )
  }
  return <DefaultGolferAvatar />
}

function holeTone(strokes: number, par: number | null | undefined) {
  if (!strokes || strokes <= 0) return 'bg-white text-gray-300 border-gray-100'
  if (!par || par <= 0) return 'bg-white text-gray-800 border-gray-200'
  const diff = strokes - par
  if (diff <= -2) return 'bg-emerald-600 text-white border-emerald-600'
  if (diff === -1) return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (diff === 0) return 'bg-white text-gray-800 border-gray-200'
  if (diff === 1) return 'bg-amber-50 text-amber-800 border-amber-200'
  return 'bg-rose-50 text-rose-700 border-rose-200'
}

function HoleScoresGrid({
  holeScores,
  par,
}: {
  holeScores: number[]
  par: number[] | null
}) {
  const front = holeScores.slice(0, 9)
  const back = holeScores.slice(9, 18)
  const frontSum = front.reduce((s, n) => s + (Number(n) || 0), 0)
  const backSum = back.reduce((s, n) => s + (Number(n) || 0), 0)

  const renderNine = (scores: number[], offset: number) => (
    <>
      <div className="grid grid-cols-9 gap-1.5 mb-1.5">
        {scores.map((_, i) => (
          <div key={offset + i} className="text-center text-[10px] font-medium text-gray-400">
            {offset + i + 1}
          </div>
        ))}
      </div>
      {par && par.length >= offset + 9 && (
        <div className="mb-1.5 grid grid-cols-9 gap-1.5">
          {scores.map((_, i) => (
            <div key={`par-${offset + i}`} className="text-center text-[10px] text-gray-300">
              {par[offset + i] || '–'}
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-9 gap-1.5">
        {scores.map((strokes, i) => {
          const p = par?.[offset + i]
          return (
            <div
              key={`s-${offset + i}`}
              className={`flex h-9 items-center justify-center rounded-lg border text-sm font-semibold tabular-nums ${holeTone(
                Number(strokes) || 0,
                p
              )}`}
            >
              {strokes > 0 ? strokes : '–'}
            </div>
          )
        })}
      </div>
    </>
  )

  return (
    <div className="space-y-4 rounded-2xl bg-gray-50 p-3.5">
      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
          <span className="font-medium">前九</span>
          <span className="tabular-nums">{frontSum || '–'}</span>
        </div>
        {renderNine(front.length ? front : Array(9).fill(0), 0)}
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
          <span className="font-medium">后九</span>
          <span className="tabular-nums">{backSum || '–'}</span>
        </div>
        {renderNine(back.length ? back : Array(9).fill(0), 9)}
      </div>
      <div className="border-t border-gray-200 pt-2 text-center text-sm text-gray-600">
        逐洞合计{' '}
        <span className="font-semibold tabular-nums text-gray-900">{frontSum + backSum}</span>
      </div>
    </div>
  )
}

function RankingRow({
  row,
  highlight,
  showDivider,
  onClick,
}: {
  row: AnnualMemberRankingRow
  highlight?: boolean
  showDivider?: boolean
  onClick?: () => void
}) {
  return (
    <div>
      {showDivider && <div className="mx-1 border-t border-gray-100" />}
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-3 px-3 py-3.5 text-left transition-colors ${
          highlight
            ? 'rounded-2xl border border-[#F15B98]/35 bg-[#FDF2F7]'
            : 'hover:bg-white/70'
        } ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''}`}
      >
        <RankMedal rank={row.rank} />
        <MemberAvatar row={row} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold leading-tight text-gray-900">
            {row.fullName}
          </div>
          <div className="mt-0.5 text-[11px] text-gray-400">查看参赛场次 ›</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-2xl font-bold tabular-nums leading-none text-[#F15B98]">
              {row.avgNet.toFixed(1)}
            </span>
            <span className="text-xs font-medium text-[#F15B98]">均净</span>
          </div>
          <div className="mt-1 text-xs text-gray-400">
            {row.eventCount} 场 · 最佳 {row.bestNet}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
      </button>
    </div>
  )
}

function SheetShell({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#FAFAFA] shadow-2xl sm:max-w-lg sm:rounded-3xl">
        {children}
      </div>
    </div>
  )
}

export default function AnnualMemberRankingCard() {
  const [boardTab, setBoardTab] = useState<'member' | 'team'>('member')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnnualMemberRankingResult | null>(null)
  const [teamLoading, setTeamLoading] = useState(true)
  const [teamError, setTeamError] = useState<string | null>(null)
  const [teamStanding, setTeamStanding] = useState<AnnualTeamStandingResult | null>(null)
  const [showFull, setShowFull] = useState(false)
  const [selectedMember, setSelectedMember] = useState<AnnualMemberRankingRow | null>(null)
  const [memberScores, setMemberScores] = useState<MemberYearScoreEvent[]>([])
  const [memberLoading, setMemberLoading] = useState(false)
  const [memberError, setMemberError] = useState<string | null>(null)
  const [selectedScore, setSelectedScore] = useState<MemberYearScoreEvent | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchAnnualMemberRanking()
        if (!cancelled) setResult(data)
      } catch (err) {
        console.error(err)
        if (!cancelled) setError('暂时无法加载会员榜')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setTeamLoading(true)
      setTeamError(null)
      try {
        const data = await fetchAnnualTeamStanding()
        if (!cancelled) setTeamStanding(data)
      } catch (err) {
        console.error(err)
        if (!cancelled) setTeamError('暂时无法加载团体成绩榜')
      } finally {
        if (!cancelled) setTeamLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedMember) {
      setMemberScores([])
      setMemberError(null)
      setSelectedScore(null)
      return
    }
    let cancelled = false
    ;(async () => {
      setMemberLoading(true)
      setMemberError(null)
      setSelectedScore(null)
      try {
        const scores = await fetchMemberYearScores({
          userId: selectedMember.userId,
          year: result?.year,
        })
        if (!cancelled) setMemberScores(scores)
      } catch (err) {
        console.error(err)
        if (!cancelled) setMemberError('暂时无法加载参赛记录')
      } finally {
        if (!cancelled) setMemberLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedMember, result?.year])

  useEffect(() => {
    const open = showFull || !!selectedMember || !!selectedScore
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [showFull, selectedMember, selectedScore])

  const topRows = result?.rows.slice(0, 5) || []
  const year = result?.year ?? teamStanding?.year ?? new Date().getFullYear()
  const asOf = result?.asOfDate || teamStanding?.asOfDate || ''

  const openMember = (row: AnnualMemberRankingRow) => {
    setSelectedMember(row)
  }

  const closeMember = () => {
    setSelectedScore(null)
    setSelectedMember(null)
  }

  return (
    <>
      <div
        className="relative rounded-3xl border border-gray-200 bg-[#FAFAFA] p-5 sm:p-6"
        style={{
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex min-w-0 items-center text-lg font-bold text-gray-900 sm:text-xl">
              <span className="mr-3 inline-block h-6 w-1.5 shrink-0 rounded-full bg-[#F15B98]" />
              {boardTab === 'member' ? '本年度会员榜' : '本年度团体成绩榜'}
            </h3>
            {boardTab === 'member' && result && result.rows.length > 0 && (
              <button
                type="button"
                onClick={() => setShowFull(true)}
                className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-[#F15B98] transition-colors hover:text-[#E0487A]"
              >
                完整榜单
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* 会员榜 / 团体成绩榜 切换 */}
          <div className="mt-3 flex rounded-xl bg-gray-100/90 p-1">
            <button
              type="button"
              onClick={() => setBoardTab('member')}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                boardTab === 'member'
                  ? 'bg-white text-[#F15B98] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              会员榜
            </button>
            <button
              type="button"
              onClick={() => setBoardTab('team')}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                boardTab === 'team'
                  ? 'bg-white text-[#F15B98] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              团体成绩榜
            </button>
          </div>

          {boardTab === 'member' ? (
            <>
              <p className="mt-3 pl-[18px] text-xs text-gray-400 sm:text-sm">
                按平均净杆 · 至少参赛 {ANNUAL_RANKING_MIN_EVENTS} 场
                {asOf ? ` · 统计至 ${asOf}` : ''}
              </p>

              {loading ? (
                <div className="py-8 text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-[#F15B98] border-t-transparent" />
                  <p className="mt-3 text-sm text-gray-500">加载中...</p>
                </div>
              ) : error ? (
                <div className="py-8 text-center text-sm text-gray-500">{error}</div>
              ) : topRows.length === 0 ? (
                <div className="py-8 text-center sm:py-10">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F15B98]/10">
                    <Trophy className="h-8 w-8 text-[#F15B98]/60" />
                  </div>
                  <p className="text-sm font-medium text-gray-600 sm:text-base">
                    {year} 年暂无上榜会员
                  </p>
                  <p className="mt-2 text-xs text-gray-400 sm:text-sm">
                    需至少有 {ANNUAL_RANKING_MIN_EVENTS} 场有效净杆成绩
                  </p>
                </div>
              ) : (
                <div className="mt-4">
                  {topRows.map((row, index) => (
                    <RankingRow
                      key={row.userId}
                      row={row}
                      highlight={row.rank === 1}
                      showDivider={index > 0}
                      onClick={() => openMember(row)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <p className="mt-3 text-xs text-gray-400 sm:text-sm">
                红绿两队对决 · 各赢几场
                {asOf ? ` · 统计至 ${asOf}` : ''}
              </p>

              {teamLoading ? (
                <div className="py-8 text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-[#F15B98] border-t-transparent" />
                  <p className="mt-3 text-sm text-gray-500">加载中...</p>
                </div>
              ) : teamError ? (
                <div className="py-8 text-center text-sm text-gray-500">{teamError}</div>
              ) : !teamStanding || teamStanding.matches.length === 0 ? (
                <div className="py-8 text-center sm:py-10">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F15B98]/10">
                    <Trophy className="h-8 w-8 text-[#F15B98]/60" />
                  </div>
                  <p className="text-sm font-medium text-gray-600 sm:text-base">
                    {year} 年暂无红绿对决成绩
                  </p>
                  <p className="mt-2 text-xs text-gray-400 sm:text-sm">
                    仅统计恰好红、绿两队的团体赛场次
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {/* 赛季胜场总览：刻意不用单场 VS 对决条，避免误会成单场比分 */}
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <div className="mb-1.5 text-center">
                      <span className="rounded-full bg-[#F15B98]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#F15B98]">
                        赛季胜场
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-[2.25rem] font-black tabular-nums leading-none text-[#E53935]">
                        {teamStanding.redWins}
                      </span>
                      <span className="text-2xl font-bold text-gray-300">:</span>
                      <span className="text-[2.25rem] font-black tabular-nums leading-none text-[#43A047]">
                        {teamStanding.greenWins}
                      </span>
                    </div>
                    <p className="mt-2 text-center text-xs text-gray-400">
                      {teamStanding.redWins === teamStanding.greenWins
                        ? '目前双方胜场持平'
                        : teamStanding.redWins > teamStanding.greenWins
                          ? `红队领先 ${teamStanding.redWins - teamStanding.greenWins} 场`
                          : `绿队领先 ${teamStanding.greenWins - teamStanding.redWins} 场`}
                      {teamStanding.ties > 0 ? ` · 平局 ${teamStanding.ties} 场` : ''}
                      · 共 {teamStanding.matches.length} 场
                    </p>
                  </div>

                  <div className="px-1 text-xs font-medium text-gray-500">各场对决明细</div>
                  <div className="space-y-2">
                    {teamStanding.matches.map((match) => (
                      <div
                        key={match.eventId}
                        className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
                      >
                        <div className="truncate text-sm font-semibold text-gray-900">
                          {match.eventTitle}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          {match.startTime
                            ? formatEventDateInTimezone(match.startTime)
                            : '日期待定'}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                          <span className="font-medium text-[#E53935]">
                            红队{' '}
                            {formatTeamScoreDisplay(match.redScore, match.scoringMode)}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              match.winner === '红队'
                                ? 'bg-red-50 text-[#E53935]'
                                : match.winner === '绿队'
                                  ? 'bg-green-50 text-[#43A047]'
                                  : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {match.winner === '平局' ? '平局' : `${match.winner}胜`}
                          </span>
                          <span className="font-medium text-[#43A047]">
                            绿队{' '}
                            {formatTeamScoreDisplay(match.greenScore, match.scoringMode)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showFull &&
        !selectedMember &&
        createPortal(
          <SheetShell onClose={() => setShowFull(false)}>
            <div className="flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
              <div>
                <h4 className="flex items-center text-lg font-bold text-gray-900">
                  <span className="mr-3 inline-block h-5 w-1.5 rounded-full bg-[#F15B98]" />
                  {year} 年会员榜
                </h4>
                <p className="mt-1 pl-[18px] text-xs text-gray-400">
                  按平均净杆 · 至少参赛 {ANNUAL_RANKING_MIN_EVENTS} 场
                  {asOf ? ` · 统计至 ${asOf}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFull(false)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                aria-label="关闭榜单"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {(result?.rows || []).map((row, index) => (
                <RankingRow
                  key={row.userId}
                  row={row}
                  highlight={row.rank === 1}
                  showDivider={index > 0}
                  onClick={() => openMember(row)}
                />
              ))}
            </div>
            <div className="border-t border-gray-100 bg-white px-5 py-3 text-center text-[11px] text-gray-400">
              共 {result?.rows.length || 0} 人上榜 · 净杆越低越好 · 点击会员查看场次
            </div>
          </SheetShell>,
          document.body
        )}

      {selectedMember &&
        !selectedScore &&
        createPortal(
          <SheetShell onClose={closeMember}>
            <div className="flex items-center gap-2 border-b border-gray-100 bg-white px-4 py-4">
              <button
                type="button"
                onClick={closeMember}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                aria-label="返回"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <MemberAvatar row={selectedMember} size="lg" />
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-lg font-bold text-gray-900">
                  {selectedMember.fullName}
                </h4>
                <p className="mt-0.5 text-xs text-gray-400">
                  第 {selectedMember.rank} 名 · 均净 {selectedMember.avgNet.toFixed(1)} ·{' '}
                  {selectedMember.eventCount} 场
                </p>
              </div>
              <button
                type="button"
                onClick={closeMember}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <p className="mb-3 px-1 text-xs text-gray-400">
                {year} 年参赛场次 · 点击查看单场细节
              </p>
              {memberLoading ? (
                <div className="py-10 text-center">
                  <div className="mx-auto h-9 w-9 animate-spin rounded-full border-[3px] border-[#F15B98] border-t-transparent" />
                  <p className="mt-3 text-sm text-gray-500">加载中...</p>
                </div>
              ) : memberError ? (
                <div className="py-10 text-center text-sm text-gray-500">{memberError}</div>
              ) : memberScores.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-500">暂无参赛记录</div>
              ) : (
                <div className="space-y-2">
                  {memberScores.map((score) => (
                    <button
                      key={score.scoreId}
                      type="button"
                      onClick={() => setSelectedScore(score)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3.5 text-left shadow-sm transition-colors hover:border-[#F15B98]/30 active:scale-[0.99]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-semibold text-gray-900">
                          {score.eventTitle}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
                          <span>
                            {score.startTime
                              ? formatEventDateInTimezone(score.startTime)
                              : '日期待定'}
                          </span>
                          {score.eventType && <span>· {score.eventType}</span>}
                          {score.location && (
                            <span className="inline-flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" />
                              {score.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-lg font-bold tabular-nums text-[#F15B98]">
                          {score.netStrokes ?? '–'}
                          <span className="ml-0.5 text-xs font-medium">净</span>
                        </div>
                        <div className="mt-0.5 text-xs text-gray-400">
                          总杆 {score.totalStrokes}
                          {score.rank != null ? ` · 第${score.rank}名` : ''}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </SheetShell>,
          document.body
        )}

      {selectedMember &&
        selectedScore &&
        createPortal(
          <SheetShell onClose={() => setSelectedScore(null)}>
            <div className="flex items-center gap-2 border-b border-gray-100 bg-white px-4 py-4">
              <button
                type="button"
                onClick={() => setSelectedScore(null)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                aria-label="返回场次列表"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-lg font-bold text-gray-900">
                  {selectedScore.eventTitle}
                </h4>
                <p className="mt-0.5 truncate text-xs text-gray-400">
                  {selectedMember.fullName}
                  {selectedScore.startTime
                    ? ` · ${formatEventDateInTimezone(selectedScore.startTime)}`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScore(null)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-2xl bg-white px-3 py-3 text-center shadow-sm border border-gray-100">
                  <div className="text-[11px] text-gray-400">总杆</div>
                  <div className="mt-1 text-xl font-bold tabular-nums text-gray-900">
                    {selectedScore.totalStrokes}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#FDF2F7] px-3 py-3 text-center border border-[#F15B98]/25">
                  <div className="text-[11px] text-[#F15B98]/80">净杆</div>
                  <div className="mt-1 text-xl font-bold tabular-nums text-[#F15B98]">
                    {selectedScore.netStrokes ?? '–'}
                  </div>
                </div>
                <div className="rounded-2xl bg-white px-3 py-3 text-center shadow-sm border border-gray-100">
                  <div className="text-[11px] text-gray-400">差点</div>
                  <div className="mt-1 text-xl font-bold tabular-nums text-gray-900">
                    {selectedScore.handicap}
                  </div>
                </div>
                <div className="rounded-2xl bg-white px-3 py-3 text-center shadow-sm border border-gray-100">
                  <div className="text-[11px] text-gray-400">名次</div>
                  <div className="mt-1 text-xl font-bold tabular-nums text-gray-900">
                    {selectedScore.rank != null ? selectedScore.rank : '–'}
                  </div>
                </div>
              </div>

              <div className="mb-4 space-y-1.5 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-600">
                {selectedScore.eventType && (
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">类型</span>
                    <span className="font-medium text-gray-800">{selectedScore.eventType}</span>
                  </div>
                )}
                {selectedScore.location && (
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">地点</span>
                    <span className="text-right font-medium text-gray-800">
                      {selectedScore.location}
                    </span>
                  </div>
                )}
                {selectedScore.groupNumber != null && (
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">分组</span>
                    <span className="font-medium text-gray-800">
                      第 {selectedScore.groupNumber} 组
                    </span>
                  </div>
                )}
                {selectedScore.teamName && (
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">队伍</span>
                    <span className="font-medium text-gray-800">{selectedScore.teamName}</span>
                  </div>
                )}
              </div>

              {selectedScore.holeScores && selectedScore.holeScores.some((n) => n > 0) ? (
                <div>
                  <div className="mb-2 px-1 text-sm font-semibold text-gray-800">逐洞成绩</div>
                  {selectedScore.par && (
                    <p className="mb-2 px-1 text-[11px] text-gray-400">
                      第二行小字为标准杆 · 颜色表示相对 PAR
                    </p>
                  )}
                  <HoleScoresGrid
                    holeScores={selectedScore.holeScores}
                    par={selectedScore.par}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400">
                  本场暂无逐洞成绩明细
                </div>
              )}

              {selectedScore.notes && (
                <div className="mt-4 rounded-2xl border border-gray-100 bg-white px-4 py-3">
                  <div className="text-xs text-gray-400">备注</div>
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedScore.notes}
                  </p>
                </div>
              )}
            </div>
          </SheetShell>,
          document.body
        )}
    </>
  )
}
