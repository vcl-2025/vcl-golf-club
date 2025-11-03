import { useState, useEffect } from 'react'
import { Trophy, Calendar, MapPin, Filter, TrendingUp, Award } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Score {
  id: string
  user_id: string
  competition_name: string
  competition_type: string
  course_name: string
  competition_date: string
  total_strokes: number
  net_strokes: number | null
  handicap: number
  rank: number | null
  total_participants: number | null
  holes_played: number
  notes: string | null
  created_at: string
}

interface ScoreListProps {
  userId: string
  onScoreSelect: (score: Score) => void
}

export default function ScoreList({ userId, onScoreSelect }: ScoreListProps) {
  const [scores, setScores] = useState<Score[]>([])
  const [filteredScores, setFilteredScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [courseFilter, setCourseFilter] = useState<string>('all')
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [availableCourses, setAvailableCourses] = useState<string[]>([])
  const [availableTypes, setAvailableTypes] = useState<string[]>([])

  useEffect(() => {
    fetchScores()
  }, [userId])

  useEffect(() => {
    applyFilters()
  }, [scores, typeFilter, yearFilter, courseFilter])

  const fetchScores = async () => {
    try {
      const { data, error } = await supabase
        .from('scores')
        .select('*')
        .eq('user_id', userId)
        .order('competition_date', { ascending: false })

      if (error) throw error

      setScores(data || [])

      const years = [...new Set(
        (data || []).map(s => new Date(s.competition_date).getFullYear().toString())
      )].sort((a, b) => b.localeCompare(a))

      const courses = [...new Set((data || []).map(s => s.course_name))].sort()
      const types = [...new Set((data || []).map(s => s.competition_type))].sort()

      setAvailableYears(years)
      setAvailableCourses(courses)
      setAvailableTypes(types)
    } catch (error) {
      console.error('获取成绩列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...scores]

    if (typeFilter !== 'all') {
      filtered = filtered.filter(s => s.competition_type === typeFilter)
    }

    if (yearFilter !== 'all') {
      filtered = filtered.filter(s =>
        new Date(s.competition_date).getFullYear().toString() === yearFilter
      )
    }

    if (courseFilter !== 'all') {
      filtered = filtered.filter(s => s.course_name === courseFilter)
    }

    setFilteredScores(filtered)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getCompetitionTypeText = (type: string) => {
    const types: Record<string, string> = {
      'individual': '个人赛',
      'team': '团队赛',
      'monthly': '月例赛',
      'championship': '锦标赛',
      'friendly': '友谊赛'
    }
    return types[type] || type
  }

  const calculateStats = () => {
    if (filteredScores.length === 0) return null

    const totalRounds = filteredScores.length
    const avgStrokes = Math.round(
      filteredScores.reduce((sum, s) => sum + s.total_strokes, 0) / totalRounds
    )
    const bestScore = Math.min(...filteredScores.map(s => s.total_strokes))
    const topRanks = filteredScores.filter(s => s.rank && s.rank <= 3).length

    return { totalRounds, avgStrokes, bestScore, topRanks }
  }

  const stats = calculateStats()

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-[#F15B98] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="mb-2" style={{ backgroundColor: 'transparent' }}>
              <Trophy className="w-5 h-5 lg:w-7 lg:h-7 xl:w-8 xl:h-8 text-golf-500" style={{ fill: 'none', backgroundColor: 'transparent' }} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalRounds}</div>
            <div className="text-sm text-gray-600">总轮次</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="mb-2" style={{ backgroundColor: 'transparent' }}>
              <TrendingUp className="w-5 h-5 lg:w-7 lg:h-7 xl:w-8 xl:h-8 text-golf-500" style={{ fill: 'none', backgroundColor: 'transparent' }} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.avgStrokes}</div>
            <div className="text-sm text-gray-600">平均杆数</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="mb-2" style={{ backgroundColor: 'transparent' }}>
              <Award className="w-5 h-5 lg:w-7 lg:h-7 xl:w-8 xl:h-8 text-golf-500" style={{ fill: 'none', backgroundColor: 'transparent' }} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.bestScore}</div>
            <div className="text-sm text-gray-600">最佳成绩</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="mb-2" style={{ backgroundColor: 'transparent' }}>
              <Trophy className="w-5 h-5 lg:w-7 lg:h-7 xl:w-8 xl:h-8 text-golf-500" style={{ fill: 'none', backgroundColor: 'transparent' }} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.topRanks}</div>
            <div className="text-sm text-gray-600">前三名次</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center mb-4">
          <Filter className="w-5 h-5 text-[#F15B98] mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">筛选条件</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              比赛类型
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">全部类型</option>
              {availableTypes.map(type => (
                <option key={type} value={type}>{getCompetitionTypeText(type)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              年份
            </label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">全部年份</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}年</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              球场
            </label>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">全部球场</option>
              {availableCourses.map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          共找到 {filteredScores.length} 条成绩记录
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {filteredScores.map((score) => (
          <div
            key={score.id}
            onClick={() => onScoreSelect(score)}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer p-3 sm:p-6"
          >
            {/* 移动端紧凑布局 */}
            <div className="block sm:hidden">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold text-gray-900 truncate flex-1 mr-2">
                  {score.competition_name}
                </h3>
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <div className="text-xl font-bold text-[#F15B98]">{score.total_strokes}杆</div>
                    {score.rank && (
                      <div className="flex items-center justify-end mt-1">
                        <Trophy className={`w-4 h-4 mr-1 ${
                          score.rank === 1 ? 'text-yellow-500' :
                          score.rank === 2 ? 'text-gray-400' :
                          score.rank === 3 ? 'text-orange-600' :
                          'text-gray-300'
                        }`} />
                        <span className="text-sm font-bold text-gray-900">
                          #{score.rank}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center space-x-3">
                  <span className="inline-flex items-center px-2 py-1 bg-[#F15B98]/20 text-[#F15B98] rounded">
                    {getCompetitionTypeText(score.competition_type)}
                  </span>
                  <span className="inline-flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(score.competition_date)}
                  </span>
                </div>
                <div className="text-right">
                  {score.total_participants && (
                    <span className="text-gray-500">{score.total_participants}人参赛</span>
                  )}
                </div>
              </div>
            </div>

            {/* 桌面端完整布局 */}
            <div className="hidden sm:block">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {score.competition_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                        <span className="inline-flex items-center px-2 py-1 bg-[#F15B98]/20 text-[#F15B98] rounded-lg">
                          {getCompetitionTypeText(score.competition_type)}
                        </span>
                        <span className="inline-flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(score.competition_date)}
                        </span>
                        <span className="inline-flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {score.course_name}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#F15B98]">{score.total_strokes}</div>
                    <div className="text-xs text-gray-500 mt-1">总杆数</div>
                  </div>

                  {score.net_strokes && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#F15B98]">{score.net_strokes}</div>
                      <div className="text-xs text-gray-500 mt-1">净杆数</div>
                    </div>
                  )}

                  {score.rank && (
                    <div className="text-center">
                      <div className="flex items-center">
                        <Trophy className={`w-6 h-6 mr-1 ${
                          score.rank === 1 ? 'text-yellow-500' :
                          score.rank === 2 ? 'text-gray-400' :
                          score.rank === 3 ? 'text-orange-600' :
                          'text-gray-300'
                        }`} />
                        <span className="text-2xl font-bold text-gray-900">
                          #{score.rank}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {score.total_participants && `共${score.total_participants}人`}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredScores.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无成绩记录</h3>
          <p className="text-gray-500">当前筛选条件下没有找到成绩记录</p>
        </div>
      )}
    </div>
  )
}
