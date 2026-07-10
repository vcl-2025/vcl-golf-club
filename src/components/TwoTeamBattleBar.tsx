import React from 'react'
import type { ScoringMode } from '../utils/teamEventScores'
import { isHigherTeamScoreBetter } from '../utils/teamEventScores'

export interface BattleTeamSide {
  name: string
  score: number
  color: string
}

function formatScoreNumber(score: number, scoringMode: ScoringMode): string {
  if (scoringMode === 'ryder_cup' && score % 1 !== 0) {
    return score.toFixed(1)
  }
  return `${Math.round(score)}`
}

function scoreUnit(scoringMode: ScoringMode): string {
  if (scoringMode === 'total_strokes') return '杆'
  return '分'
}

/** 两队固定左右：优先红左绿右，否则按名称 */
export function orderTwoTeams<T extends { team_name: string }>(teams: T[]): [T, T] | null {
  if (teams.length !== 2) return null
  const [a, b] = teams
  const score = (name: string) => {
    if (/红/.test(name)) return 0
    if (/绿/.test(name)) return 2
    return 1
  }
  return score(a.team_name) <= score(b.team_name) ? [a, b] : [b, a]
}

export function resolveTeamBattleColor(
  teamName: string,
  teamColors?: Record<string, string> | null,
  fallbackIndex = 0
): string {
  // 样板固定红/绿；有配置时仍优先配置，但红绿名用样板色更贴近设计稿
  if (/红/.test(teamName)) return teamColors?.[teamName] || '#E53935'
  if (/绿/.test(teamName)) return teamColors?.[teamName] || '#43A047'
  if (teamColors?.[teamName]) return teamColors[teamName]
  return fallbackIndex === 0 ? '#E53935' : '#43A047'
}

/** 样板同款月桂 */
function Laurel({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={`shrink-0 text-[#F15B98] ${flip ? '-scale-x-100' : ''}`}
      aria-hidden
    >
      <path
        d="M12 20c0-3.5 1.2-6.2 3.2-8.2 1.6-1.6 3.5-2.5 5.3-2.8-1.2 2.8-1.3 5.4-.2 7.6-2.2.2-4.4 1.2-5.8 3.4H12z"
        fill="currentColor"
        opacity="0.95"
      />
      <path
        d="M12 20c0-3.2-.9-5.7-2.5-7.6C8.2 10.7 6.6 9.7 4.8 9.2c.7 2.6.4 5.1-.8 7.2 2 .5 3.9 1.7 5.1 3.6H12z"
        fill="currentColor"
        opacity="0.85"
      />
      <path
        d="M12 11.5c0-2.4.7-4.4 2-5.9 1-1.2 2.3-1.9 3.7-2.2-.7 2-.6 3.8.2 5.4-1.6.2-3.1.9-4.2 2.7H12z"
        fill="currentColor"
        opacity="0.75"
      />
      <path
        d="M12 11.5c0-2.2-.6-4-.1-5.5C10.7 4.7 9.5 4 8.1 3.6c.4 1.9.2 3.6-.6 5.2 1.5.4 2.8 1.3 3.7 2.7H12z"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  )
}

/**
 * 两队对决条：严格对齐设计样板
 * 斜切色块 + 白色冲击线 + 高尔夫球 VS + 月桂领先文案 + 粉边外框
 */
export default function TwoTeamBattleBar({
  left,
  right,
  scoringMode = 'stableford',
  showLead = true,
  unitLabel,
  className = '',
}: {
  left: BattleTeamSide
  right: BattleTeamSide
  scoringMode?: ScoringMode
  showLead?: boolean
  /** 覆盖默认单位（如胜场用「场」） */
  unitLabel?: string
  className?: string
}) {
  const higherBetter = isHigherTeamScoreBetter(scoringMode)
  const tied = left.score === right.score
  const leftLeads = higherBetter ? left.score > right.score : left.score < right.score
  const diff = Math.abs(left.score - right.score)
  const unit = unitLabel ?? scoreUnit(scoringMode)
  const diffLabel =
    !unitLabel && scoringMode === 'ryder_cup' && diff % 1 !== 0
      ? diff.toFixed(1)
      : `${Math.round(diff)}`

  let leadText = '双方战平'
  if (!tied) {
    const leader = leftLeads ? left.name : right.name
    leadText = `${leader}领先 ${diffLabel}${unit}`
  }

  return (
    <div
      className={`rounded-2xl border border-[#F15B98]/35 bg-[#FAFAFA] px-3 pb-3 pt-3.5 sm:px-4 sm:pb-3.5 sm:pt-4 ${className}`}
    >
      {/* 对决主条 */}
      <div
        className="relative mx-auto h-[72px] w-full overflow-hidden rounded-[999px] sm:h-[84px]"
        style={{
          boxShadow:
            '0 8px 20px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)',
        }}
      >
        {/* 底层：左右色块 + 斜切 */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(118deg, ${left.color} 0%, ${left.color} 46%, ${right.color} 54%, ${right.color} 100%)`,
          }}
        />

        {/* 更锋利的斜切遮罩层，保证分界清晰 */}
        <div
          className="absolute inset-0"
          style={{
            background: left.color,
            clipPath: 'polygon(0 0, 54% 0, 42% 100%, 0 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: right.color,
            clipPath: 'polygon(54% 0, 100% 0, 100% 100%, 42% 100%)',
          }}
        />

        {/* 白色冲击斜线（样板关键：粗斜切笔触） */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 400 84"
          preserveAspectRatio="none"
          aria-hidden
        >
          <g fill="#ffffff">
            {/* 主斜切白带 */}
            <polygon points="205,0 232,0 168,84 141,84" opacity="0.95" />
            {/* 旁侧细笔触 */}
            <polygon points="238,0 252,0 188,84 174,84" opacity="0.88" />
            <polygon points="258,4 268,4 206,80 196,80" opacity="0.7" />
            <polygon points="186,0 196,0 132,84 122,84" opacity="0.8" />
            <polygon points="172,6 180,6 118,78 110,78" opacity="0.55" />
          </g>
        </svg>

        {/* 左队文案 */}
        <div className="absolute inset-y-0 left-0 z-[1] flex w-[46%] flex-col items-center justify-center text-white">
          <div className="text-[13px] font-semibold leading-none tracking-wide sm:text-[15px]">
            {left.name}
          </div>
          <div className="mt-1 text-[34px] font-black italic leading-none tracking-tight tabular-nums sm:text-[40px]">
            {formatScoreNumber(left.score, scoringMode)}
          </div>
        </div>

        {/* 右队文案 */}
        <div className="absolute inset-y-0 right-0 z-[1] flex w-[46%] flex-col items-center justify-center text-white">
          <div className="text-[13px] font-semibold leading-none tracking-wide sm:text-[15px]">
            {right.name}
          </div>
          <div className="mt-1 text-[34px] font-black italic leading-none tracking-tight tabular-nums sm:text-[40px]">
            {formatScoreNumber(right.score, scoringMode)}
          </div>
        </div>

        {/* 高尔夫球 VS */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div
            className="relative flex h-[46px] w-[46px] items-center justify-center rounded-full sm:h-[52px] sm:w-[52px]"
            style={{
              background:
                'radial-gradient(circle at 35% 30%, #ffffff 0%, #f7f7f7 45%, #e8e8e8 100%)',
              boxShadow:
                '0 3px 10px rgba(0,0,0,0.22), inset 0 1px 2px rgba(255,255,255,0.9), inset 0 -1px 2px rgba(0,0,0,0.08)',
            }}
          >
            {/* 球窝纹理 */}
            <svg
              className="absolute inset-0 h-full w-full opacity-35"
              viewBox="0 0 52 52"
              aria-hidden
            >
              {Array.from({ length: 18 }).map((_, i) => {
                const angle = (i / 18) * Math.PI * 2
                const r = 14 + (i % 3) * 2.2
                const cx = 26 + Math.cos(angle) * r
                const cy = 26 + Math.sin(angle) * r
                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r="1.35"
                    fill="#9ca3af"
                  />
                )
              })}
            </svg>
            <span className="relative text-[13px] font-black italic tracking-tight text-[#F15B98] sm:text-[15px]">
              VS
            </span>
          </div>
        </div>
      </div>

      {/* 领先文案：月桂 + 端点横线 */}
      {showLead && (
        <div className="mt-3 flex items-center justify-center gap-2 px-1">
          <div className="flex min-w-0 flex-1 items-center">
            <span className="h-[2px] w-[2px] shrink-0 rounded-full bg-[#F15B98]" />
            <span className="h-px flex-1 bg-[#F15B98]/55" />
          </div>
          <Laurel />
          <span className="shrink-0 px-0.5 text-[13px] font-semibold text-[#F15B98] sm:text-sm">
            {leadText}
          </span>
          <Laurel flip />
          <div className="flex min-w-0 flex-1 items-center">
            <span className="h-px flex-1 bg-[#F15B98]/55" />
            <span className="h-[2px] w-[2px] shrink-0 rounded-full bg-[#F15B98]" />
          </div>
        </div>
      )}
    </div>
  )
}
