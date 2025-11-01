import { useState, useEffect, useRef } from 'react'
import { X, Save, AlertCircle, Upload, CheckCircle, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useModal } from './ModalProvider'
import { getEventStatus, getEventStatusText, getEventStatusStyles, canEnterScores } from '../utils/eventStatus'
import * as XLSX from 'xlsx'

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
  total_strokes?: number
  rank?: number
}

interface ScoreData {
  total_strokes: string
  net_strokes: string
  handicap: string
  rank: string
  notes: string
  hole_scores?: number[]
  group_number?: number | null
  team_name?: string | null
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

  // 批量导入相关状态
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: number
    failed: number
    errors: string[]
    teamStats?: {
      totalScores: Array<{ teamName: string; score: number }>
      details: Array<{
        group: number
        winner: string | 'tie'
        teams: Array<{ teamName: string; wins: number; playerCount: number }>
      }>
    }
  } | null>(null)

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

      // 获取成绩数据
      const { data: scores, error: scoresError } = await supabase
        .from('scores')
        .select('user_id, total_strokes, rank')
        .eq('event_id', eventId)

      if (scoresError) console.error('获取成绩数据失败:', scoresError)
      
      // 创建成绩映射
      const scoreMap = new Map()
      if (scores) {
        scores.forEach((score: any) => {
          scoreMap.set(score.user_id, score)
        })
      }

      // 合并数据
      const participants = registrations.map((reg, index) => {
        const profile = profiles?.find(p => p.id === reg.user_id)
        const score = scoreMap.get(reg.user_id)
        return {
          id: reg.id,
          user_id: reg.user_id,
          registration_number: `M${String(index + 1).padStart(3, '0')}`, // 使用序号作为编号
          user_profiles: profile || { full_name: 'Unknown' },
          total_strokes: score?.total_strokes,
          rank: score?.rank
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
            notes: '',
            hole_scores: undefined,
            group_number: null,
            team_name: null
          })
        } else {
          // 加载已保存的数据
          // 处理hole_scores：如果是字符串数组，转换为数字数组
          let holeScores = existingScore.hole_scores
          if (Array.isArray(holeScores) && holeScores.length > 0) {
            if (typeof holeScores[0] === 'string') {
              holeScores = holeScores.map(s => parseInt(String(s), 10) || 0)
            }
          } else if (!holeScores) {
            holeScores = Array(18).fill(0) // 如果没有数据，初始化为18个0
          }
          
          setScoreData({
            total_strokes: existingScore.total_strokes?.toString() || '',
            net_strokes: existingScore.net_strokes?.toString() || '',
            handicap: existingScore.handicap?.toString() || '0',
            rank: existingScore.rank?.toString() || '',
            notes: existingScore.notes || '',
            hole_scores: holeScores,
            group_number: existingScore.group_number || null,
            team_name: existingScore.team_name || null
          })
        }
      } catch (error) {
        console.error('获取已保存成绩失败:', error)
        setScoreData({
          total_strokes: '',
          net_strokes: '',
          handicap: '0',
          rank: '',
          notes: '',
          hole_scores: undefined,
          group_number: null,
          team_name: null
        })
      }
    } else {
      // 新用户，显示空白表单（初始化18洞成绩为0）
      setScoreData({
        total_strokes: '',
        net_strokes: '',
        handicap: '0',
        rank: '',
        notes: '',
        hole_scores: Array(18).fill(0),
        group_number: null,
        team_name: null
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
        notes: scoreData.notes || null,
        hole_scores: scoreData.hole_scores && scoreData.hole_scores.length === 18 
          ? scoreData.hole_scores.filter(s => s > 0).length > 0 ? scoreData.hole_scores : null 
          : null,
        group_number: scoreData.group_number || null,
        team_name: scoreData.team_name || null
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

      // 立即更新左侧列表中的成绩信息
      setParticipants(prevParticipants => 
        prevParticipants.map(participant => 
          participant.user_id === selectedParticipant.user_id
            ? {
                ...participant,
                total_strokes: insertData.total_strokes,
                rank: insertData.rank
              }
            : participant
        )
      )

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

  // 团体赛结果显示状态
  const [showTeamCompetitionResult, setShowTeamCompetitionResult] = useState(false)
  const [teamCompetitionData, setTeamCompetitionData] = useState<any>(null)

  const handleFinish = async () => {
    if (!selectedEvent) {
      onSuccess()
      onClose()
      return
    }

    // 检查活动类型
    if (selectedEvent.event_type === '团体赛') {
      // 获取所有成绩数据并计算团队对抗统计
      try {
        const { data: allScoresData, error: scoresError } = await supabase
          .from('scores')
          .select(`
            id,
            user_id,
            event_id,
            hole_scores,
            group_number,
            team_name,
            user_profiles!inner(full_name)
          `)
          .eq('event_id', selectedEvent.id)
          .not('group_number', 'is', null)
          .not('team_name', 'is', null)
          .not('hole_scores', 'is', null)

        if (scoresError) {
          console.error('获取成绩数据失败:', scoresError)
          showError('获取成绩数据失败')
          return
        }

        // 转换为团队统计所需格式
        const dbPlayers = (allScoresData || []).map(score => {
          let holeScores = score.hole_scores || []
          if (Array.isArray(holeScores) && holeScores.length > 0) {
            if (typeof holeScores[0] === 'string') {
              holeScores = holeScores.map(s => parseInt(String(s), 10) || 0)
            }
          }
          
          return {
            name: (score.user_profiles as any)?.full_name || '未知',
            holeScores: holeScores,
            groupNumber: score.group_number,
            teamName: score.team_name
          }
        })

        // 计算团队对抗统计
        const teamStats = calculateTeamStats(dbPlayers)

        // 获取每个组的详细球员信息
        const groupsData = new Map<number, {
          redPlayers: Array<{ name: string; holeScores: number[] }>
          bluePlayers: Array<{ name: string; holeScores: number[] }>
        }>()

        dbPlayers.forEach(player => {
          if (!player.groupNumber || !player.teamName) return
          
          const group = player.groupNumber
          const teamName = player.teamName.trim()
          const isRed = teamName.toUpperCase().includes('RED') || teamName.includes('红') || teamName.toLowerCase() === 'red'
          
          if (!groupsData.has(group)) {
            groupsData.set(group, { redPlayers: [], bluePlayers: [] })
          }

          const groupData = groupsData.get(group)!
          if (isRed) {
            groupData.redPlayers.push({ name: player.name, holeScores: player.holeScores })
          } else {
            groupData.bluePlayers.push({ name: player.name, holeScores: player.holeScores })
          }
        })

        // 计算每组的胜负情况
        const groupDetails = teamStats.details.map(detail => {
          const groupData = groupsData.get(detail.group)
          return {
            ...detail,
            redPlayers: groupData?.redPlayers || [],
            bluePlayers: groupData?.bluePlayers || []
          }
        })

        // 不再显示弹窗，直接关闭
        onSuccess()
        onClose()
      } catch (error: any) {
        console.error('计算团队对抗统计失败:', error)
        showError('计算团队对抗统计失败')
        // 即使计算失败，也关闭表单
        onSuccess()
        onClose()
      }
    } else {
      // 个人赛，保持原有功能
      onSuccess()
      onClose()
    }
  }

  // Excel/CSV解析和导入
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!selectedEvent) {
      showError('请先选择比赛活动')
      return
    }

    setIsImporting(true)
    setImportResult(null)

    try {
      let lines: string[] = []
      const fileName = file.name.toLowerCase()
      
      // 判断文件类型
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Excel文件处理
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        
        // 读取第一个工作表
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
        // 转换为JSON数组
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][]
        
        // 转换为CSV格式的字符串数组（每行用逗号连接）
        lines = jsonData.map(row => {
          // 处理每行的单元格，处理特殊字符和逗号
          return row.map((cell: any) => {
            if (cell === null || cell === undefined) return ''
            const str = String(cell)
            // 如果包含逗号或引号，需要用引号包裹
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`
            }
            return str
          }).join(',')
        })
      } else {
        // CSV/TXT文件处理
        const text = await file.text()
        lines = text.split('\n').filter(line => line.trim())
      }
      
      if (lines.length === 0) {
        throw new Error('Excel/CSV文件为空')
      }

      // 尝试找到PAR行和数据开始行
      let dataStartIndex = -1
      let parLine: string[] | null = null
      let parValues: number[] = []

      // 首先尝试查找包含"HOLE"的标准格式（可能在同一行或不同行）
      let headerRowIndex = -1
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toUpperCase()
        const cols = parseCSVLine(lines[i])
        // 检查第一列是否是HOLE或者包含HOLE关键词
        if (cols[0]?.toUpperCase().includes('HOLE') || line.includes('HOLE')) {
          headerRowIndex = i
          // 下一行可能是PAR行
          if (i + 1 < lines.length) {
            const nextCols = parseCSVLine(lines[i + 1])
            if (nextCols[0]?.toUpperCase().trim() === 'PAR') {
              parLine = nextCols
              dataStartIndex = i + 2 // PAR行之后开始数据
            } else {
              dataStartIndex = i + 1 // 没有PAR行，表头行之后就是数据
            }
          } else {
            dataStartIndex = i + 1
          }
          break
        }
      }

      // 如果没有找到HOLE行，尝试查找第一列是"PAR"的行
      if (dataStartIndex === -1) {
        for (let i = 0; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i])
          if (cols[0]?.toUpperCase().trim() === 'PAR') {
            parLine = cols
            dataStartIndex = i + 1
            break
          }
        }
      }

      // 如果还是没找到，尝试识别表头（第一列是数字1-18，或者包含"总杆"、"净杆"等关键词）
      if (dataStartIndex === -1) {
        for (let i = 0; i < Math.min(5, lines.length); i++) {
          const cols = parseCSVLine(lines[i])
          // 检查是否有足够的列，并且包含成绩相关的列
          if (cols.length >= 20) {
            const hasScoreKeywords = cols.some((col: string) => {
              const upper = col.toUpperCase()
              return upper.includes('总杆') || upper.includes('净杆') || upper.includes('分组') || 
                     upper.includes('团体') || upper.includes('总差') || upper.includes('前9') || upper.includes('后9')
            })
            // 或者前几列是数字（可能是HOLE编号）
            const hasNumericColumns = !isNaN(parseInt(cols[1] || '')) && !isNaN(parseInt(cols[2] || ''))
            
            if (hasScoreKeywords || hasNumericColumns) {
              headerRowIndex = i
              // 检查下一行是否是PAR行
              if (i + 1 < lines.length) {
                const nextCols = parseCSVLine(lines[i + 1])
                if (nextCols[0]?.toUpperCase().trim() === 'PAR') {
                  parLine = nextCols
                  dataStartIndex = i + 2
                } else {
                  dataStartIndex = i + 1
                }
              } else {
                dataStartIndex = i + 1
              }
              break
            }
          }
        }
      }

      // 如果还是没找到，假设第一行是表头，第二行开始是数据
      if (dataStartIndex === -1) {
        dataStartIndex = 1
      }

      // 解析PAR行（如果有）
      if (parLine) {
        // PAR值：列1-9是HOLE 1-9，列10是"前9"，列11-18是HOLE 10-18
        for (let i = 1; i <= 9; i++) {
          const parVal = parseInt(parLine[i]?.trim() || '0') || 0
          if (parVal > 0) parValues.push(parVal)
        }
        for (let i = 11; i <= 18; i++) {
          const parVal = parseInt(parLine[i]?.trim() || '0') || 0
          if (parVal > 0) parValues.push(parVal)
        }
      }

      // 如果没有PAR值或PAR值不足18个，使用默认PAR值
      if (parValues.length < 18) {
        parValues = [4, 3, 4, 3, 5, 4, 4, 5, 3, 4, 4, 4, 3, 4, 3, 5, 3, 5]
      }

      if (dataStartIndex === -1 || dataStartIndex >= lines.length) {
        throw new Error('无法识别Excel/CSV数据起始位置。请确保文件包含表头行（HOLE列）和球员数据行，或者联系管理员检查文件格式')
      }

      // 首先解析表头，找到各列的实际位置
      let colIndexTotalDifference = -1  // 总差
      let colIndexTotalStrokes = -1     // 总杆
      let colIndexNetStrokes = -1       // 净杆
      let colIndexGroup = -1            // 分组
      let colIndexTeam = -1             // 团体对抗
      let colIndexHoleStart = -1        // HOLE 1的起始位置

      // 从表头行找到列位置（HOLE行）
      if (dataStartIndex > 1) {
        const headerLine = lines[dataStartIndex - 2] // HOLE行应该在PAR行之前
        if (headerLine) {
          const headerCols = parseCSVLine(headerLine)
          console.log(`[解析] 表头行数据:`, headerCols)
          
          headerCols.forEach((col, idx) => {
            const upper = col.toUpperCase().trim()
            if (upper === 'HOLE' || upper.includes('HOLE')) {
              colIndexHoleStart = idx + 1 // HOLE列的下一列是洞1
            } else if (upper.includes('总差') || upper.includes('DIFFERENCE')) {
              colIndexTotalDifference = idx
            } else if (upper.includes('总杆') || upper.includes('TOTAL') || upper.includes('STROKES')) {
              colIndexTotalStrokes = idx
            } else if (upper.includes('净杆') || upper.includes('NET')) {
              colIndexNetStrokes = idx
            } else if (upper.includes('分组') || upper.includes('GROUP')) {
              colIndexGroup = idx
            } else if (upper.includes('团体') || upper.includes('TEAM') || upper.includes('对抗')) {
              colIndexTeam = idx
            }
          })
        }
      }

      console.log(`[解析] 表头列索引映射:`, {
        colIndexHoleStart,
        colIndexTotalDifference,
        colIndexTotalStrokes,
        colIndexNetStrokes,
        colIndexGroup,
        colIndexTeam
      })

      // 如果没找到，使用默认索引
      if (colIndexTotalDifference === -1) colIndexTotalDifference = 20
      if (colIndexTotalStrokes === -1) colIndexTotalStrokes = 21
      if (colIndexNetStrokes === -1) colIndexNetStrokes = 22
      if (colIndexGroup === -1) colIndexGroup = 23
      if (colIndexTeam === -1) colIndexTeam = 24
      if (colIndexHoleStart === -1) colIndexHoleStart = 1

      // 解析数据
      const players: Array<{
        name: string
        holeScores: number[] // 相对PAR的差值
        actualStrokes: number[] // 实际杆数
        totalStrokes: number
        netStrokes: number | null
        groupNumber: number | null
        teamName: string | null
      }> = []

      for (let i = dataStartIndex; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line || line.startsWith('"') && line.includes('日期')) continue // 跳过底部信息行
        
        const cols = parseCSVLine(line)
        if (cols.length < Math.max(colIndexTeam, colIndexGroup, colIndexNetStrokes) + 1) {
          console.warn(`[解析] 列数不足，跳过: ${cols.length}列`)
          continue
        }

        const name = cols[0]?.trim()
        if (!name || name === 'HOLE' || name === 'PAR') continue

        // 解析每洞成绩
        console.log(`[解析] 球员 ${name} 的完整列数据 (共${cols.length}列):`, cols)
        
        console.log(`[解析] ${name} - 关键列索引和值:`, {
          姓名索引0: cols[0],
          总差索引: colIndexTotalDifference,
          总差值: cols[colIndexTotalDifference],
          总杆索引: colIndexTotalStrokes,
          总杆值: cols[colIndexTotalStrokes],
          净杆索引: colIndexNetStrokes,
          净杆值: cols[colIndexNetStrokes],
          分组索引: colIndexGroup,
          分组值: cols[colIndexGroup],
          团体索引: colIndexTeam,
          团体值: cols[colIndexTeam]
        })
        
        const holeScores: number[] = []
        const actualStrokes: number[] = []
        
        // HOLE 1-9 (从colIndexHoleStart开始，共9列)
        for (let h = 0; h < 9; h++) {
          const colIdx = colIndexHoleStart + h
          const scoreStr = cols[colIdx]?.trim() || '0'
          let diff = 0
          if (scoreStr.startsWith('+')) {
            diff = parseInt(scoreStr.substring(1)) || 0
          } else if (scoreStr.startsWith('-')) {
            diff = parseInt(scoreStr) || 0
          } else {
            diff = parseInt(scoreStr) || 0
          }
          holeScores.push(diff)
          if (parValues[h]) {
            actualStrokes.push(parValues[h] + diff)
          }
        }
        
        // HOLE 10-18 (跳过"前9"列，继续往后9列)
        // 需要找到"前9"列之后的位置
        let hole10Start = colIndexHoleStart + 10 // 默认：HOLE 1-9 (9列) + "前9"(1列) = 索引+10
        // 尝试查找"前9"或"10"的位置
        if (dataStartIndex > 1) {
          const headerCols = parseCSVLine(lines[dataStartIndex - 2])
          for (let idx = colIndexHoleStart + 9; idx < headerCols.length; idx++) {
            const headerVal = headerCols[idx]?.toUpperCase().trim()
            if (headerVal === '10' || headerVal.includes('前9')) {
              hole10Start = idx + 1
              break
            }
          }
        }
        
        for (let h = 0; h < 9; h++) {
          const colIdx = hole10Start + h
          const scoreStr = cols[colIdx]?.trim() || '0'
          let diff = 0
          if (scoreStr.startsWith('+')) {
            diff = parseInt(scoreStr.substring(1)) || 0
          } else if (scoreStr.startsWith('-')) {
            diff = parseInt(scoreStr) || 0
          } else {
            diff = parseInt(scoreStr) || 0
          }
          holeScores.push(diff)
          if (parValues[9 + h]) {
            actualStrokes.push(parValues[9 + h] + diff)
          }
        }

        console.log(`[解析] ${name} - holeScores长度:`, holeScores.length, holeScores)
        console.log(`[解析] ${name} - actualStrokes长度:`, actualStrokes.length, actualStrokes)

        // 使用动态查找的列索引
        const totalDifference = parseInt(cols[colIndexTotalDifference]?.trim() || '0') || 0 // 总差
        const totalStrokes = parseInt(cols[colIndexTotalStrokes]?.trim() || '0') || 0 // 总杆
        const netStrokesStr = cols[colIndexNetStrokes]?.trim() || '' // 净杆
        const netStrokes = netStrokesStr && netStrokesStr !== '.' && netStrokesStr !== '' ? parseFloat(netStrokesStr) : null
        const groupNumberStr = cols[colIndexGroup]?.trim() || ''
        const groupNumber = groupNumberStr && groupNumberStr !== '.' ? parseInt(groupNumberStr) || null : null // 分组
        const teamName = cols[colIndexTeam]?.trim() || null // 团体对抗

        console.log(`[解析] ${name} - 解析结果:`, {
          totalDifference,
          totalStrokes,
          netStrokes,
          groupNumber,
          teamName
        })

        // 存储实际杆数数组（用于数据库hole_scores字段）
        // 如果每洞成绩是相对PAR的差值，需要计算实际杆数
        const holeStrokesForDB = actualStrokes.length === 18 ? actualStrokes : null

        players.push({
          name,
          holeScores, // 相对PAR的差值（用于团队对抗统计）
          actualStrokes: holeStrokesForDB || [], // 实际杆数（用于数据库存储）
          totalStrokes, // 总杆数
          netStrokes, // 净杆数
          groupNumber, // 分组号
          teamName // 团队名称（需要转换为red/blue）
        })
      }

      if (players.length === 0) {
        throw new Error('未能解析出任何球员数据')
      }

      // 匹配用户并保存到数据库
      const success: string[] = []
      const failed: string[] = []
      const errors: string[] = []

      // 检查当前用户权限
      const { data: currentUserData, error: currentUserError } = await supabase.auth.getUser()
      console.log(`[导入] 当前登录用户:`, { 
        userId: currentUserData?.user?.id, 
        email: currentUserData?.user?.email,
        error: currentUserError 
      })
      
      if (currentUserData?.user) {
        const { data: currentProfile } = await supabase
          .from('user_profiles')
          .select('id, full_name, role')
          .eq('id', currentUserData.user.id)
          .single()
        console.log(`[导入] 当前用户资料:`, currentProfile)
      }

      // 批量获取所有用户姓名
      const { data: allUsers, error: allUsersError } = await supabase
        .from('user_profiles')
        .select('id, full_name')
      
      console.log(`[导入] 获取所有用户:`, { 
        count: allUsers?.length, 
        error: allUsersError,
        sampleUsers: allUsers?.slice(0, 5).map(u => ({ name: u.full_name, id: u.id }))
      })
      
      const userMap = new Map<string, string>()
      if (allUsers) {
        allUsers.forEach(user => {
          if (user.full_name) {
            userMap.set(user.full_name.trim(), user.id)
          }
        })
      }
      
      console.log(`[导入] 用户映射表大小:`, userMap.size)

      // 保存每个球员的成绩
      for (const player of players) {
        try {
          console.log(`[导入] 开始处理球员: ${player.name}`)
          console.log(`[导入] 球员数据:`, {
            name: player.name,
            totalStrokes: player.totalStrokes,
            netStrokes: player.netStrokes,
            groupNumber: player.groupNumber,
            teamName: player.teamName,
            holeScores: player.holeScores,
            actualStrokes: player.actualStrokes,
            actualStrokesLength: player.actualStrokes.length
          })

          const userId = userMap.get(player.name.trim())
          console.log(`[导入] 查找用户ID:`, { name: player.name.trim(), userId, allUserNames: Array.from(userMap.keys()).slice(0, 10) })
          
          if (!userId) {
            failed.push(player.name)
            errors.push(`${player.name}: 未找到匹配的用户`)
            console.warn(`[导入] ${player.name}: 未找到匹配的用户`)
            continue
          }

          // 检查该用户是否已报名该活动
          console.log(`[导入] 检查报名状态:`, { userId, eventId: selectedEvent.id })
          const { data: registration, error: registrationError } = await supabase
            .from('event_registrations')
            .select('id')
            .eq('event_id', selectedEvent.id)
            .eq('user_id', userId)
            .single()

          console.log(`[导入] 报名查询结果:`, { registration, registrationError })

          if (!registration) {
            failed.push(player.name)
            errors.push(`${player.name}: 该用户未报名此活动`)
            console.warn(`[导入] ${player.name}: 该用户未报名此活动`)
            continue
          }

          // 计算handicap（如果有净杆）
          let handicap = 0
          if (player.netStrokes !== null && player.totalStrokes > 0) {
            handicap = Math.round(player.totalStrokes - player.netStrokes)
          }

          // 保持原始团队名称，不做转换
          const normalizedTeamName = player.teamName ? player.teamName.trim() : null

          const scoreData = {
            user_id: userId,
            event_id: selectedEvent.id,
            total_strokes: player.totalStrokes,
            net_strokes: player.netStrokes ? Math.round(player.netStrokes) : null,
            handicap: handicap,
            holes_played: 18,
            hole_scores: player.actualStrokes.length === 18 ? player.actualStrokes : null, // 存储18洞实际杆数数组
            group_number: player.groupNumber,
            team_name: normalizedTeamName,
            notes: null
          }

          console.log(`[导入] 准备保存的成绩数据:`, scoreData)
          console.log(`[导入] hole_scores类型和内容:`, {
            type: typeof scoreData.hole_scores,
            isArray: Array.isArray(scoreData.hole_scores),
            length: scoreData.hole_scores?.length,
            value: scoreData.hole_scores
          })

          // 检查是否已存在
          const { data: existing, error: checkError } = await supabase
            .from('scores')
            .select('id')
            .eq('user_id', userId)
            .eq('event_id', selectedEvent.id)
            .maybeSingle() // 使用 maybeSingle 避免未找到记录时报错

          console.log(`[导入] 检查现有记录:`, { existing, checkError, userId, eventId: selectedEvent.id })

          if (checkError && checkError.code !== 'PGRST116') { // PGRST116 是"未找到记录"的错误，这是正常的
            console.error(`[导入] 检查现有记录出错:`, checkError)
            throw checkError
          }

          if (existing) {
            // 更新
            console.log(`[导入] 更新现有记录:`, existing.id)
            const { data: updateData, error: updateError } = await supabase
              .from('scores')
              .update(scoreData)
              .eq('id', existing.id)
              .select()

            console.log(`[导入] 更新结果:`, { 
              updateData, 
              updateError,
              updateDataLength: updateData?.length,
              updatedRecord: updateData?.[0]
            })
            if (updateError) {
              console.error(`[导入] 更新失败:`, updateError)
              throw updateError
            }
            if (!updateData || updateData.length === 0) {
              console.error(`[导入] 更新后未返回数据`)
              throw new Error('更新后未返回数据，可能更新失败')
            }
            console.log(`[导入] ${player.name}: 更新成功，更新后的记录:`, updateData[0])
          } else {
            // 插入
            console.log(`[导入] 插入新记录，数据:`, JSON.stringify(scoreData, null, 2))
            const { data: insertData, error: insertError } = await supabase
              .from('scores')
              .insert([scoreData])
              .select()

            console.log(`[导入] 插入结果:`, { 
              insertData, 
              insertError,
              insertDataLength: insertData?.length,
              insertedRecord: insertData?.[0]
            })
            if (insertError) {
              console.error(`[导入] 插入失败:`, insertError)
              console.error(`[导入] 插入失败的完整错误:`, JSON.stringify(insertError, null, 2))
              throw insertError
            }
            if (!insertData || insertData.length === 0) {
              console.error(`[导入] 插入后未返回数据`)
              throw new Error('插入后未返回数据，可能插入失败或RLS策略阻止')
            }
            console.log(`[导入] ${player.name}: 插入成功，插入的记录:`, insertData[0])
          }

          success.push(player.name)
          console.log(`[导入] ${player.name}: 处理完成，添加到成功列表`)
        } catch (err: any) {
          console.error(`[导入] ${player.name}: 处理失败`, err)
          failed.push(player.name)
          errors.push(`${player.name}: ${err.message || '保存失败'}`)
        }
      }

      console.log(`[导入] 处理完成 - 成功: ${success.length}, 失败: ${failed.length}`)
      console.log(`[导入] 成功列表:`, success)
      console.log(`[导入] 失败列表:`, failed)

      // 从数据库重新读取该活动的所有成绩数据（包括刚导入的和之前已存在的）
      // 这样可以确保使用完整且准确的数据进行团队统计
      console.log(`[导入] 从数据库读取活动 ${selectedEvent.id} 的所有成绩数据用于团队统计`)
      const { data: allScoresData, error: scoresError } = await supabase
        .from('scores')
        .select(`
          id,
          user_id,
          event_id,
          hole_scores,
          group_number,
          team_name,
          user_profiles!inner(full_name)
        `)
        .eq('event_id', selectedEvent.id)
        .not('group_number', 'is', null)
        .not('team_name', 'is', null)
        .not('hole_scores', 'is', null)

      if (scoresError) {
        console.error(`[导入] 读取成绩数据失败:`, scoresError)
      } else {
        console.log(`[导入] 从数据库读取到 ${allScoresData?.length || 0} 条成绩数据`)
      }

      // 将数据库中的数据转换为团队统计所需的格式
      // 注意：数据库中存储的是实际杆数（整数数组），团队对抗需要比较实际杆数的最小值（杆数越少越好）
      const dbPlayers = (allScoresData || []).map(score => {
        // 确保hole_scores是数字数组（如果数据库中存储的是字符串数组，需要转换）
        let holeScores = score.hole_scores || []
        if (Array.isArray(holeScores) && holeScores.length > 0) {
          // 如果第一个元素是字符串，转换整个数组为数字
          if (typeof holeScores[0] === 'string') {
            holeScores = holeScores.map(s => parseInt(String(s), 10) || 0)
          }
        }
        
        return {
          name: (score.user_profiles as any)?.full_name || '未知',
          holeScores: holeScores, // 实际杆数数组，用于团队对抗比较
          groupNumber: score.group_number,
          teamName: score.team_name
        }
      })

      console.log(`[导入] 转换后的球员数据用于团队统计:`, dbPlayers.map(p => ({
        name: p.name,
        groupNumber: p.groupNumber,
        teamName: p.teamName,
        holeScoresLength: p.holeScores.length
      })))

      // 使用数据库中的数据计算团队对抗统计
      const teamStats = calculateTeamStats(dbPlayers)

      setImportResult({
        success: success.length,
        failed: failed.length,
        errors,
        teamStats
      })

      if (success.length > 0) {
        showSuccess(`成功导入 ${success.length} 条成绩${failed.length > 0 ? `，失败 ${failed.length} 条` : ''}`)
        // 刷新数据
        await fetchParticipants(selectedEvent.id)
        await checkExistingScores(selectedEvent.id)
      } else {
        showError('导入失败：所有记录都无法导入')
      }
    } catch (err: any) {
      console.error('导入失败:', err)
      showError(`导入失败: ${err.message || '未知错误'}`)
      setImportResult({
        success: 0,
        failed: 0,
        errors: [err.message || '未知错误']
      })
    } finally {
      setIsImporting(false)
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 解析CSV行（处理引号和逗号）
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"'
          i++ // 跳过下一个引号
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  // 计算团队对抗统计
  const calculateTeamStats = (players: Array<{
    name: string
    holeScores: number[]
    groupNumber: number | null
    teamName: string | null
  }>) => {
    console.log(`[团队统计] 开始计算，总球员数:`, players.length)
    console.log(`[团队统计] 球员数据:`, players.map(p => ({
      name: p.name,
      groupNumber: p.groupNumber,
      teamName: p.teamName,
      holeScoresLength: p.holeScores?.length
    })))
    
    // 按分组和团队组织数据
    // 使用Map存储每个组的团队数据，key是teamName（保持原样，不转换）
    const groups = new Map<number, Map<string, Array<{ name: string; holeScores: number[] }>>>()

    players.forEach(player => {
      if (!player.groupNumber || !player.teamName) {
        console.warn(`[团队统计] 跳过球员 ${player.name}: groupNumber=${player.groupNumber}, teamName=${player.teamName}`)
        return
      }
      
      const group = player.groupNumber
      const teamName = player.teamName.trim() // 使用原始teamName，只去除首尾空格
      
      if (!groups.has(group)) {
        groups.set(group, new Map())
      }

      const groupTeams = groups.get(group)!
      if (!groupTeams.has(teamName)) {
        groupTeams.set(teamName, [])
      }
      
      console.log(`[团队统计] 添加球员 ${player.name} 到组${group}的${teamName}队，holeScores长度:`, player.holeScores?.length)
      
      groupTeams.get(teamName)!.push({
        name: player.name,
        holeScores: player.holeScores
      })
    })
    
    console.log(`[团队统计] 分组结果:`, Array.from(groups.entries()).map(([group, teams]) => ({
      group,
      teams: Array.from(teams.entries()).map(([teamName, players]) => ({
        teamName,
        count: players.length,
        playerNames: players.map(p => p.name)
      }))
    })))

    // 计算每组每洞的胜负
    // 注意：如果一组内有超过2个团队，需要特殊处理
    // 目前假设每组只有2个团队进行对抗
    const groupDetails: Array<{ 
      group: number
      teams: Array<{ teamName: string; wins: number; playerCount: number }>
      winner: string | 'tie'
    }> = []

    groups.forEach((teamsMap, groupNumber) => {
      const teamEntries = Array.from(teamsMap.entries())
      console.log(`[团队统计] 计算组${groupNumber}: ${teamEntries.length}个团队`, teamEntries.map(([name, players]) => `${name}(${players.length}人)`))
      
      if (teamEntries.length < 2) {
        console.warn(`[团队统计] 组${groupNumber}只有${teamEntries.length}个团队，无法进行对抗统计`)
        return
      }

      // 如果只有2个团队，进行两两对抗
      if (teamEntries.length === 2) {
        const [team1Name, team1Players] = teamEntries[0]
        const [team2Name, team2Players] = teamEntries[1]
        
        let team1Wins = 0
        let team2Wins = 0

        // 对每个洞进行比较
        for (let hole = 0; hole < 18; hole++) {
          // 找团队1该洞的最佳成绩（最小值，杆数越少越好）
          const team1Scores = team1Players.map(p => {
            const score = p.holeScores?.[hole]
            console.log(`[团队统计] 组${groupNumber} 洞${hole + 1} ${team1Name} ${p.name}: ${score}`)
            return score
          }).filter(s => s !== undefined && s !== null && !isNaN(s))
          const team1Best = team1Scores.length > 0 ? Math.min(...team1Scores) : Infinity
          
          // 找团队2该洞的最佳成绩
          const team2Scores = team2Players.map(p => {
            const score = p.holeScores?.[hole]
            console.log(`[团队统计] 组${groupNumber} 洞${hole + 1} ${team2Name} ${p.name}: ${score}`)
            return score
          }).filter(s => s !== undefined && s !== null && !isNaN(s))
          const team2Best = team2Scores.length > 0 ? Math.min(...team2Scores) : Infinity

          console.log(`[团队统计] 组${groupNumber} 洞${hole + 1}: ${team1Name}最佳=${team1Best}, ${team2Name}最佳=${team2Best}`)

          if (team1Best === Infinity || team2Best === Infinity) {
            console.warn(`[团队统计] 组${groupNumber} 洞${hole + 1}: 跳过（缺少数据）`)
            continue
          }

          if (team1Best < team2Best) {
            team1Wins++
            console.log(`[团队统计] 组${groupNumber} 洞${hole + 1}: ${team1Name}获胜`)
          } else if (team2Best < team1Best) {
            team2Wins++
            console.log(`[团队统计] 组${groupNumber} 洞${hole + 1}: ${team2Name}获胜`)
          } else {
            console.log(`[团队统计] 组${groupNumber} 洞${hole + 1}: 平局`)
          }
        }
        
        console.log(`[团队统计] 组${groupNumber} 最终结果: ${team1Name}${team1Wins}洞, ${team2Name}${team2Wins}洞`)

        let winner: string | 'tie'
        if (team1Wins > team2Wins) {
          winner = team1Name
        } else if (team2Wins > team1Wins) {
          winner = team2Name
        } else {
          winner = 'tie'
        }

        groupDetails.push({
          group: groupNumber,
          teams: [
            { teamName: team1Name, wins: team1Wins, playerCount: team1Players.length },
            { teamName: team2Name, wins: team2Wins, playerCount: team2Players.length }
          ],
          winner
        })
      } else {
        // 如果超过2个团队，暂时不处理（未来可以扩展为循环赛）
        console.warn(`[团队统计] 组${groupNumber}有${teamEntries.length}个团队，暂不支持多团队对抗统计`)
      }
    })

    // 计算总比分（所有组的胜利数累加）
    let totalScores = new Map<string, number>()
    groupDetails.forEach(detail => {
      detail.teams.forEach(team => {
        const current = totalScores.get(team.teamName) || 0
        // 如果该团队赢了这一组，加1分；如果平局，加0.5分
        if (detail.winner === team.teamName) {
          totalScores.set(team.teamName, current + 1)
        } else if (detail.winner === 'tie') {
          totalScores.set(team.teamName, current + 0.5)
        } else {
          totalScores.set(team.teamName, current)
        }
      })
    })

    return {
      totalScores: Array.from(totalScores.entries()).map(([teamName, score]) => ({ teamName, score })),
      details: groupDetails.sort((a, b) => a.group - b.group)
    }
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
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
              disabled={!selectedEvent || isImporting}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedEvent || isImporting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                  导入中...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  批量导入
                </>
              )}
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
                          {participant.total_strokes && (
                            <div className="text-xs text-blue-600 mt-1">
                              总杆数: {participant.total_strokes}
                              {participant.rank && ` | 排名: #${participant.rank}`}
                            </div>
                          )}
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

              <div className="md:col-span-2 flex flex-col">
                {selectedParticipant ? (
                  <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto space-y-6 pb-24">
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

                    {/* 18洞成绩编辑 */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        18洞成绩
                      </label>
                      <div className="bg-gray-50 rounded-lg p-4">
                        {/* 前9洞表头行 */}
                        <div className="grid grid-cols-9 gap-2 mb-2">
                          {Array.from({ length: 9 }, (_, i) => (
                            <div key={i} className="text-xs font-medium text-gray-600 text-center">
                              洞{i + 1}
                            </div>
                          ))}
                        </div>
                        {/* 前9洞输入行 */}
                        <div className="grid grid-cols-9 gap-2 mb-4">
                          {Array.from({ length: 9 }, (_, i) => {
                            const holeScores = scoreData.hole_scores || Array(18).fill(0)
                            return (
                              <input
                                key={i}
                                type="number"
                                value={holeScores[i] || ''}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                                  const newHoleScores = [...(scoreData.hole_scores || Array(18).fill(0))]
                                  newHoleScores[i] = value
                                  setScoreData({ ...scoreData, hole_scores: newHoleScores })
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="bg-white rounded text-center py-2 font-semibold w-12 h-[42px] border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mx-auto"
                                min="1"
                                max="20"
                                step="1"
                                placeholder="-"
                              />
                            )
                          })}
                        </div>
                        {/* 后9洞表头行 */}
                        <div className="grid grid-cols-9 gap-2">
                          {Array.from({ length: 9 }, (_, i) => (
                            <div key={i + 9} className="text-xs font-medium text-gray-600 text-center">
                              洞{i + 10}
                            </div>
                          ))}
                        </div>
                        {/* 后9洞输入行 */}
                        <div className="grid grid-cols-9 gap-2 mt-2">
                          {Array.from({ length: 9 }, (_, i) => {
                            const holeScores = scoreData.hole_scores || Array(18).fill(0)
                            const idx = i + 9
                            return (
                              <input
                                key={idx}
                                type="number"
                                value={holeScores[idx] || ''}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                                  const newHoleScores = [...(scoreData.hole_scores || Array(18).fill(0))]
                                  newHoleScores[idx] = value
                                  setScoreData({ ...scoreData, hole_scores: newHoleScores })
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="bg-white rounded text-center py-2 font-semibold w-12 h-[42px] border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mx-auto"
                                min="1"
                                max="20"
                                step="1"
                                placeholder="-"
                              />
                            )
                          })}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-300 text-sm text-gray-600 text-center">
                          总杆数: {(scoreData.hole_scores || []).reduce((sum, s) => sum + (Number(s) || 0), 0)}
                          {scoreData.total_strokes && (
                            <span className="ml-2 text-xs text-gray-400">
                              (表单中总杆数: {scoreData.total_strokes})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 分组和团队信息 */}
                    {(scoreData.group_number || scoreData.team_name) && (
                      <div className="grid md:grid-cols-2 gap-6 mb-6">
                        {scoreData.group_number && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              分组号
                            </label>
                            <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 font-medium">
                              第 {scoreData.group_number} 组
                            </div>
                          </div>
                        )}
                        {scoreData.team_name && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              团队名称
                            </label>
                            <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 font-medium">
                              {scoreData.team_name}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

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
                    </div>

                    {/* 固定在底部的保存按钮 */}
                    <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-6 px-6 shadow-lg">
                      <div className="flex justify-end">
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

        {/* 导入结果显示 */}
        {importResult && (
          <div className="border-t border-gray-200 px-6 py-4 bg-blue-50 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between sticky top-0 bg-blue-50 pb-2 z-10">
                <h3 className="text-lg font-semibold text-gray-900">导入结果</h3>
                <button
                  onClick={() => setImportResult(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">导入统计</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">成功:</span>
                      <span className="text-green-600 font-semibold">{importResult.success} 条</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">失败:</span>
                      <span className="text-red-600 font-semibold">{importResult.failed} 条</span>
                    </div>
                  </div>
                </div>

                {importResult.teamStats && importResult.teamStats.totalScores.length > 0 && (
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-2">团队对抗统计</div>
                    <div className="space-y-2">
                      {importResult.teamStats.totalScores.map((team, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="font-medium">{team.teamName}:</span>
                          <span className="font-bold text-xl">{team.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {importResult.teamStats && importResult.teamStats.details.length > 0 && (
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-3">各组详细结果</div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {importResult.teamStats.details.map(detail => (
                      <div
                        key={detail.group}
                        className={`p-3 rounded-lg border-2 ${
                          detail.winner === 'tie'
                            ? 'bg-gray-50 border-gray-300'
                            : 'bg-blue-50 border-blue-300'
                        }`}
                      >
                        <div className="font-semibold text-gray-900 mb-2">第 {detail.group} 组</div>
                        <div className="text-sm space-y-1">
                          {detail.teams.map((team, index) => (
                            <div key={index} className="flex justify-between">
                              <span className={detail.winner === team.teamName ? 'font-bold' : ''}>{team.teamName} ({team.playerCount}人):</span>
                              <span className="font-medium">{team.wins} 洞</span>
                            </div>
                          ))}
                          <div className="pt-1 border-t border-gray-300">
                            <span className={`font-bold ${
                              detail.winner === 'tie'
                                ? 'text-gray-600'
                                : 'text-blue-600'
                            }`}>
                              {detail.winner === 'tie' ? '平局' : `${detail.winner} 获胜`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">错误详情</div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="text-xs text-red-600">{error}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedEvent && !importResult && (
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

      {/* 团体赛结果展示模态框 */}
      {showTeamCompetitionResult && teamCompetitionData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">团体赛结果</h2>
              <button
                onClick={() => {
                  setShowTeamCompetitionResult(false)
                  onSuccess()
                  onClose()
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* 总比分 */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* 蓝队 */}
                {teamCompetitionData.totalScores.map((team: any, index: number) => {
                  const isRed = team.teamName.toUpperCase().includes('RED') || team.teamName.includes('红') || team.teamName.toLowerCase() === 'red'
                  if (isRed) return null // 红队在后面显示
                  
                  return (
                    <div key={index} className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded bg-blue-500"></div>
                        <span className="font-medium text-gray-900">{team.teamName}</span>
                      </div>
                      <div className="bg-blue-500 text-white rounded-lg px-6 py-2 font-bold text-xl">
                        {team.score}
                      </div>
                    </div>
                  )
                })}
                {/* 红队 */}
                {teamCompetitionData.totalScores.map((team: any, index: number) => {
                  const isRed = team.teamName.toUpperCase().includes('RED') || team.teamName.includes('红') || team.teamName.toLowerCase() === 'red'
                  if (!isRed) return null
                  
                  return (
                    <div key={index} className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded bg-red-500"></div>
                        <span className="font-medium text-gray-900">{team.teamName}</span>
                      </div>
                      <div className="bg-red-500 text-white rounded-lg px-6 py-2 font-bold text-xl">
                        {team.score}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 各组详细结果 */}
              <div className="space-y-4">
                {teamCompetitionData.groupDetails.map((group: any) => {
                  // 找到红队和蓝队
                  const redTeam = group.teams.find((t: any) => 
                    t.teamName.toUpperCase().includes('RED') || t.teamName.includes('红') || t.teamName.toLowerCase() === 'red'
                  )
                  const blueTeam = group.teams.find((t: any) => !redTeam || t.teamName !== redTeam.teamName)
                  
                  // 计算每洞胜负
                  const holeResults: Array<'red' | 'blue' | 'tie'> = []
                  const redPlayers = group.redPlayers || []
                  const bluePlayers = group.bluePlayers || []
                  
                  for (let hole = 0; hole < 18; hole++) {
                    const redBest = Math.min(...redPlayers.map((p: any) => p.holeScores[hole] || Infinity))
                    const blueBest = Math.min(...bluePlayers.map((p: any) => p.holeScores[hole] || Infinity))
                    
                    if (redBest === Infinity || blueBest === Infinity) {
                      holeResults.push('tie')
                    } else if (redBest < blueBest) {
                      holeResults.push('red')
                    } else if (blueBest < redBest) {
                      holeResults.push('blue')
                    } else {
                      holeResults.push('tie')
                    }
                  }
                  
                  const redWins = holeResults.filter(r => r === 'red').length
                  const blueWins = holeResults.filter(r => r === 'blue').length
                  const remaining = 18 - redWins - blueWins
                  // 使用重新计算的洞数（确保准确）
                  const redScore = redWins  // 红队赢的洞数
                  const blueScore = blueWins  // 蓝队赢的洞数
                  
                  let summaryText = ''
                  if (redScore > blueScore) {
                    summaryText = `红赢${redScore}洞${remaining > 0 ? `剩${remaining}洞提前结束` : ''}`
                  } else if (blueScore > redScore) {
                    summaryText = `蓝赢${blueScore}洞${remaining > 0 ? `剩${remaining}洞提前结束` : ''}`
                  } else {
                    summaryText = '平局'
                  }
                  
                  return (
                    <div key={group.group} className="bg-gradient-to-r from-red-50 to-blue-50 rounded-xl p-4 border-2 border-gray-200">
                      {/* 组标题 */}
                      <div className="text-sm font-medium text-gray-700 mb-3">
                        第{group.group}组 · {redTeam?.teamName || '红队'} • {blueTeam?.teamName || '蓝队'}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        {/* 左侧：红队得分圆圈 */}
                        <div className="flex-1 flex justify-center">
                          <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg">
                              <span className="text-4xl font-bold text-white">{redScore}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* 中间：球员信息和进度 */}
                        <div className="flex-1 px-4">
                          {/* 球员名单 */}
                          <div className="space-y-2 mb-3">
                            {/* 红队球员 */}
                            <div className="space-y-1">
                              {redPlayers.map((player: any, idx: number) => (
                                <div key={idx} className="flex items-center text-sm">
                                  <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                                  <span className="text-gray-700">{player.name}</span>
                                </div>
                              ))}
                            </div>
                            {/* 蓝队球员 */}
                            <div className="space-y-1">
                              {bluePlayers.map((player: any, idx: number) => (
                                <div key={idx} className="flex items-center text-sm">
                                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                                  <span className="text-gray-700">{player.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* 进度圆圈 */}
                          <div className="space-y-2">
                            {/* 红队进度 */}
                            <div className="flex flex-wrap gap-1 justify-center">
                              {holeResults.map((result, idx) => (
                                <div
                                  key={idx}
                                  className={`w-3 h-3 rounded-full ${
                                    result === 'red' ? 'bg-red-500' : 'bg-white border border-gray-300'
                                  }`}
                                ></div>
                              ))}
                            </div>
                            {/* 蓝队进度 */}
                            <div className="flex flex-wrap gap-1 justify-center">
                              {holeResults.map((result, idx) => (
                                <div
                                  key={idx}
                                  className={`w-3 h-3 rounded-full ${
                                    result === 'blue' ? 'bg-blue-500' : 'bg-white border border-gray-300'
                                  }`}
                                ></div>
                              ))}
                            </div>
                          </div>
                          
                          {/* 总结文字 */}
                          <div className="text-xs text-gray-600 text-center mt-2">
                            {summaryText}
                          </div>
                        </div>
                        
                        {/* 右侧：蓝队得分圆圈 */}
                        <div className="flex-1 flex justify-center">
                          <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                              <span className="text-4xl font-bold text-white">{blueScore}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
