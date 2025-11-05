import React, { useState, useEffect } from 'react'
import { 
  Trophy, Medal, Award, TrendingUp, Star, Clock,
  ChevronDown, ChevronRight, User
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import UnifiedSearch from './UnifiedSearch'

interface ScoreData {
  id: string
  event_id: string
  user_id?: string  // 会员成绩有 user_id
  player_name?: string  // 访客成绩有 player_name
  total_strokes: number
  net_strokes: number | null
  handicap: number
  rank: number | null
  notes: string | null
  created_at: string
  group_number?: number | null
  team_name?: string | null
  hole_scores?: number[] | null
  is_guest?: boolean  // 标识是否为访客成绩
  events: {
    id: string
    title: string
    start_time: string
    end_time: string
    location: string
    event_type?: string
  }
  user_profiles?: {
    id: string
    full_name: string
    avatar_url?: string | null
    avatar_position_x?: number | null
    avatar_position_y?: number | null
  } | null
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
      
      // 获取所有比赛的成绩记录（包括会员和访客成绩）
      // 读取会员成绩
      const { data: memberScoresData, error: memberError } = await supabase
        .from('scores')
        .select(`
          *,
          events (
            id,
            title,
            start_time,
            end_time,
            location,
            event_type,
            scoring_mode,
            par,
            team_name_mapping,
            team_colors
          ),
          user_profiles (
            id,
            full_name,
            avatar_url,
            avatar_position_x,
            avatar_position_y
          )
        `)
        .order('created_at', { ascending: false })

      if (memberError) throw memberError

      // 读取访客成绩
      const { data: guestScoresData, error: guestError } = await supabase
        .from('guest_scores')
        .select(`
          *,
          events (
            id,
            title,
            start_time,
            end_time,
            location,
            event_type,
            scoring_mode,
            par,
            team_name_mapping,
            team_colors
          )
        `)
        .order('created_at', { ascending: false })

      if (guestError) {
        console.error('获取访客成绩失败:', guestError)
        // 访客成绩获取失败不影响，继续使用会员成绩
      }

      // 合并会员和访客成绩，统一格式
      const memberScores = (memberScoresData || []).map(score => ({
        ...score,
        is_guest: false
      }))

      const guestScores = (guestScoresData || []).map(score => ({
        ...score,
        is_guest: true,
        player_name: score.player_name,
        user_id: undefined,
        user_profiles: null
      }))

      // 合并并排序
      const allScores = [...memberScores, ...guestScores].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setScores(allScores)
      
      // 只计算用户自己的成绩统计（不包括访客）
      const userScores = (memberScoresData || []).filter(score => score.user_id === user.id)
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
        <div className="w-8 h-8 border-4 border-[#F15B98] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 个人统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-white rounded-xl p-2 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">总轮次</p>
              <p className="text-2xl font-bold text-gray-900">{userStats.totalRounds}</p>
            </div>
            <div className="flex items-center justify-center">
              <Trophy className="w-6 h-6 lg:w-8 lg:h-8 xl:w-10 xl:h-10 text-golf-500" style={{ fill: 'none' }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">平均杆数</p>
              <p className="text-2xl font-bold text-gray-900">{userStats.averageStrokes}</p>
            </div>
            <div className="flex items-center justify-center">
              <TrendingUp className="w-6 h-6 lg:w-8 lg:h-8 xl:w-10 xl:h-10 text-golf-500" style={{ fill: 'none' }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">最佳成绩</p>
              <p className="text-2xl font-bold text-gray-900">{userStats.bestScore}</p>
            </div>
            <div className="flex items-center justify-center">
              <Award className="w-6 h-6 lg:w-8 lg:h-8 xl:w-10 xl:h-10 text-golf-500" style={{ fill: 'none' }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">前三名次</p>
              <p className="text-2xl font-bold text-gray-900">{userStats.topThreeCount}</p>
            </div>
            <div className="flex items-center justify-center">
              <Star className="w-6 h-6 lg:w-8 lg:h-8 xl:w-10 xl:h-10 text-golf-500" style={{ fill: 'none' }} />
            </div>
          </div>
        </div>
      </div>

      {/* 成绩查询 */}
      <div className="bg-white rounded-2xl shadow-sm px-1 sm:px-6 pt-2 pb-2 sm:pt-6 sm:pb-6">

        {/* 统一搜索组件 */}
        <div className="px-1 sm:px-0 mb-4 sm:mb-6">
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
        </div>

        {/* 成绩列表 */}
        <div className="space-y-2 -mx-1 sm:mx-0">
          {filteredGroups.map((group) => {
            const isExpanded = expandedEvents.has(group.event.id)
            const userScore = group.scores.find(s => s.user_id === user?.id)
            
            // 计算团队得分（莱德杯模式）
            const calculateTeamScore = (teamName: string) => {
              const teamScores = group.scores.filter(s => s.team_name === teamName && s.hole_scores && Array.isArray(s.hole_scores) && s.hole_scores.length === 18)
              if (teamScores.length === 0) return 0
              
              // 按分组组织数据并计算得分
              const groups = new Map<number, Map<string, Array<{ holeScores: number[] }>>>()
              teamScores.forEach(score => {
                const groupNum = score.group_number || 0
                const tName = score.team_name || ''
                if (!groups.has(groupNum)) {
                  groups.set(groupNum, new Map())
                }
                const groupTeams = groups.get(groupNum)!
                if (!groupTeams.has(tName)) {
                  groupTeams.set(tName, [])
                }
                groupTeams.get(tName)!.push({
                  holeScores: score.hole_scores || []
                })
              })
              
              // 计算所有组的团队得分
              let totalTeamScore = 0
              groups.forEach((teamsMap, groupNum) => {
                const teamEntries = Array.from(teamsMap.entries())
                if (teamEntries.length < 2) return
                
                const teamWins = new Map<string, number>()
                teamEntries.forEach(([tName]) => {
                  teamWins.set(tName, 0)
                })
                
                for (let hole = 0; hole < 18; hole++) {
                  const holeBestScores: Array<{ teamName: string; bestScore: number }> = []
                  teamEntries.forEach(([tName, players]) => {
                    const scores = players.map(p => {
                      const score = p.holeScores?.[hole]
                      return score !== undefined && score !== null && !isNaN(score) ? Number(score) : Infinity
                    }).filter(s => s !== Infinity)
                    const bestScore = scores.length > 0 ? Math.min(...scores) : Infinity
                    if (bestScore !== Infinity) {
                      holeBestScores.push({ teamName: tName, bestScore })
                    }
                  })
                  
                  if (holeBestScores.length === 0) continue
                  const minBestScore = Math.min(...holeBestScores.map(h => h.bestScore))
                  const winners = holeBestScores.filter(h => h.bestScore === minBestScore).map(w => w.teamName)
                  const pointsPerTeam = 1 / winners.length
                  winners.forEach(winner => {
                    const currentWins = teamWins.get(winner) || 0
                    teamWins.set(winner, currentWins + pointsPerTeam)
                  })
                }
                
                const userTeamWins = teamWins.get(teamName) || 0
                totalTeamScore += userTeamWins
              })
              
              return totalTeamScore
            }
            
            // 计算用户成绩显示（团体赛莱德杯模式显示团队得分，其他显示个人总杆数）
            const getUserScoreDisplay = () => {
              if (!userScore) return null
              
              // 如果是团体赛且是莱德杯模式，计算团队得分
              if (group.event.event_type === '团体赛' && group.event.scoring_mode === 'ryder_cup' && userScore.team_name && userScore.hole_scores) {
                const teamScore = calculateTeamScore(userScore.team_name)
                return { value: `${teamScore.toFixed(1)}`, isTeam: true }
              }
              
              // 其他情况显示个人总杆数
              return { value: `${userScore.total_strokes}杆`, isTeam: false }
            }
            
            const scoreDisplay = getUserScoreDisplay()
            
            return (
              <div
                key={group.event.id}
                className="bg-[#fffbf9]/80 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-lg transition-all border border-gray-100 hover:border-gray-200 mx-1 sm:mx-0"
              >
                {/* 活动卡片头部 */}
                <div
                  className="p-2 sm:p-6 cursor-pointer"
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
                              {scoreDisplay && (
                                <div className="flex items-center">
                                  <span className="font-medium text-[#F15B98]">
                                    {scoreDisplay.isTeam ? (
                                      // 移动端也计算团队得分（简化版，只显示团队名称）
                                      scoreDisplay.value
                                    ) : (
                                      scoreDisplay.value
                                    )}
                                  </span>
                                  {userScore && userScore.rank && (
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
                              {scoreDisplay && (
                                <>
                                  <div className="flex items-center">
                                    <span className="text-gray-500">我的成绩:</span>
                                    <span className="ml-2 font-medium">{scoreDisplay.value}</span>
                                  </div>
                                  {userScore && userScore.rank && (
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
                      {group.event.event_type && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-[#F15B98]/20 text-[#F15B98]">
                          {group.event.event_type === '团体赛' ? '团体赛' : '个人赛'}
                        </span>
                      )}
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#F15B98]/20 text-[#F15B98]">
                        {group.scores.length}人参赛
                      </span>
                      <div className="flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-golf-400" style={{ fill: 'none' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 折叠内容 - 团体赛显示详细结果，个人赛显示分组信息 */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-0 sm:px-6 pb-4 bg-white rounded-b-2xl">
                    {group.event.event_type === '团体赛' ? (
                      /* 团体赛结果 */
                      (() => {
                      // 过滤出有分组和团队信息的成绩
                      const teamScores = group.scores.filter(s => s.group_number && s.team_name && s.hole_scores && Array.isArray(s.hole_scores) && s.hole_scores.length === 18)
                      
                      if (teamScores.length === 0) {
                        // 没有团体赛数据，显示普通排名
                        return (
                          <div className="space-y-3 mt-4">
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">成绩排名</h4>
                            <div className="space-y-2">
                              {group.scores.map((score, index) => {
                                const isCurrentUser = score.user_id === user?.id
                                return (
                                  <div 
                                    key={score.id}
                                    className={`flex items-center justify-between p-2 sm:p-4 rounded-xl transition-all ${
                                      isCurrentUser 
                                        ? 'bg-[#F15B98]/10 border-2 border-[#F15B98]/30 shadow-lg' 
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
                                        <div className={`font-medium ${isCurrentUser ? 'text-[#F15B98]' : 'text-gray-900'}`}>
                                          {score.is_guest ? (score.player_name || '未知访客') : (score.user_profiles?.full_name || '未知')}
                                          {score.is_guest && (
                                            <span className="ml-2 text-xs text-gray-500">(访客)</span>
                                          )}
                                          {isCurrentUser && (
                                            <span className="ml-2 text-xs text-[#F15B98] font-semibold">(我)</span>
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
                        )
                      }
                      
                      // 转换为计算所需的格式
                      const players = teamScores.map(score => {
                        let holeScores = score.hole_scores || []
                        if (Array.isArray(holeScores) && holeScores.length > 0 && typeof holeScores[0] === 'string') {
                          holeScores = holeScores.map(s => parseInt(String(s), 10) || 0)
                        }
                        
                        let avatarUrl = score.is_guest ? null : (score.user_profiles?.avatar_url || null)
                        if (avatarUrl && typeof avatarUrl === 'string') {
                          avatarUrl = avatarUrl.trim()
                          if (avatarUrl === '') {
                            avatarUrl = null
                          }
                        }
                        
                        return {
                          name: score.is_guest ? (score.player_name || '未知访客') : (score.user_profiles?.full_name || '未知'),
                          avatarUrl: avatarUrl,
                          avatarPositionX: score.is_guest ? 50 : (score.user_profiles?.avatar_position_x || 50),
                          avatarPositionY: score.is_guest ? 50 : (score.user_profiles?.avatar_position_y || 50),
                          holeScores: holeScores,
                          totalStrokes: score.total_strokes || 0,
                          groupNumber: score.group_number,
                          teamName: score.team_name
                        }
                      })
                      
                      // 按分组和团队组织数据
                      const groups = new Map<number, Map<string, Array<{ name: string; avatarUrl: string | null; avatarPositionX: number; avatarPositionY: number; holeScores: number[]; totalStrokes: number }>>>()
                      players.forEach(player => {
                        if (!player.groupNumber || !player.teamName) return
                        const groupNum = player.groupNumber
                        const teamName = player.teamName.trim()
                        if (!groups.has(groupNum)) {
                          groups.set(groupNum, new Map())
                        }
                        const groupTeams = groups.get(groupNum)!
                        if (!groupTeams.has(teamName)) {
                          groupTeams.set(teamName, [])
                        }
                        groupTeams.get(teamName)!.push({
                          name: player.name,
                          avatarUrl: player.avatarUrl,
                          avatarPositionX: player.avatarPositionX,
                          avatarPositionY: player.avatarPositionY,
                          holeScores: player.holeScores,
                          totalStrokes: player.totalStrokes
                        })
                      })
                      
                      // 计算每组胜负和总比分
                      const groupDetails: Array<{
                        group: number
                        teams: Array<{ teamName: string; wins: number; playerCount: number; players: Array<{ name: string; avatarUrl: string | null; avatarPositionX: number; avatarPositionY: number; holeScores: number[]; totalStrokes: number }> }>
                        winner: string | 'tie'
                      }> = []
                      const totalScores = new Map<string, number>()
                      
                      groups.forEach((teamsMap, groupNumber) => {
                        const teamEntries = Array.from(teamsMap.entries())
                        if (teamEntries.length < 1) return
                        
                        // 初始化每个团队的胜利数
                        const teamWins = new Map<string, number>()
                        teamEntries.forEach(([teamName]) => {
                          teamWins.set(teamName, 0)
                          if (!totalScores.has(teamName)) {
                            totalScores.set(teamName, 0)
                          }
                        })
                        
                        // 对每个洞进行比较，找出最佳成绩的团队
                        for (let hole = 0; hole < 18; hole++) {
                          const holeBestScores: Array<{ teamName: string; bestScore: number }> = []
                          
                          // 计算每个团队在该洞的最佳成绩
                          teamEntries.forEach(([teamName, players]) => {
                            const scores = players.map(p => {
                              const score = p.holeScores?.[hole]
                              return score !== undefined && score !== null && !isNaN(score) ? Number(score) : Infinity
                            }).filter(s => s !== Infinity)
                            
                            const bestScore = scores.length > 0 ? Math.min(...scores) : Infinity
                            if (bestScore !== Infinity) {
                              holeBestScores.push({ teamName, bestScore })
                            }
                          })
                          
                          if (holeBestScores.length === 0) continue
                          
                          // 找出该洞的最佳成绩（最小值）
                          const minBestScore = Math.min(...holeBestScores.map(h => h.bestScore))
                          
                          // 找出所有达到最佳成绩的团队（可能有平局）
                          const winners = holeBestScores.filter(h => h.bestScore === minBestScore)
                          
                          // 每洞只有一个获胜结果：如果只有一个团队获胜，该团队得1分；如果有多个团队平局，每个团队得1/n分（n为平局团队数）
                          const pointsPerTeam = 1 / winners.length
                          winners.forEach(winner => {
                            const currentWins = teamWins.get(winner.teamName) || 0
                            teamWins.set(winner.teamName, currentWins + pointsPerTeam)
                          })
                        }
                        
                        // 构建该组的团队统计
                        const groupTeams = teamEntries.map(([teamName, players]) => ({
                          teamName,
                          wins: teamWins.get(teamName) || 0,
                          playerCount: players.length,
                          players: players
                        }))
                        
                        // 找出获胜者（得分最高的团队）
                        const sortedTeams = [...groupTeams].sort((a, b) => b.wins - a.wins)
                        const maxWins = sortedTeams[0]?.wins || 0
                        const winners = sortedTeams.filter(t => t.wins === maxWins)
                        
                        let winner: string | 'tie'
                        if (winners.length === 1) {
                          winner = winners[0].teamName
                          totalScores.set(winner, (totalScores.get(winner) || 0) + 1)
                        } else if (winners.length > 1) {
                          winner = 'tie'
                          // 平局时每个团队加0.5分
                          winners.forEach(w => {
                            totalScores.set(w.teamName, (totalScores.get(w.teamName) || 0) + 0.5)
                          })
                        } else {
                          winner = 'tie'
                        }
                        
                        groupDetails.push({
                          group: groupNumber,
                          teams: groupTeams,
                          winner
                        })
                      })
                      
                      // 按组号排序
                      groupDetails.sort((a, b) => a.group - b.group)
                      
                      // 获取所有团队名称并按得分排序
                      const allTeamNames = Array.from(totalScores.keys())
                      const sortedTeamNames = allTeamNames.sort((a, b) => {
                        const scoreA = totalScores.get(a) || 0
                        const scoreB = totalScores.get(b) || 0
                        return scoreB - scoreA // 按得分降序
                      })
                      
                      // 定义颜色数组（支持多个团队）
                      const teamColors = [
                        { bg: '#F15B98', text: '#F15B98', dot: '#F15B98' }, // 粉色
                        { bg: '#92c648', text: '#92c648', dot: '#92c648' }, // 绿色
                        { bg: '#3B82F6', text: '#3B82F6', dot: '#3B82F6' }, // 蓝色
                        { bg: '#F59E0B', text: '#F59E0B', dot: '#F59E0B' }, // 橙色
                        { bg: '#8B5CF6', text: '#8B5CF6', dot: '#8B5CF6' }, // 紫色
                        { bg: '#EF4444', text: '#EF4444', dot: '#EF4444' }, // 红色
                      ]
                      
                      // 为每个团队分配颜色（使用保存的配置或默认颜色）
                      const teamColorMap = new Map<string, typeof teamColors[0]>()
                      const eventTeamColors = group.event?.team_colors || {}
                      const eventTeamMapping = group.event?.team_name_mapping || {}
                      
                      // 创建反向映射（从显示名称到原始名称）
                      const reverseMapping = new Map<string, string>()
                      Object.entries(eventTeamMapping).forEach(([original, display]) => {
                        reverseMapping.set(display, original)
                      })
                      
                      sortedTeamNames.forEach((teamName, index) => {
                        // teamName是显示名称（数据库中的team_name已经是映射后的名称）
                        // team_colors的key是Excel原始名称，所以需要用team_name_mapping反向查找原始名称
                        let color = teamColors[0] // 默认颜色
                        const originalName = reverseMapping.get(teamName) || teamName
                        // 用原始名称去team_colors查找颜色
                        const savedColor = eventTeamColors[originalName]
                        
                        if (savedColor) {
                          // 如果找到保存的颜色，转换为对应的颜色对象
                          const colorIndex = teamColors.findIndex(c => 
                            c.bg.toLowerCase() === savedColor.toLowerCase() || 
                            c.dot.toLowerCase() === savedColor.toLowerCase()
                          )
                          if (colorIndex >= 0) {
                            color = teamColors[colorIndex]
                          } else {
                            // 如果保存的颜色不在预设列表中，创建自定义颜色对象
                            color = {
                              bg: savedColor,
                              dot: savedColor,
                              text: '#FFFFFF'
                            }
                          }
                        } else {
                          // 使用默认颜色分配
                          color = teamColors[index % teamColors.length]
                        }
                        // teamColorMap的key是显示名称（teamName），value是颜色对象
                        teamColorMap.set(teamName, color)
                      })
                      
                      // 根据比赛模式确定标题
                      const scoringMode = group.event?.scoring_mode || 'ryder_cup'
                      const titleText = scoringMode === 'ryder_cup' 
                        ? '团体赛（莱德杯模式）' 
                        : '团体赛（总杆数模式）'
                      
                      return (
                        <div className="space-y-4 sm:space-y-6 mt-4">
                          <h4 className="text-base sm:text-lg font-semibold text-gray-900 mx-1 sm:mx-0">{titleText}</h4>
                          
                          {/* 总比分 - 显示所有团队 */}
                          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center mx-1 sm:mx-0 flex-wrap">
                            {sortedTeamNames.map(teamName => {
                              const color = teamColorMap.get(teamName) || teamColors[0]
                              return (
                                <div key={teamName} className="flex items-center justify-between bg-white rounded-xl p-2 sm:p-5 border border-gray-200 w-full sm:min-w-[200px] gap-2 sm:gap-4">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-3 h-3 rounded" style={{ backgroundColor: color.dot }}></div>
                                    <span className="font-medium text-gray-900">{teamName}</span>
                                  </div>
                                  <div className="text-white rounded-lg px-4 sm:px-6 py-2 font-bold text-lg sm:text-xl flex-shrink-0" style={{ backgroundColor: color.bg }}>
                                    {(totalScores.get(teamName) ?? 0).toFixed(1)}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          
                          {/* 各组详细结果 */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mx-1 sm:mx-0">
                            {groupDetails.map(group => {
                              // 按得分排序团队
                              const sortedGroupTeams = [...group.teams].sort((a, b) => b.wins - a.wins)
                              
                              // 计算每洞的胜负（支持多团队）
                              const holeResults: Array<{ teamName: string; won: boolean }> = []
                              
                              for (let hole = 0; hole < 18; hole++) {
                                const holeBestScores: Array<{ teamName: string; bestScore: number }> = []
                                
                                // 计算每个团队在该洞的最佳成绩
                                sortedGroupTeams.forEach(team => {
                                  const scores = team.players.map(p => {
                                    const score = p.holeScores?.[hole]
                                    return score !== undefined && score !== null && !isNaN(score) ? Number(score) : Infinity
                                  }).filter(s => s !== Infinity)
                                  
                                  const bestScore = scores.length > 0 ? Math.min(...scores) : Infinity
                                  if (bestScore !== Infinity) {
                                    holeBestScores.push({ teamName: team.teamName, bestScore })
                                  }
                                })
                                
                                if (holeBestScores.length === 0) {
                                  sortedGroupTeams.forEach(team => {
                                    holeResults.push({ teamName: team.teamName, won: false })
                                  })
                                  continue
                                }
                                
                                // 找出该洞的最佳成绩
                                const minBestScore = Math.min(...holeBestScores.map(h => h.bestScore))
                                const winners = holeBestScores.filter(h => h.bestScore === minBestScore).map(w => w.teamName)
                                
                                // 标记获胜团队
                                sortedGroupTeams.forEach(team => {
                                  holeResults.push({ teamName: team.teamName, won: winners.includes(team.teamName) })
                                })
                              }
                              
                              // 统计每个团队的获胜洞数（重新计算，确保与显示一致）
                              const teamWinsCount = new Map<string, number>()
                              
                              // 重新计算每洞的胜负（更准确的方法）
                              for (let hole = 0; hole < 18; hole++) {
                                const holeBestScores: Array<{ teamName: string; bestScore: number }> = []
                                
                                sortedGroupTeams.forEach(team => {
                                  const scores = team.players.map(p => {
                                    const score = p.holeScores?.[hole]
                                    return score !== undefined && score !== null && !isNaN(score) ? Number(score) : Infinity
                                  }).filter(s => s !== Infinity)
                                  
                                  const bestScore = scores.length > 0 ? Math.min(...scores) : Infinity
                                  if (bestScore !== Infinity) {
                                    holeBestScores.push({ teamName: team.teamName, bestScore })
                                  }
                                })
                                
                                if (holeBestScores.length === 0) continue
                                
                                const minBestScore = Math.min(...holeBestScores.map(h => h.bestScore))
                                const winners = holeBestScores.filter(h => h.bestScore === minBestScore).map(w => w.teamName)
                                
                                // 每洞只有一个获胜结果：如果只有一个团队获胜，该团队得1分；如果有多个团队平局，每个团队得1/n分（n为平局团队数）
                                const pointsPerTeam = 1 / winners.length
                                winners.forEach(winner => {
                                  const current = teamWinsCount.get(winner) || 0
                                  teamWinsCount.set(winner, current + pointsPerTeam)
                                })
                              }
                              
                              // 构建比分文本（使用整数显示，但保持小数精度）
                              const groupScoreText = sortedGroupTeams.map(team => {
                                const wins = teamWinsCount.get(team.teamName) || 0
                                return wins % 1 === 0 ? wins.toString() : wins.toFixed(1)
                              }).join(' - ')
                              
                              // 构建摘要文本
                              const summaryParts = sortedGroupTeams.map(team => {
                                const wins = teamWinsCount.get(team.teamName) || 0
                                const winsText = wins % 1 === 0 ? wins.toString() : wins.toFixed(1)
                                return `${team.teamName}赢${winsText}洞`
                              })
                              const summaryText = summaryParts.join('，')
                              
                              // 为每个团队分配颜色
                              const groupTeamColors = sortedGroupTeams.map((team, index) => ({
                                team,
                                color: teamColorMap.get(team.teamName) || teamColors[index % teamColors.length]
                              }))
                              
                              // 计算每洞的胜负结果（用于显示圆点）
                              const holeResultsByTeam = new Map<string, Array<boolean>>()
                              sortedGroupTeams.forEach(team => {
                                holeResultsByTeam.set(team.teamName, [])
                              })
                              
                              for (let hole = 0; hole < 18; hole++) {
                                const startIdx = hole * sortedGroupTeams.length
                                sortedGroupTeams.forEach(team => {
                                  const result = holeResults[startIdx + sortedGroupTeams.indexOf(team)]
                                  holeResultsByTeam.get(team.teamName)?.push(result?.won || false)
                                })
                              }
                              
                              return (
                                <div key={group.group} className="bg-white rounded-2xl p-2 sm:p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                                  <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-100">
                                    <div className="flex items-center justify-start flex-wrap gap-2">
                                      <span className="px-2 sm:px-3 py-1 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 border border-gray-200">
                                        第{group.group}组
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* 左右分列布局 - 仅显示两个团队 */}
                                  {sortedGroupTeams.length === 2 ? (
                                    <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                                      {/* 左侧团队 */}
                                      {(() => {
                                        const team = sortedGroupTeams[0]
                                        const color = teamColorMap.get(team.teamName) || teamColors[0]
                                        const teamHoleResults = holeResultsByTeam.get(team.teamName) || []
                                        const wins = teamWinsCount.get(team.teamName) || 0
                                        return (
                                          <div className="flex-1 relative">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full" style={{ backgroundColor: color.bg }}></div>
                                            <div className="pl-3 sm:pl-4">
                                              <div className="flex items-center gap-2 mb-2">
                                                <div className="w-3 h-3 rounded" style={{ backgroundColor: color.dot }}></div>
                                                <span className="font-semibold text-gray-900">{team.teamName}</span>
                                              </div>
                                              <div className="space-y-2">
                                                {team.players.map((player, idx) => (
                                                  <div key={idx} className="flex items-center gap-2 sm:gap-3">
                                                    <div className="relative">
                                                      <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 shadow-sm flex items-center justify-center overflow-hidden" 
                                                           style={{ 
                                                             backgroundColor: `${color.bg}20`,
                                                             borderColor: `${color.bg}40`
                                                           }}>
                                                        {player.avatarUrl ? (
                                                          <img 
                                                            src={player.avatarUrl} 
                                                            alt={player.name}
                                                            className="w-full h-full object-cover"
                                                            style={{
                                                              objectPosition: `${player.avatarPositionX || 50}% ${player.avatarPositionY || 50}%`
                                                            }}
                                                            onError={(e) => {
                                                              e.currentTarget.style.display = 'none'
                                                              const parent = e.currentTarget.parentElement
                                                              if (parent) {
                                                                parent.innerHTML = `<svg class="w-5 h-5" style="color: ${color.text}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>`
                                                              }
                                                            }}
                                                          />
                                                        ) : (
                                                          <User className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: color.text }} />
                                                        )}
                                                      </div>
                                                    </div>
                                                    <div className="flex flex-col">
                                                      <span className="text-sm text-gray-800 font-medium">{player.name}</span>
                                                      <span className="text-xs text-gray-500">{player.totalStrokes || 0}杆</span>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      })()}
                                      
                                      {/* 中间比分（仅莱德杯模式显示） */}
                                      {(() => {
                                        // 根据 scoring_mode 决定是否显示比分
                                        const scoringMode = group.event?.scoring_mode || 'ryder_cup' // 默认为莱德杯模式
                                        
                                        if (scoringMode !== 'ryder_cup') {
                                          // 总杆模式：不显示中间比分
                                          return null
                                        }
                                        
                                        const team1 = sortedGroupTeams[0]
                                        const team2 = sortedGroupTeams[1]
                                        const wins1 = teamWinsCount.get(team1.teamName) || 0
                                        const wins2 = teamWinsCount.get(team2.teamName) || 0
                                        const formatScore = (s: number) => {
                                          if (s % 1 === 0) return s.toString()
                                          return s.toFixed(1)
                                        }
                                        const color1 = teamColorMap.get(team1.teamName) || teamColors[0]
                                        const color2 = teamColorMap.get(team2.teamName) || teamColors[1]
                                        
                                        // 莱德杯模式：显示比分
                                        return (
                                          <div className="flex items-center justify-center px-2 sm:px-3">
                                            <div className="bg-gray-100 rounded-lg px-3 sm:px-4 py-2 border border-gray-200">
                                              <span className="text-lg sm:text-xl font-bold" style={{ color: color1.text }}>
                                                {formatScore(wins1)}
                                              </span>
                                              <span className="text-gray-400 text-base sm:text-lg font-light mx-1 sm:mx-2">-</span>
                                              <span className="text-lg sm:text-xl font-bold" style={{ color: color2.text }}>
                                                {formatScore(wins2)}
                                              </span>
                                            </div>
                                          </div>
                                        )
                                      })()}
                                      
                                      {/* 右侧团队 */}
                                      {(() => {
                                        const team = sortedGroupTeams[1]
                                        const color = teamColorMap.get(team.teamName) || teamColors[1]
                                        const teamHoleResults = holeResultsByTeam.get(team.teamName) || []
                                        const wins = teamWinsCount.get(team.teamName) || 0
                                        return (
                                          <div className="flex-1 relative">
                                            <div className="pr-3 sm:pr-4">
                                              <div className="flex items-center justify-end gap-2 mb-2">
                                                <div className="w-3 h-3 rounded" style={{ backgroundColor: color.dot }}></div>
                                                <span className="font-semibold text-gray-900">{team.teamName}</span>
                                              </div>
                                              <div className="space-y-2">
                                                {team.players.map((player, idx) => (
                                                  <div key={idx} className="flex items-center gap-2 sm:gap-3 justify-end">
                                                    <div className="flex flex-col items-end">
                                                      <span className="text-sm text-gray-800 font-medium">{player.name}</span>
                                                      <span className="text-xs text-gray-500">{player.totalStrokes || 0}杆</span>
                                                    </div>
                                                    <div className="relative">
                                                      <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 shadow-sm flex items-center justify-center overflow-hidden" 
                                                           style={{ 
                                                             backgroundColor: `${color.bg}20`,
                                                             borderColor: `${color.bg}40`
                                                           }}>
                                                        {player.avatarUrl ? (
                                                          <img 
                                                            src={player.avatarUrl} 
                                                            alt={player.name}
                                                            className="w-full h-full object-cover"
                                                            style={{
                                                              objectPosition: `${player.avatarPositionX || 50}% ${player.avatarPositionY || 50}%`
                                                            }}
                                                            onError={(e) => {
                                                              e.currentTarget.style.display = 'none'
                                                              const parent = e.currentTarget.parentElement
                                                              if (parent) {
                                                                parent.innerHTML = `<svg class="w-5 h-5" style="color: ${color.text}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>`
                                                              }
                                                            }}
                                                          />
                                                        ) : (
                                                          <User className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: color.text }} />
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                            <div className="absolute right-0 top-0 bottom-0 w-1 rounded-full" style={{ backgroundColor: color.bg }}></div>
                                          </div>
                                        )
                                      })()}
                                    </div>
                                  ) : (
                                    // 如果超过两个团队，使用原来的上下布局
                                    <div className="space-y-4 mb-4 sm:mb-6">
                                      {groupTeamColors.map(({ team, color }, teamIndex) => {
                                        const teamHoleResults = holeResultsByTeam.get(team.teamName) || []
                                        return (
                                          <div key={team.teamName} className="relative">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full" style={{ backgroundColor: color.bg }}></div>
                                            <div className="pl-3 sm:pl-4">
                                              <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                  <div className="w-3 h-3 rounded" style={{ backgroundColor: color.dot }}></div>
                                                  <span className="font-semibold text-gray-900">{team.teamName}</span>
                                                </div>
                                                <span className="text-lg font-bold" style={{ color: color.text }}>
                                                  {(() => {
                                                    const wins = teamWinsCount.get(team.teamName) || 0
                                                    return wins % 1 === 0 ? `${wins}洞` : `${wins.toFixed(1)}洞`
                                                  })()}
                                                </span>
                                              </div>
                                              <div className="space-y-2">
                                                {team.players.map((player, idx) => (
                                                  <div key={idx} className="flex items-center gap-2 sm:gap-3">
                                                    <div className="relative">
                                                      <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 shadow-sm flex items-center justify-center overflow-hidden" 
                                                           style={{ 
                                                             backgroundColor: `${color.bg}20`,
                                                             borderColor: `${color.bg}40`
                                                           }}>
                                                        {player.avatarUrl ? (
                                                          <img 
                                                            src={player.avatarUrl} 
                                                            alt={player.name}
                                                            className="w-full h-full object-cover"
                                                            style={{
                                                              objectPosition: `${player.avatarPositionX || 50}% ${player.avatarPositionY || 50}%`
                                                            }}
                                                            onError={(e) => {
                                                              e.currentTarget.style.display = 'none'
                                                              const parent = e.currentTarget.parentElement
                                                              if (parent) {
                                                                parent.innerHTML = `<svg class="w-5 h-5" style="color: ${color.text}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>`
                                                              }
                                                            }}
                                                          />
                                                        ) : (
                                                          <User className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: color.text }} />
                                                        )}
                                                      </div>
                                                    </div>
                                                    <div className="flex flex-col">
                                                      <span className="text-sm text-gray-800 font-medium">{player.name}</span>
                                                      <span className="text-xs text-gray-500">{player.totalStrokes || 0}杆</span>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                  
                                  {/* 每洞结果显示 */}
                                  <div className="bg-gradient-to-b from-gray-50 to-white rounded-xl p-2 sm:p-4 border border-gray-100">
                                    <div className="flex justify-center items-center gap-0.5 sm:gap-1 mb-2 flex-wrap">
                                      {Array.from({ length: 18 }, (_, holeIdx) => {
                                        const holeWinners: string[] = []
                                        sortedGroupTeams.forEach(team => {
                                          const results = holeResultsByTeam.get(team.teamName) || []
                                          if (results[holeIdx]) {
                                            holeWinners.push(team.teamName)
                                          }
                                        })
                                        
                                        return (
                                          <div
                                            key={holeIdx}
                                            className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-200 flex items-center justify-center flex-shrink-0 border-2"
                                            style={{
                                              backgroundColor: holeWinners.length > 0 
                                                ? (teamColorMap.get(holeWinners[0])?.dot || '#gray') 
                                                : 'white',
                                              borderColor: holeWinners.length > 0 
                                                ? (teamColorMap.get(holeWinners[0])?.dot || '#gray') 
                                                : '#gray',
                                              opacity: holeWinners.length > 0 ? 1 : 0.3
                                            }}
                                            title={`洞${holeIdx + 1}: ${holeWinners.length > 0 ? holeWinners.join('、') + '获胜' : '无数据'}`}
                                          >
                                            {holeWinners.length === 0 && (
                                              <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                    
                                    <div className="text-center pt-2 border-t border-gray-200">
                                      <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 bg-gray-100 rounded-full text-xs sm:text-sm font-semibold text-gray-700 border border-gray-200">
                                        {summaryText}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()
                    ) : (
                      /* 个人赛 - 显示按分组组织的成绩信息 */
                      (() => {
                        // 按分组组织个人赛成绩
                        const groupedScores = new Map<number, typeof group.scores>()
                        
                        group.scores.forEach(score => {
                          const groupNum = score.group_number || 0
                          if (!groupedScores.has(groupNum)) {
                            groupedScores.set(groupNum, [])
                          }
                          groupedScores.get(groupNum)!.push(score)
                        })
                        
                        const sortedGroups = Array.from(groupedScores.entries()).sort((a, b) => a[0] - b[0])
                        
                        if (sortedGroups.length === 0) {
                          return (
                            <div className="space-y-3 mt-4">
                              <p className="text-sm text-gray-500 text-center py-4">暂无分组信息</p>
                            </div>
                          )
                        }
                        
                        // 先按总杆数从小到大排序所有成绩（用于排名列表）
                        const allScoresSorted = group.scores.sort((a, b) => {
                          if (a.total_strokes !== b.total_strokes) {
                            return a.total_strokes - b.total_strokes
                          }
                          return (a.rank || 999) - (b.rank || 999)
                        })
                        
                        return (
                          <div className="space-y-4 mt-4">
                            {/* 排名列表 */}
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <h4 className="text-lg font-semibold text-gray-900 mb-3">成绩排名</h4>
                              <div className="space-y-2">
                                {allScoresSorted.map((score, index) => {
                                  const isCurrentUser = score.user_id === user?.id
                                  const playerName = score.is_guest 
                                    ? (score.player_name || '未知访客')
                                    : (score.user_profiles?.full_name || '未知')
                                  const playerType = score.is_guest ? '非会员' : '会员'
                                  
                                  return (
                                    <div
                                      key={score.id}
                                      className={`flex items-center justify-between p-2 sm:p-3 rounded-lg ${
                                        isCurrentUser
                                          ? 'bg-[#F15B98]/10 border border-[#F15B98]/30'
                                          : 'bg-gray-50 border border-gray-100'
                                      }`}
                                    >
                                      <div className="flex items-center space-x-3 flex-1">
                                        {/* 排名图标（前三名显示金银铜） */}
                                        {index < 3 ? (
                                          <div className="flex-shrink-0">
                                            {getRankIcon(index + 1)}
                                          </div>
                                        ) : (
                                          <span className="text-xs sm:text-sm text-gray-500 min-w-[2rem]">
                                            {index + 1}.
                                          </span>
                                        )}
                                        <div className="flex-1">
                                          <div className={`text-sm sm:text-base font-medium ${isCurrentUser ? 'text-[#F15B98]' : 'text-gray-900'}`}>
                                            {playerName}
                                            {isCurrentUser && (
                                              <span className="ml-2 text-xs text-[#F15B98] font-semibold">(我)</span>
                                            )}
                                            <span className="ml-2 text-xs text-gray-500">({playerType})</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right ml-4">
                                        <div className="text-lg sm:text-xl font-bold text-gray-900">{score.total_strokes}</div>
                                        <div className="text-xs sm:text-sm text-gray-500">杆</div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                            
                            {/* 小组卡片 */}
                            {sortedGroups.map(([groupNum, scores]) => {
                              // 按总杆数从小到大排序
                              const sortedScores = scores.sort((a, b) => {
                                if (a.total_strokes !== b.total_strokes) {
                                  return a.total_strokes - b.total_strokes
                                }
                                return (a.rank || 999) - (b.rank || 999)
                              })
                              
                              // 为每个玩家分配小组内排名（1, 2, 3...）
                              const scoresWithGroupRank = sortedScores.map((score, index) => ({
                                ...score,
                                groupRank: index + 1
                              }))
                              
                              // 分成左右两列
                              const midIndex = Math.ceil(scoresWithGroupRank.length / 2)
                              const leftPlayers = scoresWithGroupRank.slice(0, midIndex)
                              const rightPlayers = scoresWithGroupRank.slice(midIndex)
                              
                              return (
                                <div key={groupNum} className="bg-white rounded-2xl p-2 sm:p-6 border border-gray-100 shadow-lg">
                                  <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-100">
                                    <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                                      第{groupNum}组 ({scores.length}人)
                                    </h4>
                                  </div>
                                  
                                  {/* 左右分列布局 */}
                                  <div className="flex items-start gap-3 sm:gap-4">
                                    {/* 左侧玩家 */}
                                    <div className="flex-1 flex flex-col items-start relative">
                                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F15B98] rounded-l-full"></div>
                                      <div className="pl-4 sm:pl-5 space-y-3 w-full">
                                        {leftPlayers.map((score) => {
                                          const isCurrentUser = score.user_id === user?.id
                                          const playerName = score.is_guest 
                                            ? (score.player_name || '未知访客')
                                            : (score.user_profiles?.full_name || '未知')
                                          const avatarUrl = score.is_guest ? null : (score.user_profiles?.avatar_url || null)
                                          const avatarPositionX = score.user_profiles?.avatar_position_x || 50
                                          const avatarPositionY = score.user_profiles?.avatar_position_y || 50
                                          const groupRank = (score as any).groupRank || null
                                          
                                          return (
                                            <div key={score.id} className="flex items-center gap-2 sm:gap-3 w-full">
                                              <div className="relative">
                                                <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0" 
                                                     style={{ 
                                                       backgroundColor: '#F15B9820',
                                                       borderColor: '#F15B9840'
                                                     }}>
                                                  {avatarUrl ? (
                                                    <img 
                                                      src={avatarUrl} 
                                                      alt={playerName}
                                                      className="w-full h-full object-cover"
                                                      style={{
                                                        objectPosition: `${avatarPositionX}% ${avatarPositionY}%`
                                                      }}
                                                      onError={(e) => {
                                                        e.currentTarget.style.display = 'none'
                                                        const parent = e.currentTarget.parentElement
                                                        if (parent) {
                                                          parent.innerHTML = `<svg class="w-4 h-4 sm:w-5 sm:h-5" style="color: #F15B98" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>`
                                                        }
                                                      }}
                                                    />
                                                  ) : (
                                                    <User className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#F15B98' }} />
                                                  )}
                                                </div>
                                              </div>
                                              <div className="flex flex-col flex-1 min-w-0">
                                                <div className={`text-sm sm:text-base font-medium ${isCurrentUser ? 'text-[#F15B98]' : 'text-gray-900'}`}>
                                                  {playerName}
                                                  {isCurrentUser && (
                                                    <span className="ml-2 text-xs text-[#F15B98] font-semibold">(我)</span>
                                                  )}
                                                  {score.is_guest && (
                                                    <span className="ml-2 text-xs text-gray-500">(访客)</span>
                                                  )}
                                                </div>
                                                <div className="text-xs sm:text-sm text-gray-600 mt-0.5">
                                                  {score.total_strokes}杆
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                    
                                    {/* 中间不显示比分 */}
                                    
                                    {/* 右侧玩家 */}
                                    <div className="flex-1 flex flex-col items-end relative">
                                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#10B981] rounded-r-full"></div>
                                      <div className="pr-4 sm:pr-5 space-y-3 w-full text-right">
                                        {rightPlayers.map((score) => {
                                          const isCurrentUser = score.user_id === user?.id
                                          const playerName = score.is_guest 
                                            ? (score.player_name || '未知访客')
                                            : (score.user_profiles?.full_name || '未知')
                                          const avatarUrl = score.is_guest ? null : (score.user_profiles?.avatar_url || null)
                                          const avatarPositionX = score.user_profiles?.avatar_position_x || 50
                                          const avatarPositionY = score.user_profiles?.avatar_position_y || 50
                                          const groupRank = (score as any).groupRank || null
                                          
                                          return (
                                            <div key={score.id} className="flex flex-row-reverse items-center gap-2 sm:gap-3 w-full">
                                              <div className="relative">
                                                <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0" 
                                                     style={{ 
                                                       backgroundColor: '#10B98120',
                                                       borderColor: '#10B98140'
                                                     }}>
                                                  {avatarUrl ? (
                                                    <img 
                                                      src={avatarUrl} 
                                                      alt={playerName}
                                                      className="w-full h-full object-cover"
                                                      style={{
                                                        objectPosition: `${avatarPositionX}% ${avatarPositionY}%`
                                                      }}
                                                      onError={(e) => {
                                                        e.currentTarget.style.display = 'none'
                                                        const parent = e.currentTarget.parentElement
                                                        if (parent) {
                                                          parent.innerHTML = `<svg class="w-4 h-4 sm:w-5 sm:h-5" style="color: #10B981" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>`
                                                        }
                                                      }}
                                                    />
                                                  ) : (
                                                    <User className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#10B981' }} />
                                                  )}
                                                </div>
                                              </div>
                                              <div className="flex flex-col flex-1 text-right min-w-0">
                                                <div className={`text-sm sm:text-base font-medium ${isCurrentUser ? 'text-[#F15B98]' : 'text-gray-900'}`}>
                                                  {playerName}
                                                  {isCurrentUser && (
                                                    <span className="ml-2 text-xs text-[#F15B98] font-semibold">(我)</span>
                                                  )}
                                                  {score.is_guest && (
                                                    <span className="ml-2 text-xs text-gray-500">(访客)</span>
                                                  )}
                                                </div>
                                                <div className="text-xs sm:text-sm text-gray-600 mt-0.5">
                                                  {score.total_strokes}杆
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })()
                    )}
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
                <p className="text-gray-600">比赛结束后即可查看成绩</p>
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
                  className="mt-3 px-4 py-2 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80 transition-colors"
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
