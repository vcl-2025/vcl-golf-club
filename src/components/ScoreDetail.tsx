import { X, Calendar, MapPin, Trophy, TrendingUp, User } from 'lucide-react'
import { useEffect, useState } from 'react'
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

interface ScoreDetailProps {
  score: Score
  onClose: () => void
}

export default function ScoreDetail({ score, onClose }: ScoreDetailProps) {
  const [userProfile, setUserProfile] = useState<any>(null)
  const [allScores, setAllScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserProfile()
    fetchUserScores()
  }, [score.user_id])

  const fetchUserProfile = async () => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', score.user_id)
        .maybeSingle()

      setUserProfile(data)
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }

  const fetchUserScores = async () => {
    try {
      const { data } = await supabase
        .from('scores')
        .select('*')
        .eq('user_id', score.user_id)
        .order('competition_date', { ascending: false })

      setAllScores(data || [])
    } catch (error) {
      console.error('获取成绩历史失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
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

  const calculateTrend = () => {
    if (allScores.length < 2) return null

    const recentScores = allScores.slice(0, 5).map(s => s.total_strokes)
    const trend = recentScores[0] - recentScores[recentScores.length - 1]

    return {
      improving: trend < 0,
      value: Math.abs(trend),
      avgScore: Math.round(recentScores.reduce((a, b) => a + b, 0) / recentScores.length)
    }
  }

  const trend = calculateTrend()

  const getRankBadgeColor = (rank: number | null) => {
    if (!rank) return 'bg-gray-100 text-gray-600'
    if (rank === 1) return 'bg-yellow-100 text-yellow-800'
    if (rank === 2) return 'bg-gray-200 text-gray-700'
    if (rank === 3) return 'bg-orange-100 text-orange-700'
    return 'bg-blue-100 text-blue-700'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">成绩详情</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-br from-[#F15B98] to-[#F15B98]/90 rounded-xl p-6 text-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold mb-2">{score.competition_name}</h3>
                <div className="flex items-center space-x-3 text-white/90">
                  <span className="px-3 py-1 bg-white bg-opacity-20 rounded-lg text-sm">
                    {getCompetitionTypeText(score.competition_type)}
                  </span>
                  <span className="text-sm">{score.holes_played}洞</span>
                </div>
              </div>
              {score.rank && (
                <div className="bg-white bg-opacity-20 rounded-xl px-4 py-3 text-center">
                  <Trophy className="w-8 h-8 mx-auto mb-1" />
                  <div className="text-2xl font-bold">#{score.rank}</div>
                  {score.total_participants && (
                    <div className="text-xs mt-1">共{score.total_participants}人</div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <div className="text-white/90 text-sm mb-1">总杆数</div>
                <div className="text-3xl font-bold">{score.total_strokes}</div>
              </div>

              {score.net_strokes && (
                <div className="bg-white bg-opacity-10 rounded-lg p-4">
                  <div className="text-white/90 text-sm mb-1">净杆数</div>
                  <div className="text-3xl font-bold">{score.net_strokes}</div>
                </div>
              )}

              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <div className="text-white/90 text-sm mb-1">差点</div>
                <div className="text-3xl font-bold">{score.handicap}</div>
              </div>

              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <div className="text-white/90 text-sm mb-1">洞数</div>
                <div className="text-3xl font-bold">{score.holes_played}</div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-golf-500" />
                比赛信息
              </h4>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">比赛日期</span>
                  <span className="font-medium text-gray-900">{formatDate(score.competition_date)}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">球场名称</span>
                  <span className="font-medium text-gray-900">{score.course_name}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">比赛类型</span>
                  <span className="font-medium text-gray-900">{getCompetitionTypeText(score.competition_type)}</span>
                </div>

                {score.rank && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">排名</span>
                    <span className={`px-3 py-1 rounded-lg font-medium ${getRankBadgeColor(score.rank)}`}>
                      第 {score.rank} 名
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-golf-500" />
                成绩分析
              </h4>

              {!loading && trend ? (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">近期趋势</span>
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        trend.improving ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {trend.improving ? '↓ 进步中' : '↑ 待提升'}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {trend.improving ? '-' : '+'}{trend.value} 杆
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      近5轮对比
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-gray-600 mb-2">近期平均杆数</div>
                    <div className="text-2xl font-bold text-gray-900">{trend.avgScore}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      基于最近5轮成绩
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-gray-600 mb-2">总参赛轮次</div>
                    <div className="text-2xl font-bold text-gray-900">{allScores.length}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      历史总记录
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>暂无足够数据进行趋势分析</p>
                </div>
              )}
            </div>
          </div>

          {score.notes && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">备注</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{score.notes}</p>
              </div>
            </div>
          )}

          {userProfile && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center space-x-3 text-sm text-gray-500">
                <User className="w-4 h-4" />
                <span>成绩归属: {userProfile.full_name || '未知'}</span>
                <span>•</span>
                <span>录入时间: {new Date(score.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full btn-primary"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
