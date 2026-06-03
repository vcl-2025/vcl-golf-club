import React, { useEffect, useRef, useMemo } from 'react'
import * as echarts from 'echarts'
import { X, TrendingUp } from 'lucide-react'
import { formatEventDateInTimezone } from '../utils/eventDateTime'

const EVENT_DISPLAY_TIMEZONE = 'America/Vancouver'

export interface YearScoreTrendScore {
  user_id?: string
  is_guest?: boolean
  total_strokes: number
  rank: number | null
  events: {
    title: string
    start_time: string
  }
}

interface YearScoreTrendPoint {
  eventTitle: string
  startTime: string
  dateLabel: string
  totalStrokes: number
  rank: number | null
}

function formatShortEventDate(dateString: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: EVENT_DISPLAY_TIMEZONE,
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(dateString))
}

export function buildYearScoreTrendPoints(
  scores: YearScoreTrendScore[],
  userId: string,
  year = new Date().getFullYear()
): YearScoreTrendPoint[] {
  return scores
    .filter(
      (s) =>
        !s.is_guest &&
        s.user_id === userId &&
        new Date(s.events.start_time).getFullYear() === year
    )
    .sort(
      (a, b) =>
        new Date(a.events.start_time).getTime() -
        new Date(b.events.start_time).getTime()
    )
    .map((s) => ({
      eventTitle: s.events.title,
      startTime: s.events.start_time,
      dateLabel: formatShortEventDate(s.events.start_time),
      totalStrokes: s.total_strokes,
      rank: s.rank,
    }))
}

interface YearScoreTrendModalProps {
  isOpen: boolean
  onClose: () => void
  scores: YearScoreTrendScore[]
  userId: string
}

export default function YearScoreTrendModal({
  isOpen,
  onClose,
  scores,
  userId,
}: YearScoreTrendModalProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const currentYear = new Date().getFullYear()

  const trendPoints = useMemo(
    () => buildYearScoreTrendPoints(scores, userId, currentYear),
    [scores, userId, currentYear]
  )

  useEffect(() => {
    if (!isOpen) return

    const handleResize = () => chartInstance.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !chartRef.current) return

    if (trendPoints.length === 0) {
      chartInstance.current?.dispose()
      chartInstance.current = null
      return
    }

    const chart = chartInstance.current ?? echarts.init(chartRef.current)
    chartInstance.current = chart

    const xLabels = trendPoints.map((p) => p.dateLabel)

    chart.setOption({
      title: {
        show: false,
      },
      grid: {
        left: 48,
        right: 16,
        top: 24,
        bottom: 56,
      },
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter(params: unknown) {
          const list = Array.isArray(params) ? params : [params]
          const idx = (list[0] as { dataIndex?: number })?.dataIndex ?? 0
          const point = trendPoints[idx]
          if (!point) return ''
          const rankText =
            point.rank != null ? `名次：第 ${point.rank} 名` : '名次：—'
          return [
            `<strong>${point.eventTitle}</strong>`,
            formatEventDateInTimezone(point.startTime),
            `总杆：${point.totalStrokes} 杆`,
            rankText,
          ].join('<br/>')
        },
      },
      xAxis: {
        type: 'category',
        data: xLabels,
        axisLabel: {
          rotate: trendPoints.length > 4 ? 35 : 0,
          fontSize: 11,
        },
      },
      yAxis: {
        type: 'value',
        name: '总杆',
        nameTextStyle: { fontSize: 11 },
        min: (value: { min: number }) =>
          Math.max(0, Math.floor(value.min - 5)),
      },
      series: [
        {
          name: '总杆',
          type: 'line',
          data: trendPoints.map((p) => p.totalStrokes),
          smooth: trendPoints.length >= 3,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: '#F15B98', width: 2 },
          itemStyle: { color: '#F15B98' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(241, 91, 152, 0.25)' },
              { offset: 1, color: 'rgba(241, 91, 152, 0.02)' },
            ]),
          },
        },
      ],
    })

    chart.resize()

    return () => {
      // keep instance while modal open; dispose when closed
    }
  }, [isOpen, trendPoints])

  useEffect(() => {
    if (!isOpen) {
      chartInstance.current?.dispose()
      chartInstance.current = null
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose()
      chartInstance.current = null
    }
  }, [])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-[80] p-0 sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="year-score-trend-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="w-5 h-5 text-[#F15B98] shrink-0" />
            <div className="min-w-0">
              <h3
                id="year-score-trend-title"
                className="text-lg font-bold text-gray-900"
              >
                {currentYear} 年比赛成绩走势
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">按活动日期，纵轴为总杆</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 shrink-0"
            aria-label="关闭"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {trendPoints.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              今年暂无您的比赛成绩记录
            </div>
          ) : (
            <>
              <div
                ref={chartRef}
                className="w-full h-[280px] sm:h-[320px]"
                aria-hidden={false}
              />
              <p className="text-xs text-gray-400 text-center mt-2">
                共 {trendPoints.length} 场 · 悬停查看活动详情
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
