import { useState, useEffect } from 'react'
import { X, Save, AlertCircle, Upload, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useModal } from './ModalProvider'
import { getEventStatus, getEventStatusText, getEventStatusStyles, canEnterScores } from '../utils/eventStatus'

interface ScoreFormProps {
  onClose: () => void
  onSuccess: () => void
  preselectedEvent?: any
  preselectedScore?: any
}

interface EventParticipant {
  id: string
  user_id: string
  user_profiles: {
    full_name: string
    email: string
  }
  registration_number: string
}

interface ScoreData {
  total_strokes: string
  net_strokes: string
  handicap: string
  rank: string
  notes: string
}

export default function ScoreForm({ onClose, onSuccess, preselectedEvent, preselectedScore }: ScoreFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [events, setEvents] = useState<any[]>([])
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [participants, setParticipants] = useState<EventParticipant[]>([])
  const { showSuccess, showError } = useModal()
  const [selectedParticipant, setSelectedParticipant] = useState<EventParticipant | null>(null)
  const [savedParticipants, setSavedParticipants] = useState<Set<string>>(new Set())
  const [eventScoreStats, setEventScoreStats] = useState<Record<string, { total: number, entered: number }>>({})

  const [scoreData, setScoreData] = useState<ScoreData>({
    total_strokes: '',
    net_strokes: '',
    handicap: '0',
    rank: '',
    notes: ''
  })

  useEffect(() => {
    if (preselectedEvent) {
      setSelectedEvent(preselectedEvent)
    } else {
      fetchEvents()
    }
  }, [preselectedEvent])

  useEffect(() => {
    if (selectedEvent) {
      fetchParticipants(selectedEvent.id)
      checkExistingScores(selectedEvent.id)
    }
  }, [selectedEvent])

  // 如果有预选的成绩记录，自动选择对应的用户
  useEffect(() => {
    if (preselectedScore && participants.length > 0) {
      const targetParticipant = participants.find(p => p.user_id === preselectedScore.user_id)
      if (targetParticipant) {
        handleParticipantSelect(targetParticipant)
      }
    }
  }, [preselectedScore, participants])

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: false })

      if (error) throw error
      
      // 过滤出可以录入成绩的活动（进行中或已完成）
      const scoreableEvents = (data || []).filter(event => canEnterScores(event))
      setEvents(scoreableEvents)
      
      // 获取每个活动的成绩录入统计
      const stats: Record<string, { total: number, entered: number }> = {}
      for (const event of scoreableEvents) {
        // 获取该活动的报名人数
        const { data: registrations } = await supabase
          .from('event_registrations')
          .select('id')
          .eq('event_id', event.id)
          .eq('payment_status', 'paid')
        
        // 获取已录入成绩的人数
        const { data: scores } = await supabase
          .from('scores')
          .select('user_id')
          .eq('event_id', event.id)
        
        const uniqueScores = new Set(scores?.map(s => s.user_id) || [])
        
        stats[event.id] = {
          total: registrations?.length || 0,
          entered: uniqueScores.size
        }
      }
      setEventScoreStats(stats)
    } catch (error) {
      console.error('获取活动列表失败:', error)
    }
  }

  const fetchParticipants = async (eventId: string) => {
    try {
      // 先获取报名记录
      const { data: registrations, error: regError } = await supabase
        .from('event_registrations')
        .select('id, user_id')
        .eq('event_id', eventId)
        .eq('payment_status', 'paid')

      if (regError) throw regError

      if (!registrations || registrations.length === 0) {
        setParticipants([])
        setError('') // 清除错误状态
        return
      }

      // 获取用户信息
      const userIds = registrations.map(r => r.user_id)
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', userIds)

      if (profileError) throw profileError

      // 合并数据
      const participants = registrations.map((reg, index) => {
        const profile = profiles?.find(p => p.id === reg.user_id)
        return {
          id: reg.id,
          user_id: reg.user_id,
          registration_number: `M${String(index + 1).padStart(3, '0')}`, // 使用序号作为编号
          user_profiles: profile || { full_name: 'Unknown' }
        }
      })

      setParticipants(participants)
      setError('') // 清除错误状态
    } catch (error) {
      console.error('获取报名人员失败:', error)
      setError('无法加载报名人员')
    }
  }

  const checkExistingScores = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('scores')
        .select('user_id')
        .eq('event_id', eventId)

      if (error) throw error

      const saved = new Set((data || []).map(s => s.user_id))
      setSavedParticipants(saved)
    } catch (error) {
      console.error('检查已保存成绩失败:', error)
    }
  }

  const handleParticipantSelect = async (participant: EventParticipant) => {
    setSelectedParticipant(participant)
    
    // 自动滚动到选中的队员
    setTimeout(() => {
      const element = document.querySelector(`[data-participant-id="${participant.id}"]`)
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
      }
    }, 100)
    
    // 检查是否已录入过成绩
    if (savedParticipants.has(participant.user_id)) {
      try {
        // 获取已保存的成绩数据
        const { data: existingScore, error } = await supabase
          .from('scores')
          .select('*')
          .eq('user_id', participant.user_id)
          .eq('event_id', selectedEvent?.id || '')
          .single()

        if (error) {
          console.error('获取已保存成绩失败:', error)
          // 如果获取失败，显示空白表单
          setScoreData({
            total_strokes: '',
            net_strokes: '',
            handicap: '0',
            rank: '',
            notes: ''
          })
        } else {
          // 加载已保存的数据
          setScoreData({
            total_strokes: existingScore.total_strokes?.toString() || '',
            net_strokes: existingScore.net_strokes?.toString() || '',
            handicap: existingScore.handicap?.toString() || '0',
            rank: existingScore.rank?.toString() || '',
            notes: existingScore.notes || ''
          })
        }
      } catch (error) {
        console.error('获取已保存成绩失败:', error)
        setScoreData({
          total_strokes: '',
          net_strokes: '',
          handicap: '0',
          rank: '',
          notes: ''
        })
      }
    } else {
      // 新用户，显示空白表单
      setScoreData({
        total_strokes: '',
        net_strokes: '',
        handicap: '0',
        rank: '',
        notes: ''
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEvent || !selectedParticipant) return

    setError('')
    setLoading(true)

    try {
      if (!scoreData.total_strokes) {
        throw new Error('请填写总杆数')
      }

      const insertData = {
        user_id: selectedParticipant.user_id,
        event_id: selectedEvent.id,
        total_strokes: parseInt(scoreData.total_strokes),
        net_strokes: scoreData.net_strokes ? parseInt(scoreData.net_strokes) : null,
        handicap: parseInt(scoreData.handicap),
        rank: scoreData.rank ? parseInt(scoreData.rank) : null,
        notes: scoreData.notes || null
      }

      // 添加调试信息
      // console.log('🏌️ 准备保存成绩数据:', {
      //   user_id: selectedParticipant.user_id,
      //   event_id: selectedEvent.id,
      //   total_strokes: insertData.total_strokes,
      //   net_strokes: insertData.net_strokes,
      //   handicap: insertData.handicap,
      //   rank: insertData.rank,
      //   notes: insertData.notes
      // })

      // 检查是否已存在记录
      const { data: existingScore } = await supabase
        .from('scores')
        .select('id')
        .eq('user_id', selectedParticipant.user_id)
        .eq('event_id', selectedEvent.id)
        .single()

      let error
      if (existingScore) {
        // 更新已存在的记录
        const { error: updateError } = await supabase
          .from('scores')
          .update(insertData)
          .eq('id', existingScore.id)
        error = updateError
      } else {
        // 插入新记录
        const { error: insertError } = await supabase
          .from('scores')
          .insert([insertData])
        error = insertError
      }

      if (error) {
        console.error('❌ 数据库操作失败:', error)
        throw error
      }

      // console.log('✅ 成绩保存成功')
      setSavedParticipants(new Set([...savedParticipants, selectedParticipant.user_id]))

      showSuccess(existingScore ? '成绩更新成功' : '成绩保存成功')
      
      // 刷新活动统计信息
      fetchEvents()
      
      // 延迟重置表单，让用户看到成功提示
      setTimeout(() => {
        setScoreData({
          total_strokes: '',
          net_strokes: '',
          handicap: '0',
          rank: '',
          notes: ''
        })
        setSelectedParticipant(null)
      }, 1500)
    } catch (err: any) {
      console.error('❌ 保存成绩失败:', err)
      setError(err.message || '保存失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = () => {
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">批量录入成绩</h2>
            <p className="text-sm text-gray-600 mt-1">选择比赛活动，然后为每位参赛者录入成绩</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
              disabled
              title="批量导入功能即将推出"
            >
              <Upload className="w-4 h-4 mr-2" />
              批量导入
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!selectedEvent ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">选择比赛活动</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map(event => {
                  const stats = eventScoreStats[event.id] || { total: 0, entered: 0 }
                  const isCompleted = stats.entered === stats.total && stats.total > 0
                  
                  return (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-golf-600 cursor-pointer transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 flex-1">{event.title}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getEventStatusStyles(getEventStatus(event))}`}>
                          {getEventStatusText(getEventStatus(event))}
                        </span>
                      </div>
                      
                      {/* 成绩录入进度 */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">成绩录入进度</span>
                          <span className={`font-medium ${
                            isCompleted ? 'text-green-600' : 
                            stats.entered > 0 ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {stats.entered}/{stats.total} 已录入
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              isCompleted ? 'bg-green-500' : 
                              stats.entered > 0 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: stats.total > 0 ? `${(stats.entered / stats.total) * 100}%` : '0%' }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>地点: {event.location}</div>
                        <div>日期: {new Date(event.start_time).toLocaleDateString('zh-CN')}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {events.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  暂无可录入成绩的活动
                </div>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6 h-full">
              <div className="md:col-span-1 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">参赛人员</h3>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="text-sm text-golf-600 hover:text-golf-700"
                  >
                    更换活动
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="text-sm font-medium text-gray-900">{selectedEvent.title}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    共 {participants.length} 人报名 | 已录入 {savedParticipants.size} 人
                  </div>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {participants.map(participant => (
                    <div
                      key={participant.id}
                      data-participant-id={participant.id}
                      onClick={() => handleParticipantSelect(participant)}
                      className={`border rounded-lg p-3 cursor-pointer transition-all ${
                        selectedParticipant?.id === participant.id
                          ? 'border-golf-600 bg-golf-100 shadow-md'
                          : savedParticipants.has(participant.user_id)
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`font-medium ${
                            selectedParticipant?.id === participant.id
                              ? 'text-golf-800'
                              : savedParticipants.has(participant.user_id) 
                              ? 'text-green-800' 
                              : 'text-gray-900'
                          }`}>
                            {participant.user_profiles?.full_name || '未知'}
                            {selectedParticipant?.id === participant.id && (
                              <span className="ml-2 text-xs text-golf-600 font-semibold">● 当前选择</span>
                            )}
                            {savedParticipants.has(participant.user_id) && selectedParticipant?.id !== participant.id && (
                              <span className="ml-2 text-xs text-green-600">✓ 已录入</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            #{participant.registration_number}
                          </div>
                        </div>
                        {savedParticipants.has(participant.user_id) && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {participants.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    该活动暂无已支付的报名人员
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                {selectedParticipant ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {selectedParticipant.user_profiles?.full_name || '未知'}
                      </h3>
                      <div className="text-sm text-gray-600">
                        {selectedParticipant.user_profiles?.email}
                      </div>
                    </div>

                    {error && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                        <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-red-700 text-sm">{error}</span>
                      </div>
                    )}

                    {/* 主要成绩信息 */}
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          总杆数 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={scoreData.total_strokes}
                          onChange={(e) => setScoreData({ ...scoreData, total_strokes: e.target.value })}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="input-field"
                          min="1"
                          max="200"
                          step="1"
                          placeholder="例如：72"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          净杆数
                        </label>
                        <input
                          type="number"
                          value={scoreData.net_strokes}
                          onChange={(e) => setScoreData({ ...scoreData, net_strokes: e.target.value })}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="input-field"
                          min="1"
                          max="200"
                          step="1"
                          placeholder="可选"
                        />
                      </div>
                    </div>

                    {/* 辅助信息 */}
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          差点
                        </label>
                        <input
                          type="number"
                          value={scoreData.handicap}
                          onChange={(e) => setScoreData({ ...scoreData, handicap: e.target.value })}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="input-field"
                          min="0"
                          max="54"
                          step="1"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          排名
                        </label>
                        <input
                          type="number"
                          value={scoreData.rank}
                          onChange={(e) => setScoreData({ ...scoreData, rank: e.target.value })}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="input-field"
                          min="1"
                          max="1000"
                          step="1"
                          placeholder="可选"
                        />
                      </div>
                    </div>

                    {/* 备注信息 */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        备注
                      </label>
                      <textarea
                        value={scoreData.notes}
                        onChange={(e) => setScoreData({ ...scoreData, notes: e.target.value })}
                        className="input-field resize-none"
                        rows={3}
                        placeholder="记录比赛情况、天气等..."
                      />
                    </div>

                    <div className="flex justify-end space-x-4">
                      <button
                        type="submit"
                        className="btn-primary flex items-center"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            保存中...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            保存并继续
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <div className="text-lg mb-2">请在左侧选择参赛者</div>
                      <div className="text-sm">点击参赛者名称开始录入成绩</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {selectedEvent && (
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                进度: {savedParticipants.size} / {participants.length} 人已录入
              </div>
              <button
                onClick={handleFinish}
                className="btn-primary"
              >
                完成录入
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
