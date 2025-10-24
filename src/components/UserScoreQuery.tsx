import React, { useState, useEffect } from 'react'
import { 
  Trophy, Medal, Award, TrendingUp, Star, Clock,
  ChevronDown, ChevronRight
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import UnifiedSearch from './UnifiedSearch'

interface ScoreData {
  id: string
  event_id: string
  user_id: string
  total_strokes: number
  net_strokes: number | null
  handicap: number
  rank: number | null
  notes: string | null
  created_at: string
  events: {
    id: string
    title: string
    start_time: string
    end_time: string
    location: string
  }
  user_profiles: {
    id: string
    full_name: string
  }
}

interface UserStats {
  totalRounds: number
  averageStrokes: number
  bestScore: number
  topThreeCount: number
}

export default function UserScoreQuery() {
  const { user } = useAuth()
  const [scores, setScores] = useState<ScoreData[]>([])
  const [userStats, setUserStats] = useState<UserStats>({
    totalRounds: 0,
    averageStrokes: 0,
    bestScore: 0,
    topThreeCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user) {
      fetchUserScores()
    }
  }, [user])

  const fetchUserScores = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // 先获取用户参加的所有活动ID
      const { data: userEvents, error: eventsError } = await supabase
        .from('event_registrations')
        .select('event_id')
        .eq('user_id', user.id)
        .eq('payment_status', 'paid')

      if (eventsError) throw eventsError

      if (!userEvents || userEvents.length === 0) {
        setScores([])
        calculateUserStats([])
        return
      }

      const eventIds = userEvents.map(er => er.event_id)

      // 获取用户参与比赛的所有成绩记录（包括排名）
      // 用户只能看到自己参与的比赛，但可以看到该比赛的所有成绩
      const { data: scoresData, error } = await supabase
        .from('scores')
        .select(`
          *,
          events (
            id,
            title,
            start_time,
            end_time,
            location
          ),
          user_profiles (
            id,
            full_name
          )
        `)
        .in('event_id', eventIds) // 只查询用户参与的比赛
        .order('created_at', { ascending: false })

      if (error) throw error

      setScores(scoresData || [])
      
      // 只计算用户自己的成绩统计
      const userScores = (scoresData || []).filter(score => score.user_id === user.id)
      calculateUserStats(userScores)
    } catch (error) {
      console.error('获取成绩数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateUserStats = (scoresData: ScoreData[]) => {
    const totalRounds = scoresData.length
    const totalStrokes = scoresData.reduce((sum, score) => sum + score.total_strokes, 0)
    const averageStrokes = totalRounds > 0 ? Math.round((totalStrokes / totalRounds) * 10) / 10 : 0
    const bestScore = totalRounds > 0 ? Math.min(...scoresData.map(s => s.total_strokes)) : 0
    const topThreeCount = scoresData.filter(s => s.rank && s.rank <= 3).length

    // 调试信息
    // console.log('📊 用户成绩统计调试:', {
    //   totalRounds,
    //   totalStrokes,
    //   averageStrokes,
    //   bestScore,
    //   topThreeCount,
    //   allScores: scoresData.map(s => ({ 
    //     event: s.events.title, 
    //     strokes: s.total_strokes,
    //     rank: s.rank
    //   }))
    // })

    setUserStats({
      totalRounds,
      averageStrokes,
      bestScore,
      topThreeCount
    })
  }

  const getRankIcon = (rank: number | null) => {
    if (!rank) return null
    
    if (rank === 1) {
      return (
        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg">
          <Medal className="w-5 h-5 text-white drop-shadow-sm" />
        </div>
      )
    } else if (rank === 2) {
      return (
        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full shadow-lg">
          <Medal className="w-5 h-5 text-white drop-shadow-sm" />
        </div>
      )
    } else if (rank === 3) {
      return (
        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full shadow-lg">
          <Medal className="w-5 h-5 text-white drop-shadow-sm" />
        </div>
      )
    }
    return null
  }

  const getRankBadgeStyle = (rank: number | null) => {
    if (!rank) return 'bg-gray-100 text-gray-800 border border-gray-200'
    
    if (rank === 1) {
      return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-bold border-2 border-yellow-300'
    } else if (rank === 2) {
      return 'bg-gradient-to-r from-gray-300 to-gray-400 text-white font-bold border-2 border-gray-200'
    } else if (rank === 3) {
      return 'bg-gradient-to-r from-amber-400 to-amber-500 text-white font-bold border-2 border-amber-300'
    }
    return 'bg-gradient-to-r from-blue-400 to-blue-500 text-white font-bold border border-blue-300'
  }

  // 按活动分组成绩
  const groupedScores = scores.reduce((groups, score) => {
    const eventId = score.events.id
    if (!groups[eventId]) {
      groups[eventId] = {
        event: score.events,
        scores: []
      }
    }
    groups[eventId].scores.push(score)
    return groups
  }, {} as Record<string, { event: any, scores: ScoreData[] }>)

  // 对每个活动的成绩按排名排序
  Object.values(groupedScores).forEach(group => {
    group.scores.sort((a, b) => {
      if (a.rank && b.rank) return a.rank - b.rank
      if (a.rank && !b.rank) return -1
      if (!a.rank && b.rank) return 1
      return a.total_strokes - b.total_strokes
    })
  })

  const filteredGroups = Object.values(groupedScores).filter(group => {
    const matchesSearch = group.event.title.toLowerCase().includes(searchTerm.toLowerCase())
    
    const eventDate = new Date(group.event.start_time)
    const matchesYear = !selectedYear || eventDate.getFullYear().toString() === selectedYear
    const matchesMonth = !selectedMonth || (eventDate.getMonth() + 1).toString() === selectedMonth
    
    return matchesSearch && matchesYear && matchesMonth
  })

  const availableYears = [...new Set(scores.map(s => new Date(s.events.start_time).getFullYear()))].sort((a, b) => b - a)
  const availableMonths = [
    { value: '1', label: '1月' },
    { value: '2', label: '2月' },
    { value: '3', label: '3月' },
    { value: '4', label: '4月' },
    { value: '5', label: '5月' },
    { value: '6', label: '6月' },
    { value: '7', label: '7月' },
    { value: '8', label: '8月' },
    { value: '9', label: '9月' },
    { value: '10', label: '10月' },
    { value: '11', label: '11月' },
    { value: '12', label: '12月' }
  ]

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents)
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId)
    } else {
      newExpanded.add(eventId)
    }
    setExpandedEvents(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-golf-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 个人统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">总轮次</p>
              <p className="text-2xl font-bold text-gray-900">{userStats.totalRounds}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">平均杆数</p>
              <p className="text-2xl font-bold text-gray-900">{userStats.averageStrokes}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">最佳成绩</p>
              <p className="text-2xl font-bold text-gray-900">{userStats.bestScore}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">前三名次</p>
              <p className="text-2xl font-bold text-gray-900">{userStats.topThreeCount}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 成绩查询 */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Trophy className="w-7 h-7 text-yellow-500 mr-3" />
            我的成绩记录
          </h2>
        </div>

        {/* 统一搜索组件 */}
        <UnifiedSearch
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          availableYears={availableYears}
          placeholder="按活动名称搜索..."
          showLocationFilter={false}
          onClearFilters={() => {
            setSearchTerm('')
            setSelectedYear('')
            setSelectedMonth('')
          }}
        />

        {/* 成绩列表 */}
        <div className="space-y-2">
          {filteredGroups.map((group) => {
            const isExpanded = expandedEvents.has(group.event.id)
            const userScore = group.scores.find(s => s.user_id === user?.id)
            
            return (
              <div
                key={group.event.id}
                className="bg-gray-50 rounded-2xl shadow-sm hover:shadow-lg transition-all border border-gray-100 hover:border-gray-200"
              >
                {/* 活动卡片头部 */}
                <div
                  className="p-4 sm:p-6 cursor-pointer"
                  onClick={() => toggleEventExpansion(group.event.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900">{group.event.title}</h3>
                        
                        {/* 活动时间 */}
                        <div className="text-sm text-gray-500 mt-1 mb-2">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2 text-gray-400" />
                            <span>
                              {new Date(group.event.start_time).toLocaleDateString('zh-CN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>

                        {/* 移动端紧凑布局 */}
                        <div className="block sm:hidden">
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <div className="flex items-center space-x-3">
                              {userScore && (
                                <div className="flex items-center">
                                  <span className="font-medium text-golf-600">{userScore.total_strokes}杆</span>
                                  {userScore.rank && (
                                    <div className="flex items-center ml-2">
                                      {getRankIcon(userScore.rank)}
                                      <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${getRankBadgeStyle(userScore.rank)}`}>
                                        #{userScore.rank}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 桌面端完整布局 */}
                        <div className="hidden sm:block">
                          <div className="flex items-center text-sm text-gray-600">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center">
                                <span className="text-gray-500">参赛人数:</span>
                                <span className="ml-2 font-medium">{group.scores.length}人</span>
                              </div>
                              {userScore && (
                                <>
                                  <div className="flex items-center">
                                    <span className="text-gray-500">我的成绩:</span>
                                    <span className="ml-2 font-medium">{userScore.total_strokes}杆</span>
                                  </div>
                                  {userScore.rank && (
                                    <div className="flex items-center">
                                      <span className="text-gray-500">我的排名:</span>
                                      <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getRankBadgeStyle(userScore.rank)}`}>
                                        #{userScore.rank}
                                      </span>
                                      {getRankIcon(userScore.rank)}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {group.scores.length}人参赛
                      </span>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 折叠内容 - 所有参赛者成绩排名 */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 sm:px-6 pb-4 bg-white rounded-b-2xl">
                    <div className="space-y-3 mt-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">成绩排名</h4>
                      <div className="space-y-2">
                        {group.scores.map((score, index) => {
                          const isCurrentUser = score.user_id === user?.id
                          return (
                            <div 
                              key={score.id}
                              className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                                isCurrentUser 
                                  ? 'bg-golf-50 border-2 border-golf-200 shadow-lg' 
                                  : score.rank && score.rank <= 3
                                  ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 shadow-md'
                                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                              }`}
                            >
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-3">
                                  {getRankIcon(score.rank)}
                                  <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${getRankBadgeStyle(score.rank)}`}>
                                    {score.rank ? `#${score.rank}` : `#${index + 1}`}
                                  </span>
                                </div>
                                <div>
                                  <div className={`font-medium ${isCurrentUser ? 'text-golf-800' : 'text-gray-900'}`}>
                                    {score.user_profiles?.full_name || '未知'}
                                    {isCurrentUser && (
                                      <span className="ml-2 text-xs text-golf-600 font-semibold">(我)</span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    总杆数: {score.total_strokes} | 净杆数: {score.net_strokes || '-'} | 差点: {score.handicap}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-gray-900">{score.total_strokes}</div>
                                <div className="text-xs text-gray-500">杆</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filteredGroups.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            {Object.keys(groupedScores).length === 0 ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无成绩记录</h3>
                <p className="text-gray-600">参加活动后即可查看成绩</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">未找到匹配的记录</h3>
                <p className="text-gray-600">请尝试调整搜索条件</p>
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedYear('')
                    setSelectedMonth('')
                  }}
                  className="mt-3 px-4 py-2 bg-golf-600 text-white rounded-lg hover:bg-golf-700 transition-colors"
                >
                  清除过滤器
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
