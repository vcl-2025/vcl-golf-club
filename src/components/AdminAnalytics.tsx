import React, { useState, useEffect, useRef } from 'react'
import { Users, Calendar, Trophy, Receipt, BarChart3, TrendingUp, Smartphone, Monitor } from 'lucide-react'
import * as echarts from 'echarts'
import { supabase } from '../lib/supabase'

interface LoginData {
  date: string
  mobile: number
  desktop: number
  total: number
  unique_users: number
  total_sessions: number
}

interface ScoreTrend {
  event_id: string
  event_title: string
  gold_strokes: number
  silver_strokes: number
  bronze_strokes: number
  gold_winner: string
  silver_winner: string
  bronze_winner: string
  gold_winner_name: string
  silver_winner_name: string
  bronze_winner_name: string
}

interface ExpenseCategory {
  category: string
  amount: number
}

const AdminAnalytics = () => {
  const [loginData, setLoginData] = useState<LoginData[]>([])
  const [scoreTrends, setScoreTrends] = useState<ScoreTrend[]>([])
  const [scoreScatterData, setScoreScatterData] = useState<any[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [yearlyExpenseData, setYearlyExpenseData] = useState<any[]>([])
  const [pendingRegistrations, setPendingRegistrations] = useState(0)
  const [pendingInvestments, setPendingInvestments] = useState(0)
  const [loading, setLoading] = useState(true)

  // ECharts 实例引用
  const loginChartRef = useRef<HTMLDivElement>(null)
  const scoreChartRef = useRef<HTMLDivElement>(null)
  const pieChartRef = useRef<HTMLDivElement>(null)
  const barChartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchAllData()
  }, [])

  useEffect(() => {
    if (!loading) {
      initCharts()
    }
  }, [loading, loginData, scoreScatterData, expenseCategories, yearlyExpenseData])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchLoginTrends(),
        fetchScoreTrends(),
        fetchExpenseCategories(),
        fetchPendingTasks()
      ])
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingTasks = async () => {
    try {
      // 获取待审批的报名数量
      const { count: pendingRegCount } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'pending')

      // 获取待确认的投资数量
      const { count: pendingInvCount } = await supabase
        .from('investments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      setPendingRegistrations(pendingRegCount || 0)
      setPendingInvestments(pendingInvCount || 0)
    } catch (error) {
      console.error('获取待处理任务失败:', error)
    }
  }

  const fetchLoginTrends = async () => {
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      sevenDaysAgo.setHours(0, 0, 0, 0)

      const { data: loginData, error: loginError } = await supabase
        .from('login_logs')
        .select('user_id, login_time, device_type, user_agent')
        .gte('login_time', sevenDaysAgo.toISOString())
        .order('login_time', { ascending: true })

      if (loginError) {
        console.error('获取登录数据失败:', loginError)
        setLoginData([])
        return
      }

      const dailyStats: { [key: string]: { 
        unique_users: Set<string>,
        mobile: number,
        desktop: number,
        total_sessions: number
      } } = {}
      
      // Initialize for the last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`
        dailyStats[dateStr] = { 
          unique_users: new Set(),
          mobile: 0,
          desktop: 0,
          total_sessions: 0
        }
      }

      if (loginData && loginData.length > 0) {
        loginData.forEach(login => {
          const loginDate = new Date(login.login_time)
          const year = loginDate.getFullYear()
          const month = String(loginDate.getMonth() + 1).padStart(2, '0')
          const day = String(loginDate.getDate()).padStart(2, '0')
          const dateStr = `${year}-${month}-${day}`
          
          if (dailyStats[dateStr]) {
            dailyStats[dateStr].unique_users.add(login.user_id)
            
            if (login.device_type === 'mobile' || login.device_type === 'tablet') {
              dailyStats[dateStr].mobile += 1
            } else if (login.device_type === 'desktop') {
              dailyStats[dateStr].desktop += 1
            }
            
            dailyStats[dateStr].total_sessions += 1
          }
        })
      }

      const chartData: LoginData[] = Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        mobile: stats.mobile,
        desktop: stats.desktop,
        total: stats.unique_users.size,
        unique_users: stats.unique_users.size,
        total_sessions: stats.total_sessions
      }))

      setLoginData(chartData)
    } catch (error) {
      console.error('获取登录趋势失败:', error)
      setLoginData([])
    }
  }

  const fetchScoreTrends = async () => {
    try {
      // 先获取成绩数据
      const { data: scores, error } = await supabase
        .from('scores')
        .select(`
          event_id,
          total_strokes,
          rank,
          user_id,
          events!inner(title)
        `)
        .order('event_id, rank')

      if (error) {
        console.error('获取成绩数据失败:', error)
        setScoreTrends([])
        setScoreScatterData([])
        return
      }

      if (!scores || scores.length === 0) {
        setScoreTrends([])
        setScoreScatterData([])
        return
      }

      // 获取用户资料
      const userIds = [...new Set(scores.map(score => score.user_id))]
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', userIds)

      if (profilesError) {
        console.error('获取用户资料失败:', profilesError)
        setScoreTrends([])
        setScoreScatterData([])
        return
      }

      // 合并数据
      const scoresWithProfiles = scores.map(score => {
        const profile = profiles?.find(p => p.id === score.user_id)
        return {
          ...score,
          user_profiles: profile
        }
      })

      // 按活动分组成绩
      const eventScores: { [eventId: string]: any[] } = {}
      scoresWithProfiles?.forEach(score => {
        if (!eventScores[score.event_id]) {
          eventScores[score.event_id] = []
        }
        eventScores[score.event_id].push(score)
      })

      // 为散点图准备数据，按活动组织数据
      const scatterData: any[] = []
      const trends = Object.entries(eventScores).map(([eventId, eventScoreList]: [string, any]) => {
        const sortedScores = eventScoreList.sort((a: any, b: any) => a.rank - b.rank)
        const gold = sortedScores[0]
        const silver = sortedScores[1]
        const bronze = sortedScores[2]

        // 为每个活动创建一个数据点，包含金银铜的成绩
        const eventData = {
          event_title: gold?.events?.title || '未知活动',
          gold_strokes: gold?.total_strokes || null,
          silver_strokes: silver?.total_strokes || null,
          bronze_strokes: bronze?.total_strokes || null,
          gold_winner: gold?.user_profiles?.full_name || '未知',
          silver_winner: silver?.user_profiles?.full_name || '未知',
          bronze_winner: bronze?.user_profiles?.full_name || '未知'
        }
        
        scatterData.push(eventData)

        return {
          event_id: eventId,
          event_title: gold?.events?.title || '未知活动',
          gold_strokes: gold?.total_strokes || 0,
          silver_strokes: silver?.total_strokes || 0,
          bronze_strokes: bronze?.total_strokes || 0,
          gold_winner: gold?.user_id || '',
          silver_winner: silver?.user_id || '',
          bronze_winner: bronze?.user_id || '',
          gold_winner_name: gold?.user_profiles?.full_name || '未知',
          silver_winner_name: silver?.user_profiles?.full_name || '未知',
          bronze_winner_name: bronze?.user_profiles?.full_name || '未知'
        }
      })

      setScoreTrends(trends)
      setScoreScatterData(scatterData)
    } catch (error) {
      console.error('获取成绩趋势失败:', error)
      setScoreTrends([])
      setScoreScatterData([])
    }
  }

  const fetchExpenseCategories = async () => {
    try {
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('expense_type, amount, created_at, expense_date')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('获取费用数据失败:', error)
        setExpenseCategories([])
        setYearlyExpenseData([])
        return
      }

      if (expenses && expenses.length > 0) {
        const currentYear = new Date().getFullYear()
        const startOfYear = new Date(currentYear, 0, 1).toISOString()
        
        // 1. 处理今年费用数据（饼状图）
        const thisYearExpenses = expenses.filter(expense => 
          new Date(expense.created_at) >= new Date(startOfYear)
        )
        
        const thisYearData: { [expenseType: string]: number } = {}
        thisYearExpenses.forEach(expense => {
          const expenseType = expense.expense_type || '其他'
          if (!thisYearData[expenseType]) {
            thisYearData[expenseType] = 0
          }
          thisYearData[expenseType] += expense.amount || 0
        })

        // 费用类型中文映射
        const expenseTypeMap: { [key: string]: string } = {
          'equipment': '设备费用',
          'activity': '活动费用',
          'salary': '薪资费用',
          'maintenance': '维护费用',
          'other': '其他费用'
        }

        const pieChartData = Object.entries(thisYearData)
          .map(([expenseType, amount]) => ({
            name: expenseTypeMap[expenseType] || expenseType,
            value: amount
          }))
          .sort((a, b) => b.value - a.value)

        // 2. 处理历年费用数据（分组柱状图）
        const yearlyData: { [year: string]: { [expenseType: string]: number } } = {}
        
        expenses.forEach(expense => {
          // 使用费用日期来确定年份，如果没有费用日期则使用创建时间
          const dateToUse = expense.expense_date || expense.created_at
          const year = new Date(dateToUse).getFullYear().toString()
          const expenseType = expense.expense_type || '其他'
          
          if (!yearlyData[year]) {
            yearlyData[year] = {}
          }
          if (!yearlyData[year][expenseType]) {
            yearlyData[year][expenseType] = 0
          }
          yearlyData[year][expenseType] += expense.amount || 0
        })

        // 获取所有费用类型
        const allExpenseTypes = new Set<string>()
        Object.values(yearlyData).forEach(yearData => {
          Object.keys(yearData).forEach(type => allExpenseTypes.add(type))
        })

        // 转换为图表数据格式 - 每年一行，包含所有费用类型
        const barChartData: any[] = []
        Object.entries(yearlyData).forEach(([year, expenseTypes]) => {
          const yearData: any = { year: parseInt(year) }
          
          // 为每个费用类型添加数据，使用中文名称
          allExpenseTypes.forEach(expenseType => {
            const chineseName = expenseTypeMap[expenseType] || expenseType
            yearData[chineseName] = expenseTypes[expenseType] || 0
          })
          
          barChartData.push(yearData)
        })

        // 按年份排序
        barChartData.sort((a, b) => a.year - b.year)
        
        setExpenseCategories(pieChartData)
        setYearlyExpenseData(barChartData)
      } else {
        setExpenseCategories([])
        setYearlyExpenseData([])
      }
    } catch (error) {
      console.error('获取费用数据失败:', error)
      setExpenseCategories([])
      setYearlyExpenseData([])
    }
  }

  const initCharts = () => {
    // 初始化登录趋势图表
    if (loginChartRef.current && loginData.length > 0) {
      const chart = echarts.init(loginChartRef.current)
      const option = {
        title: {
          text: '用户活跃度趋势',
          left: 'center',
          top: 5,
          textStyle: { fontSize: 16 }
        },
        tooltip: {
          trigger: 'axis',
          formatter: function(params: any) {
            let result = `日期: ${params[0].axisValue}<br/>`
            params.forEach((param: any) => {
              result += `${param.seriesName}: ${param.value}<br/>`
            })
            return result
          }
        },
        legend: {
          data: ['活跃用户数', '登录会话数', '手机登录', '电脑登录'],
          bottom: 10
        },
        xAxis: {
          type: 'category',
          data: loginData.map(item => {
            const [year, month, day] = item.date.split('-')
            return `${parseInt(month)}月${parseInt(day)}日`
          })
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: '活跃用户数',
            type: 'line',
            data: loginData.map(item => item.unique_users),
            smooth: true,
            itemStyle: { color: '#3B82F6' }
          },
          {
            name: '登录会话数',
            type: 'line',
            data: loginData.map(item => item.total_sessions),
            smooth: true,
            itemStyle: { color: '#10B981' }
          },
          {
            name: '手机登录',
            type: 'line',
            data: loginData.map(item => item.mobile),
            smooth: true,
            itemStyle: { color: '#8B5CF6' }
          },
          {
            name: '电脑登录',
            type: 'line',
            data: loginData.map(item => item.desktop),
            smooth: true,
            itemStyle: { color: '#F59E0B' }
          }
        ]
      }
      chart.setOption(option)
    }

    // 初始化成绩趋势图表
    if (scoreChartRef.current && scoreScatterData.length > 0) {
      const chart = echarts.init(scoreChartRef.current)
      const option = {
        title: {
          text: '成绩趋势分析',
          left: 'center',
          top: 5,
          textStyle: { fontSize: 16 }
        },
        tooltip: {
          trigger: 'axis',
          formatter: function(params: any) {
            let result = `活动: ${params[0].axisValue}<br/>`
            params.forEach((param: any) => {
              const data = param.data
              let winnerName = '未知'
              if (param.seriesName === '金牌') {
                winnerName = data.gold_winner || '未知'
              } else if (param.seriesName === '银牌') {
                winnerName = data.silver_winner || '未知'
              } else if (param.seriesName === '铜牌') {
                winnerName = data.bronze_winner || '未知'
              }
              result += `${param.seriesName}: ${param.value}杆 - ${winnerName}<br/>`
            })
            return result
          }
        },
        legend: {
          data: ['金牌', '银牌', '铜牌'],
          bottom: 10
        },
        xAxis: {
          type: 'category',
          data: scoreScatterData.map(item => item.event_title),
          axisLabel: {
            rotate: 45,
            fontSize: 10
          }
        },
        yAxis: {
          type: 'value',
          name: '杆数'
        },
        series: [
          {
            name: '金牌',
            type: 'line',
            data: scoreScatterData.map(item => ({
              value: item.gold_strokes,
              gold_winner: item.gold_winner,
              silver_winner: item.silver_winner,
              bronze_winner: item.bronze_winner
            })),
            smooth: true,
            symbol: 'circle',
            symbolSize: 8,
            itemStyle: { color: '#F59E0B' }
          },
          {
            name: '银牌',
            type: 'line',
            data: scoreScatterData.map(item => ({
              value: item.silver_strokes,
              gold_winner: item.gold_winner,
              silver_winner: item.silver_winner,
              bronze_winner: item.bronze_winner
            })),
            smooth: true,
            symbol: 'circle',
            symbolSize: 8,
            itemStyle: { color: '#6B7280' }
          },
          {
            name: '铜牌',
            type: 'line',
            data: scoreScatterData.map(item => ({
              value: item.bronze_strokes,
              gold_winner: item.gold_winner,
              silver_winner: item.silver_winner,
              bronze_winner: item.bronze_winner
            })),
            smooth: true,
            symbol: 'circle',
            symbolSize: 8,
            itemStyle: { color: '#EF4444' }
          }
        ]
      }
      chart.setOption(option)
    }

    // 初始化南丁格尔玫瑰图
    if (pieChartRef.current && expenseCategories.length > 0) {
      const chart = echarts.init(pieChartRef.current)
      const option = {
        title: {
          text: '今年费用分析',
          left: 'center',
          top: 5,
          textStyle: { fontSize: 16 }
        },
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 'left',
          data: expenseCategories.map(item => item.name)
        },
        series: [
          {
            name: '费用类型',
            type: 'pie',
            radius: [20, 110],
            center: ['50%', '50%'],
            roseType: 'radius',
            data: expenseCategories.map(item => ({
              value: item.value,
              name: item.name
            })),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            label: {
              show: true,
              formatter: '{d}%',
              fontSize: 12,
              fontWeight: 'bold'
            },
            labelLine: {
              show: true,
              length: 15,
              length2: 10
            }
          }
        ]
      }
      chart.setOption(option)
    }

    // 初始化柱状图
    if (barChartRef.current && yearlyExpenseData.length > 0) {
      const chart = echarts.init(barChartRef.current)
      
      // 获取所有费用类型
      const allExpenseTypes = new Set<string>()
      yearlyExpenseData.forEach(item => {
        Object.keys(item).forEach(key => {
          if (key !== 'year') {
            allExpenseTypes.add(key)
          }
        })
      })

      // 定义费用类型对应的颜色（与饼状图默认颜色保持一致）
      const expenseTypeColors: { [key: string]: string } = {
        '设备费用': '#5470c6',    // 蓝色（饼状图第一个颜色）
        '薪资费用': '#91cc75',    // 绿色（饼状图第二个颜色）
        '活动费用': '#fac858',    // 黄色（饼状图第三个颜色）
        '维护费用': '#ee6666',    // 红色（饼状图第四个颜色）
        '其他费用': '#73c0de'     // 青色（饼状图第五个颜色）
      }

      const series = Array.from(allExpenseTypes).map((expenseType) => ({
        name: expenseType,
        type: 'bar',
        data: yearlyExpenseData.map(item => item[expenseType] || 0),
        itemStyle: {
          color: expenseTypeColors[expenseType] || '#6366F1'
        }
      }))

      const option = {
        title: {
          text: '历年费用趋势分析',
          left: 'center',
          top: 5,
          textStyle: { fontSize: 16 }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        legend: {
          data: Array.from(allExpenseTypes),
          bottom: 10
        },
        xAxis: {
          type: 'category',
          data: yearlyExpenseData.map(item => `${item.year}年`)
        },
        yAxis: {
          type: 'value',
          name: '金额 (CAD)'
        },
        series: series
      }
      chart.setOption(option)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 bg-white p-6 rounded-2xl">
      {/* 第一行：用户活跃度趋势 + 待处理任务 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 用户活跃度趋势 */}
        <div className="lg:col-span-2 bg-gray-25 rounded-2xl p-6 shadow-md border border-gray-200">
          <div className="h-80" ref={loginChartRef}></div>
        </div>

        {/* 待处理任务 */}
        <div className="lg:col-span-1 bg-gray-25 rounded-2xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
            <h3 className="text-lg font-semibold text-gray-900">待处理任务</h3>
          </div>
          <div className="space-y-4">
            {/* 活动报名待批 */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-gray-700">活动报名待批</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">{pendingRegistrations}</span>
              </div>
              <p className="text-xs text-gray-500">需要审核的报名申请</p>
            </div>

            {/* 投资确认待批 */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-gray-700">投资确认待批</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{pendingInvestments}</span>
              </div>
              <p className="text-xs text-gray-500">需要确认的投资申请</p>
            </div>

            {/* 快速操作按钮 */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button 
                onClick={() => {
                  // 触发父组件的导航事件
                  const event = new CustomEvent('admin-navigate', { 
                    detail: { view: 'events' } 
                  })
                  window.dispatchEvent(event)
                }}
                className="px-3 py-2 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
              >
                处理报名
              </button>
              <button 
                onClick={() => {
                  // 触发父组件的导航事件
                  const event = new CustomEvent('admin-navigate', { 
                    detail: { view: 'investments' } 
                  })
                  window.dispatchEvent(event)
                }}
                className="px-3 py-2 text-xs bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors cursor-pointer"
              >
                处理投资
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 第二行：成绩趋势分析 */}
      <div className="bg-gray-25 rounded-2xl p-6 shadow-md border border-gray-200">
        <div className="h-80" ref={scoreChartRef}></div>
      </div>

      {/* 第三行：今年费用分析 + 历年费用趋势分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 今年费用分析 */}
        <div className="bg-gray-25 rounded-2xl p-6 shadow-md border border-gray-200">
          <div className="h-80" ref={pieChartRef}></div>
        </div>

        {/* 历年费用趋势分析 */}
        <div className="bg-gray-25 rounded-2xl p-6 shadow-md border border-gray-200">
          <div className="h-80" ref={barChartRef}></div>
        </div>
      </div>
    </div>
  )
}

export default AdminAnalytics