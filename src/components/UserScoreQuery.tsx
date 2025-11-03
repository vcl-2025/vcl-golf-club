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
            event_type
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
            event_type
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
        <div className="w-8 h-8 border-4 border-golf-600 border-t-transparent rounded-full animate-spin"></div>
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
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2 sm:p-6 shadow-sm border border-gray-100">
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

        <div className="bg-white rounded-xl p-2 sm:p-6 shadow-sm border border-gray-100">
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

        <div className="bg-white rounded-xl p-2 sm:p-6 shadow-sm border border-gray-100">
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
      <div className="bg-white rounded-2xl shadow-sm px-1 sm:px-6 pt-2 pb-2 sm:pt-6 sm:pb-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6 px-1 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Trophy className="w-7 h-7 text-yellow-500 mr-3" />
            比赛成绩查询
          </h2>
        </div>

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
            
            return (
              <div
                key={group.event.id}
                className="bg-gray-50 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-lg transition-all border border-gray-100 hover:border-gray-200 mx-1 sm:mx-0"
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
                      {group.event.event_type && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          group.event.event_type === '团体赛' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {group.event.event_type === '团体赛' ? '团体赛' : '个人赛'}
                        </span>
                      )}
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {group.scores.length}人参赛
                      </span>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 折叠内容 - 所有参赛者成绩排名或团体赛结果 */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-2 sm:px-6 pb-4 bg-white rounded-b-2xl">
                    {/* 如果是团体赛，显示团体赛结果 */}
                    {group.event.event_type === '团体赛' && (() => {
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
                                          {score.is_guest ? (score.player_name || '未知访客') : (score.user_profiles?.full_name || '未知')}
                                          {score.is_guest && (
                                            <span className="ml-2 text-xs text-gray-500">(访客)</span>
                                          )}
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
                        if (teamEntries.length < 2) return
                        
                        if (teamEntries.length === 2) {
                          const [team1Name, team1Players] = teamEntries[0]
                          const [team2Name, team2Players] = teamEntries[1]
                          
                          let team1Wins = 0
                          let team2Wins = 0
                          
                          // 计算每洞胜负
                          for (let hole = 0; hole < 18; hole++) {
                            const team1Scores = team1Players.map(p => {
                              const score = p.holeScores[hole]
                              return score !== undefined && score !== null && !isNaN(score) ? Number(score) : Infinity
                            }).filter(s => s !== Infinity)
                            const team2Scores = team2Players.map(p => {
                              const score = p.holeScores[hole]
                              return score !== undefined && score !== null && !isNaN(score) ? Number(score) : Infinity
                            }).filter(s => s !== Infinity)
                            
                            const team1Best = team1Scores.length > 0 ? Math.min(...team1Scores) : Infinity
                            const team2Best = team2Scores.length > 0 ? Math.min(...team2Scores) : Infinity
                            
                            if (team1Best === Infinity && team2Best === Infinity) {
                              continue
                            }
                            if (team1Best === Infinity) {
                              team2Wins++
                            } else if (team2Best === Infinity) {
                              team1Wins++
                            } else if (team1Best < team2Best) {
                              team1Wins++
                            } else if (team2Best < team1Best) {
                              team2Wins++
                            }
                          }
                          
                          let winner: string | 'tie'
                          if (!totalScores.has(team1Name)) {
                            totalScores.set(team1Name, 0)
                          }
                          if (!totalScores.has(team2Name)) {
                            totalScores.set(team2Name, 0)
                          }
                          
                          if (team1Wins > team2Wins) {
                            winner = team1Name
                            totalScores.set(team1Name, (totalScores.get(team1Name) || 0) + 1)
                          } else if (team2Wins > team1Wins) {
                            winner = team2Name
                            totalScores.set(team2Name, (totalScores.get(team2Name) || 0) + 1)
                          } else {
                            winner = 'tie'
                            totalScores.set(team1Name, (totalScores.get(team1Name) || 0) + 0.5)
                            totalScores.set(team2Name, (totalScores.get(team2Name) || 0) + 0.5)
                          }
                          
                          groupDetails.push({
                            group: groupNumber,
                            teams: [
                              { teamName: team1Name, wins: team1Wins, playerCount: team1Players.length, players: team1Players },
                              { teamName: team2Name, wins: team2Wins, playerCount: team2Players.length, players: team2Players }
                            ],
                            winner
                          })
                        }
                      })
                      
                      // 按组号排序
                      groupDetails.sort((a, b) => a.group - b.group)
                      
                      // 找到红队和蓝队名称
                      const allTeamNames = Array.from(totalScores.keys())
                      
                      const checkIfRedName = (name: string) => {
                        const upper = name.toUpperCase().replace(/\*/g, '').replace(/\s/g, '')
                        return upper.includes('RED') || name.includes('红') || upper === 'RED'
                      }
                      
                      const checkIfBlueName = (name: string) => {
                        const upper = name.toUpperCase().replace(/\*/g, '').replace(/\s/g, '')
                        return upper.includes('BLUE') || name.includes('蓝') || upper === 'BLUE'
                      }
                      
                      const redTeamName = allTeamNames.find(checkIfRedName) || allTeamNames[0]
                      let blueTeamName = allTeamNames.find(name => {
                        if (name === redTeamName) return false
                        return checkIfBlueName(name) || !checkIfRedName(name)
                      })
                      if (!blueTeamName && allTeamNames.length > 1) {
                        blueTeamName = allTeamNames.find(name => name !== redTeamName) || allTeamNames[1]
                      }
                      const finalBlueTeamName = blueTeamName || (allTeamNames.length >= 2 ? allTeamNames[1] : undefined)
                      
                      return (
                        <div className="space-y-4 sm:space-y-6 mt-4">
                          <h4 className="text-base sm:text-lg font-semibold text-gray-900">团体赛结果</h4>
                          
                          {/* 总比分 */}
                          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
                            {redTeamName && (
                              <div className="flex items-center justify-between bg-white rounded-xl p-2 sm:p-5 border border-gray-200 w-full sm:min-w-[200px] gap-2 sm:gap-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-3 h-3 rounded bg-red-500"></div>
                                  <span className="font-medium text-gray-900">{redTeamName}</span>
                                </div>
                                <div className="bg-red-500 text-white rounded-lg px-4 sm:px-6 py-2 font-bold text-lg sm:text-xl flex-shrink-0">
                                  {(totalScores.get(redTeamName) ?? 0).toFixed(1)}
                                </div>
                              </div>
                            )}
                            {finalBlueTeamName && (
                              <div className="flex items-center justify-between bg-white rounded-xl p-2 sm:p-5 border border-gray-200 w-full sm:min-w-[200px] gap-2 sm:gap-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                                  <span className="font-medium text-gray-900">{finalBlueTeamName}</span>
                                </div>
                                <div className="bg-blue-500 text-white rounded-lg px-4 sm:px-6 py-2 font-bold text-lg sm:text-xl flex-shrink-0">
                                  {(totalScores.get(finalBlueTeamName) ?? 0).toFixed(1)}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* 各组详细结果 */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                            {groupDetails.map(group => {
                              const team1 = group.teams[0]
                              const team2 = group.teams[1]
                              
                              const checkIfRed = (teamName: string | undefined) => {
                                if (!teamName) return false
                                const upper = teamName.toUpperCase().replace(/\*/g, '').replace(/\s/g, '')
                                return upper.includes('RED') || teamName.includes('红') || upper === 'RED'
                              }
                              
                              const checkIfBlue = (teamName: string | undefined) => {
                                if (!teamName) return false
                                const upper = teamName.toUpperCase().replace(/\*/g, '').replace(/\s/g, '')
                                return upper.includes('BLUE') || teamName.includes('蓝') || upper === 'BLUE'
                              }
                              
                              let redTeam: typeof team1 | undefined
                              let blueTeam: typeof team2 | undefined
                              
                              if (checkIfRed(team1?.teamName)) {
                                redTeam = team1
                                blueTeam = team2
                              } else if (checkIfRed(team2?.teamName)) {
                                redTeam = team2
                                blueTeam = team1
                              } else if (checkIfBlue(team1?.teamName)) {
                                blueTeam = team1
                                redTeam = team2
                              } else if (checkIfBlue(team2?.teamName)) {
                                blueTeam = team2
                                redTeam = team1
                              } else {
                                redTeam = team1
                                blueTeam = team2
                              }
                              
                              const holeResults: Array<'team1' | 'team2' | 'tie'> = []
                              const team1Players = team1?.players || []
                              const team2Players = team2?.players || []
                              
                              for (let hole = 0; hole < 18; hole++) {
                                const team1Scores = team1Players.map(p => {
                                  const score = p.holeScores && p.holeScores[hole]
                                  return score !== undefined && score !== null && !isNaN(score) ? Number(score) : Infinity
                                }).filter(s => s !== Infinity)
                                
                                const team2Scores = team2Players.map(p => {
                                  const score = p.holeScores && p.holeScores[hole]
                                  return score !== undefined && score !== null && !isNaN(score) ? Number(score) : Infinity
                                }).filter(s => s !== Infinity)
                                
                                const team1Best = team1Scores.length > 0 ? Math.min(...team1Scores) : Infinity
                                const team2Best = team2Scores.length > 0 ? Math.min(...team2Scores) : Infinity
                                
                                if (team1Best === Infinity && team2Best === Infinity) {
                                  holeResults.push('tie')
                                } else if (team1Best === Infinity) {
                                  holeResults.push('team2')
                                } else if (team2Best === Infinity) {
                                  holeResults.push('team1')
                                } else if (team1Best < team2Best) {
                                  holeResults.push('team1')
                                } else if (team2Best < team1Best) {
                                  holeResults.push('team2')
                                } else {
                                  holeResults.push('tie')
                                }
                              }
                              
                              const redPlayers = redTeam?.players || []
                              const bluePlayers = blueTeam?.players || []
                              const isTeam1Red = redTeam === team1
                              
                              const redBlueResults: Array<'red' | 'blue' | 'tie'> = holeResults.map(result => {
                                if (result === 'tie') return 'tie'
                                if (isTeam1Red) {
                                  return result === 'team1' ? 'red' : 'blue'
                                } else {
                                  return result === 'team1' ? 'blue' : 'red'
                                }
                              })
                              
                              const redWins = redBlueResults.filter(r => r === 'red').length
                              const blueWins = redBlueResults.filter(r => r === 'blue').length
                              const ties = redBlueResults.filter(r => r === 'tie').length
                              
                              let groupScoreText = ''
                              const groupWinner = group.winner
                              if (groupWinner === redTeamName) {
                                groupScoreText = '1 - 0'
                              } else if (groupWinner === finalBlueTeamName) {
                                groupScoreText = '0 - 1'
                              } else {
                                groupScoreText = '0.5 - 0.5'
                              }
                              
                              const summaryText = `红赢${redWins}洞，蓝赢${blueWins}洞，平${ties}洞`
                              
                              return (
                                <div key={group.group} className="bg-white rounded-2xl p-2 sm:p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                                        <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-100">
                                    <div className="flex items-center justify-start flex-wrap gap-2">
                                      <span className="px-2 sm:px-3 py-1 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 border border-gray-200">
                                        第{group.group}组
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-start gap-2 sm:gap-4 mb-4 sm:mb-6">
                                    <div className="flex-1 relative">
                                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-400 to-red-600 rounded-full"></div>
                                      <div className="pl-3 sm:pl-4 space-y-2 sm:space-y-3">
                                        {redPlayers.map((player, idx) => (
                                          <div key={idx} className="flex items-center gap-2 sm:gap-3 group">
                                            <div className="relative">
                                              <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 shadow-sm flex items-center justify-center overflow-hidden">
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
                                                        parent.innerHTML = '<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>'
                                                      }
                                                    }}
                                                  />
                                                ) : (
                                                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex flex-col">
                                              <span className="text-sm sm:text-base text-gray-800 font-semibold">{player.name}</span>
                                              <span className="text-xs sm:text-sm text-gray-500 font-medium">{player.totalStrokes || 0}杆</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    
                                    {/* 比分显示在中间 - 小尺寸 */}
                                    <div className="flex flex-col items-center justify-center px-1 sm:px-3 flex-shrink-0">
                                      <div className="flex items-center gap-1 sm:gap-1.5 bg-gradient-to-r from-red-50 via-white to-blue-50 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-200">
                                        <span className="text-2xl sm:text-3xl font-bold text-red-600 tracking-tight">
                                          {groupScoreText.split(' - ')[0]}
                                        </span>
                                        <span className="text-gray-400 text-base sm:text-lg font-light">-</span>
                                        <span className="text-2xl sm:text-3xl font-bold text-blue-600 tracking-tight">
                                          {groupScoreText.split(' - ')[1]}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <div className="flex-1 relative">
                                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full"></div>
                                      <div className="pr-3 sm:pr-4 space-y-2 sm:space-y-3">
                                        {bluePlayers.map((player, idx) => (
                                          <div key={idx} className="flex items-center gap-2 sm:gap-3 group justify-end">
                                            <div className="flex flex-col items-end">
                                              <span className="text-sm sm:text-base text-gray-800 font-semibold">{player.name}</span>
                                              <span className="text-xs sm:text-sm text-gray-500 font-medium">{player.totalStrokes || 0}杆</span>
                                            </div>
                                            <div className="relative">
                                              <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 shadow-sm flex items-center justify-center overflow-hidden">
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
                                                        parent.innerHTML = '<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>'
                                                      }
                                                    }}
                                                  />
                                                ) : (
                                                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="bg-gradient-to-b from-gray-50 to-white rounded-xl p-2 sm:p-4 border border-gray-100">
                                    <div className="flex justify-center items-center gap-0.5 sm:gap-1 mb-2">
                                      {redBlueResults.map((result, idx) => (
                                        <div
                                          key={idx}
                                          className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-200 flex items-center justify-center flex-shrink-0 ${
                                            result === 'red' ? 'bg-red-500 shadow-md shadow-red-200' : 
                                            result === 'blue' ? 'bg-blue-500 shadow-md shadow-blue-200' :
                                            'bg-white border-2 border-gray-300 shadow-sm'
                                          }`}
                                          title={`洞${idx + 1}: ${result === 'red' ? '红队获胜' : result === 'blue' ? '蓝队获胜' : '平局'}`}
                                        >
                                          {result === 'tie' && (
                                            <div className="w-1 h-1 rounded-full bg-gray-500"></div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                    
                                    <div className="text-center pt-2 border-t border-gray-200">
                                      <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 bg-gradient-to-r from-red-50 to-blue-50 rounded-full text-xs sm:text-sm font-semibold text-gray-700 border border-gray-200">
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
                    })()}
                    
                    {/* 如果不是团体赛或没有团体赛数据，显示普通排名 */}
                    {group.event.event_type !== '团体赛' && (
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
