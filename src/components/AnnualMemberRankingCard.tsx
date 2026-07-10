import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Trophy, X, ChevronRight } from 'lucide-react'
import {
  ANNUAL_RANKING_MIN_EVENTS,
  fetchAnnualMemberRanking,
  type AnnualMemberRankingRow,
  type AnnualMemberRankingResult,
} from '../utils/annualMemberRanking'

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

function MemberAvatar({ row }: { row: AnnualMemberRankingRow }) {
  if (row.avatarUrl) {
    return (
      <img
        src={row.avatarUrl}
        alt={row.fullName}
        className="h-11 w-11 shrink-0 rounded-full object-cover border border-gray-100 shadow-sm"
        style={{
          objectPosition: `${row.avatarPositionX}% ${row.avatarPositionY}%`,
        }}
      />
    )
  }
  return <DefaultGolferAvatar />
}

function RankingRow({
  row,
  highlight,
  showDivider,
}: {
  row: AnnualMemberRankingRow
  highlight?: boolean
  showDivider?: boolean
}) {
  return (
    <div>
      {showDivider && <div className="mx-1 border-t border-gray-100" />}
      <div
        className={`flex items-center gap-3 px-3 py-3.5 ${
          highlight ? 'rounded-2xl bg-[#FDF2F7] ring-1 ring-[#F15B98]/25' : ''
        }`}
      >
        <RankMedal rank={row.rank} />
        <MemberAvatar row={row} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold leading-tight text-gray-900">
            {row.fullName}
          </div>
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
      </div>
    </div>
  )
}

export default function AnnualMemberRankingCard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnnualMemberRankingResult | null>(null)
  const [showFull, setShowFull] = useState(false)

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
    if (!showFull) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [showFull])

  const topRows = result?.rows.slice(0, 5) || []
  const year = result?.year ?? new Date().getFullYear()
  const asOf = result?.asOfDate || ''

  return (
    <>
      <div
        className="relative overflow-hidden rounded-3xl border border-gray-200 bg-[#FAFAFA] p-5 sm:p-6"
        style={{
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex min-w-0 items-center text-lg font-bold text-gray-900 sm:text-xl">
              <span className="mr-3 inline-block h-6 w-1.5 shrink-0 rounded-full bg-[#F15B98]" />
              本年度会员榜
            </h3>
            {result && result.rows.length > 0 && (
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
          <p className="mt-1.5 pl-[18px] text-xs text-gray-400 sm:text-sm">
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
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showFull &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
            <button
              type="button"
              className="absolute inset-0 bg-black/45"
              aria-label="关闭"
              onClick={() => setShowFull(false)}
            />
            <div className="relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#FAFAFA] shadow-2xl sm:max-w-lg sm:rounded-3xl">
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
                  />
                ))}
              </div>
              <div className="border-t border-gray-100 bg-white px-5 py-3 text-center text-[11px] text-gray-400">
                共 {result?.rows.length || 0} 人上榜 · 净杆越低越好
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
