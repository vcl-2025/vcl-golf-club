import React, { useState, useEffect, useRef } from 'react'
import { Users, Calendar, Trophy, Receipt, BarChart3, TrendingUp, Smartphone, Monitor, Clock, DollarSign } from 'lucide-react'
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

interface IncomeExpenseData {
  income: {
    total: number
    categories: { name: string; amount: number; percentage: number }[]
  }
  expense: {
    total: number
    categories: { name: string; amount: number; percentage: number }[]
  }
}

const AdminAnalytics = () => {
  const [loginData, setLoginData] = useState<LoginData[]>([])
  const [scoreTrends, setScoreTrends] = useState<ScoreTrend[]>([])
  const [scoreScatterData, setScoreScatterData] = useState<any[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [yearlyExpenseData, setYearlyExpenseData] = useState<any[]>([])
  const [incomeExpenseData, setIncomeExpenseData] = useState<IncomeExpenseData | null>(null)
  const [pendingRegistrations, setPendingRegistrations] = useState(0)
  const [pendingInvestments, setPendingInvestments] = useState(0)
  const [loading, setLoading] = useState(true)

  // ECharts 实例引用
  const loginChartRef = useRef<HTMLDivElement>(null)
  const scoreChartRef = useRef<HTMLDivElement>(null)
  const pieChartRef = useRef<HTMLDivElement>(null)
  const barChartRef = useRef<HTMLDivElement>(null)
  
  // ECharts 实例存储
  const chartInstances = useRef<{
    loginChart?: echarts.ECharts
    scoreChart?: echarts.ECharts
    pieChart?: echarts.ECharts
    barChart?: echarts.ECharts
  }>({})

  useEffect(() => {
    fetchAllData()
  }, [])

  useEffect(() => {
    if (!loading) {
      initCharts()
    }
  }, [loading, loginData, scoreScatterData, expenseCategories, yearlyExpenseData])

  // 清理图表实例
  const disposeCharts = () => {
    Object.values(chartInstances.current).forEach(chart => {
      if (chart) {
        chart.dispose()
      }
    })
    chartInstances.current = {}
  }

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      disposeCharts()
    }
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchLoginTrends(),
        fetchScoreTrends(),
        fetchExpenseCategories(),
        fetchIncomeExpenseData(),
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

  const fetchIncomeExpenseData = async () => {
    try {
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('expense_type, amount, transaction_type, created_at, expense_date')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('获取费用数据失败:', error)
        setIncomeExpenseData(null)
        return
      }

      if (expenses && expenses.length > 0) {
        const currentYear = new Date().getFullYear()
        const startOfYear = new Date(currentYear, 0, 1).toISOString()
        
        // 处理今年数据
        const thisYearExpenses = expenses.filter(expense => 
          new Date(expense.created_at) >= new Date(startOfYear)
        )

        // 费用类型中文映射
        const getExpenseTypeText = (type: string) => {
          const incomeTypes: { [key: string]: string } = {
            'membership_sponsorship': '会费及赞助类',
            'collection': '代收类',
            'investment_finance': '投资及理财类',
            'other_income': '其他杂项',
            'membership_fee': '会费',
            'sponsorship_fee': '赞助费',
            'collected_competition_ball_fee': '代收比赛球费',
            'collected_handicap_fee': '代收差点费',
            'interest_income': '利息收入',
            'collected_meal_fee': '代收餐费',
            'gic_redemption': 'GIC 赎回',
            'other': '其他'
          }
          
          const expenseTypes: { [key: string]: string } = {
            'event_activity': '赛事与活动支出',
            'payment_on_behalf': '代付类',
            'finance_deposit': '理财存款',
            'other_misc': '其他杂费',
            'competition_prizes_misc': '比赛奖品及杂费',
            'event_meal_beverage': '活动餐费及酒水',
            'photographer_fee': '摄影师费用',
            'paid_handicap_fee': '代付差点费',
            'gic_deposit': '存GIC',
            'bank_fee': '银行费',
            'paid_competition_fee': '代付比赛费用',
            'refund': '退费',
            'equipment': '设备采购',
            'maintenance': '场地维护',
            'activity': '活动支出',
            'salary': '人员工资'
          }
          
          return incomeTypes[type] || expenseTypes[type] || type
        }

        // 分类统计
        const incomeData: { [key: string]: number } = {}
        const expenseData: { [key: string]: number } = {}

        thisYearExpenses.forEach(expense => {
          const type = expense.expense_type || '其他'
          const amount = expense.amount || 0
          
          if (expense.transaction_type === 'income') {
            incomeData[type] = (incomeData[type] || 0) + amount
          } else {
            expenseData[type] = (expenseData[type] || 0) + amount
          }
        })

        // 计算总额
        const incomeTotal = Object.values(incomeData).reduce((sum, val) => sum + val, 0)
        const expenseTotal = Object.values(expenseData).reduce((sum, val) => sum + val, 0)
        const grandTotal = incomeTotal + expenseTotal

        // 构建收入分类明细
        const incomeCategories = Object.entries(incomeData)
          .map(([type, amount]) => ({
            name: getExpenseTypeText(type),
            amount,
            percentage: grandTotal > 0 ? (amount / grandTotal) * 100 : 0
          }))
          .sort((a, b) => b.amount - a.amount)

        // 构建支出分类明细
        const expenseCategories = Object.entries(expenseData)
          .map(([type, amount]) => ({
            name: getExpenseTypeText(type),
            amount,
            percentage: grandTotal > 0 ? (amount / grandTotal) * 100 : 0
          }))
          .sort((a, b) => b.amount - a.amount)

        setIncomeExpenseData({
          income: {
            total: incomeTotal,
            categories: incomeCategories
          },
          expense: {
            total: expenseTotal,
            categories: expenseCategories
          }
        })
      } else {
        setIncomeExpenseData(null)
      }
    } catch (error) {
      console.error('获取收入支出数据失败:', error)
      setIncomeExpenseData(null)
    }
  }

  const fetchExpenseCategories = async () => {
    try {
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('expense_type, amount, transaction_type, created_at, expense_date')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('获取费用数据失败:', error)
        setYearlyExpenseData([])
        return
      }

      if (expenses && expenses.length > 0) {
        // 处理历年费用数据（按收入和支出分组）
        const yearlyData: { [year: string]: { 
          income: number; 
          expense: number; 
          incomeDetails: { [expenseType: string]: number };
          expenseDetails: { [expenseType: string]: number };
        } } = {}
        
        expenses.forEach(expense => {
          // 使用费用日期来确定年份，如果没有费用日期则使用创建时间
          const dateToUse = expense.expense_date || expense.created_at
          const year = new Date(dateToUse).getFullYear().toString()
          const transactionType = expense.transaction_type || 'expense'
          const expenseType = expense.expense_type || '其他'
          const amount = expense.amount || 0
          
          if (!yearlyData[year]) {
            yearlyData[year] = { income: 0, expense: 0, incomeDetails: {}, expenseDetails: {} }
          }
          
          if (transactionType === 'income') {
            yearlyData[year].income += amount
            // 保存收入详细分类信息用于tooltip
            if (!yearlyData[year].incomeDetails[expenseType]) {
              yearlyData[year].incomeDetails[expenseType] = 0
            }
            yearlyData[year].incomeDetails[expenseType] += amount
          } else {
            yearlyData[year].expense += amount
            // 保存支出详细分类信息用于tooltip
            if (!yearlyData[year].expenseDetails[expenseType]) {
              yearlyData[year].expenseDetails[expenseType] = 0
            }
            yearlyData[year].expenseDetails[expenseType] += amount
          }
        })

        // 费用类型中文映射
        const getExpenseTypeText = (type: string) => {
          const incomeTypes: { [key: string]: string } = {
            'membership_sponsorship': '会费及赞助类',
            'collection': '代收类',
            'investment_finance': '投资及理财类',
            'other_income': '其他杂项',
            'membership_fee': '会费',
            'sponsorship_fee': '赞助费',
            'collected_competition_ball_fee': '代收比赛球费',
            'collected_handicap_fee': '代收差点费',
            'interest_income': '利息收入',
            'collected_meal_fee': '代收餐费',
            'gic_redemption': 'GIC 赎回',
            'other': '其他'
          }
          
          const expenseTypes: { [key: string]: string } = {
            'event_activity': '赛事与活动支出',
            'payment_on_behalf': '代付类',
            'finance_deposit': '理财存款',
            'other_misc': '其他杂费',
            'competition_prizes_misc': '比赛奖品及杂费',
            'event_meal_beverage': '活动餐费及酒水',
            'photographer_fee': '摄影师费用',
            'paid_handicap_fee': '代付差点费',
            'gic_deposit': '存GIC',
            'bank_fee': '银行费',
            'paid_competition_fee': '代付比赛费用',
            'refund': '退费',
            'equipment': '设备采购',
            'maintenance': '场地维护',
            'activity': '活动支出',
            'salary': '人员工资'
          }
          
          return incomeTypes[type] || expenseTypes[type] || type
        }

        // 转换为图表数据格式 - 每年一行，包含收入和支出
        const barChartData: any[] = []
        Object.entries(yearlyData).forEach(([year, data]) => {
          const yearData: any = { 
            year: parseInt(year),
            income: data.income,
            expense: data.expense,
            incomeDetails: data.incomeDetails,
            expenseDetails: data.expenseDetails
          }
          barChartData.push(yearData)
        })

        // 按年份排序
        barChartData.sort((a, b) => a.year - b.year)
        
        setYearlyExpenseData(barChartData)
      } else {
        setYearlyExpenseData([])
      }
    } catch (error) {
      console.error('获取费用数据失败:', error)
      setYearlyExpenseData([])
    }
  }

  const initCharts = () => {
    // 先清理之前的图表实例
    disposeCharts()
    
    // 初始化登录趋势图表
    if (loginChartRef.current && loginData.length > 0) {
      const chart = echarts.init(loginChartRef.current)
      chartInstances.current.loginChart = chart
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
            itemStyle: { color: '#F15B98' }
          },
          {
            name: '登录会话数',
            type: 'line',
            data: loginData.map(item => item.total_sessions),
            smooth: true,
            itemStyle: { color: '#F8A5C2' }
          },
          {
            name: '手机登录',
            type: 'line',
            data: loginData.map(item => item.mobile),
            smooth: true,
            itemStyle: { color: '#F15B98' }
          },
          {
            name: '电脑登录',
            type: 'line',
            data: loginData.map(item => item.desktop),
            smooth: true,
            itemStyle: { color: '#F8A5C2' }
          }
        ]
      }
      chart.setOption(option)
    }

    // 初始化成绩趋势图表
    if (scoreChartRef.current && scoreScatterData.length > 0) {
      const chart = echarts.init(scoreChartRef.current)
      chartInstances.current.scoreChart = chart
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
            itemStyle: { color: '#F15B98' }
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
            itemStyle: { color: '#F8A5C2' }
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
            itemStyle: { color: '#F15B98' }
          }
        ]
      }
      chart.setOption(option)
    }

    // 初始化收入支出饼状图
    if (pieChartRef.current && incomeExpenseData) {
      const chart = echarts.init(pieChartRef.current)
      chartInstances.current.pieChart = chart
      
      const total = incomeExpenseData.income.total + incomeExpenseData.expense.total
      const incomePercentage = total > 0 ? (incomeExpenseData.income.total / total * 100).toFixed(2) : 0
      const expensePercentage = total > 0 ? (incomeExpenseData.expense.total / total * 100).toFixed(2) : 0

      // 构建收入扇形标签文本
      const incomeLabel = `收入\n${incomeExpenseData.income.total.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })} CAD\n${incomePercentage}%\n\n${incomeExpenseData.income.categories.map(cat => 
        `${cat.name}\n${cat.amount.toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })} CAD (${cat.percentage.toFixed(2)}%)`
      ).join('\n')}`

      // 构建支出扇形标签文本
      const expenseLabel = `支出\n${incomeExpenseData.expense.total.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })} CAD\n${expensePercentage}%\n\n${incomeExpenseData.expense.categories.map(cat => 
        `${cat.name}\n${cat.amount.toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })} CAD (${cat.percentage.toFixed(2)}%)`
      ).join('\n')}`

      const option = {
        title: {
          text: '今年费用分析',
          left: 'center',
          top: 5,
          textStyle: { fontSize: 16 }
        },
        tooltip: {
          trigger: 'item',
          formatter: (params: any) => {
            if (params.name === '收入') {
              return `收入<br/>总额: ${incomeExpenseData.income.total.toLocaleString('en-US', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })} CAD<br/>占比: ${incomePercentage}%<br/><br/>明细:<br/>${incomeExpenseData.income.categories.map(cat => 
                `${cat.name}: ${cat.amount.toLocaleString('en-US', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })} CAD (${cat.percentage.toFixed(2)}%)`
              ).join('<br/>')}`
            } else {
              return `支出<br/>总额: ${incomeExpenseData.expense.total.toLocaleString('en-US', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })} CAD<br/>占比: ${expensePercentage}%<br/><br/>明细:<br/>${incomeExpenseData.expense.categories.map(cat => 
                `${cat.name}: ${cat.amount.toLocaleString('en-US', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })} CAD (${cat.percentage.toFixed(2)}%)`
              ).join('<br/>')}`
            }
          }
        },
        legend: {
          show: true,
          orient: 'horizontal',
          left: 'center',
          bottom: 10,
          data: ['收入', '支出'],
          formatter: (name: string) => {
            return name
          },
          textStyle: {
            fontSize: 12,
            color: '#000'
          }
        },
        series: [
          {
            name: '收入支出',
            type: 'pie',
            radius: '70%',
            center: ['50%', '50%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 10,
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: true,
              position: 'inside',
              formatter: (params: any) => {
                if (params.name === '收入') {
                  return `收入\n${params.value.toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}`
                } else {
                  return `支出\n${params.value.toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}`
                }
              },
              fontSize: 14,
              fontWeight: 'bold',
              color: '#000',
              lineHeight: 20
            },
            labelLine: {
              show: false
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              },
              label: {
                fontSize: 16
              }
            },
            data: [
              {
                value: incomeExpenseData.income.total,
                name: '收入',
                itemStyle: { color: '#F15B98' }
              },
              {
                value: incomeExpenseData.expense.total,
                name: '支出',
                itemStyle: { color: '#F8A5C2' }
              }
            ]
          }
        ]
      }
      chart.setOption(option)
    }

    // 初始化柱状图
    if (barChartRef.current && yearlyExpenseData.length > 0) {
      const chart = echarts.init(barChartRef.current)
      chartInstances.current.barChart = chart
      
      // 费用类型中文映射（用于tooltip）
      const getExpenseTypeText = (type: string) => {
        const incomeTypes: { [key: string]: string } = {
          'membership_sponsorship': '会费及赞助类',
          'collection': '代收类',
          'investment_finance': '投资及理财类',
          'other_income': '其他杂项',
          'membership_fee': '会费',
          'sponsorship_fee': '赞助费',
          'collected_competition_ball_fee': '代收比赛球费',
          'collected_handicap_fee': '代收差点费',
          'interest_income': '利息收入',
          'collected_meal_fee': '代收餐费',
          'gic_redemption': 'GIC 赎回',
          'other': '其他'
        }
        
        const expenseTypes: { [key: string]: string } = {
          'event_activity': '赛事与活动支出',
          'payment_on_behalf': '代付类',
          'finance_deposit': '理财存款',
          'other_misc': '其他杂费',
          'competition_prizes_misc': '比赛奖品及杂费',
          'event_meal_beverage': '活动餐费及酒水',
          'photographer_fee': '摄影师费用',
          'paid_handicap_fee': '代付差点费',
          'gic_deposit': '存GIC',
          'bank_fee': '银行费',
          'paid_competition_fee': '代付比赛费用',
          'refund': '退费',
          'equipment': '设备采购',
          'maintenance': '场地维护',
          'activity': '活动支出',
          'salary': '人员工资'
        }
        
        return incomeTypes[type] || expenseTypes[type] || type
      }

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
          },
          formatter: (params: any) => {
            const year = params[0].axisValue
            const yearData = yearlyExpenseData.find(item => `${item.year}年` === year)
            if (!yearData) return ''
            
            let result = `${year}<br/>`
            let incomeAdded = false
            params.forEach((param: any) => {
              if (param.seriesName === '收入') {
                result += `${param.seriesName}: ${param.value.toLocaleString('en-US', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })} CAD<br/>`
                
                // 显示详细分类
                if (yearData.incomeDetails) {
                  const incomeDetails = Object.entries(yearData.incomeDetails)
                    .map(([type, amount]: [string, any]) => 
                      `  ${getExpenseTypeText(type)}: ${amount.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })} CAD`
                    )
                  if (incomeDetails.length > 0) {
                    result += `  明细:<br/>${incomeDetails.join('<br/>')}`
                  }
                }
                incomeAdded = true
              }
            })
            
            // 添加间距
            if (incomeAdded) {
              result += '<br/><br/>'
            }
            
            params.forEach((param: any) => {
              if (param.seriesName === '支出') {
                result += `${param.seriesName}: ${param.value.toLocaleString('en-US', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })} CAD<br/>`
                
                // 显示详细分类
                if (yearData.expenseDetails) {
                  const expenseDetails = Object.entries(yearData.expenseDetails)
                    .map(([type, amount]: [string, any]) => 
                      `  ${getExpenseTypeText(type)}: ${amount.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })} CAD`
                    )
                  if (expenseDetails.length > 0) {
                    result += `  明细:<br/>${expenseDetails.join('<br/>')}`
                  }
                }
              }
            })
            return result
          }
        },
        legend: {
          data: ['收入', '支出'],
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
        series: [
          {
            name: '收入',
            type: 'bar',
            data: yearlyExpenseData.map(item => item.income || 0),
            itemStyle: {
              color: '#F15B98'
            }
          },
          {
            name: '支出',
            type: 'bar',
            data: yearlyExpenseData.map(item => item.expense || 0),
            itemStyle: {
              color: '#F8A5C2'
            }
          }
        ]
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
    <div className="space-y-6 bg-gradient-to-br from-slate-50 to-gray-100 p-6 rounded-3xl shadow-xl border border-slate-200">
      {/* 第一行：用户活跃度趋势 + 待处理任务 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 用户活跃度趋势 */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-[#F15B98]/30 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#F15B98] to-[#F15B98]/80 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">用户活跃度趋势</h3>
              <p className="text-sm text-[#F15B98] font-medium">登录数据统计</p>
            </div>
          </div>
          <div className="h-80" ref={loginChartRef}></div>
        </div>

        {/* 待处理任务 */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gray-600 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">待处理任务</h3>
              <p className="text-xs text-gray-600 font-medium">需要您关注的事项</p>
            </div>
          </div>
          <div className="space-y-4">
            {/* 活动报名待批 */}
            <div className="bg-white rounded-2xl p-4 border border-[#F15B98]/30 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#F15B98] to-[#F15B98]/80 rounded-xl flex items-center justify-center mr-3 shadow-md">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-800">活动报名待批</span>
                    <p className="text-xs text-gray-600">需要审核的报名申请</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-[#F15B98]">{pendingRegistrations}</span>
                  <p className="text-xs text-gray-600 font-medium">待处理</p>
                </div>
              </div>
            </div>

            {/* 投资确认待批 */}
            <div className="bg-white rounded-2xl p-4 border border-[#F15B98]/30 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#F15B98] to-[#F15B98]/80 rounded-xl flex items-center justify-center mr-3 shadow-md">
                    <DollarSign className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-800">捐赠确认待批</span>
                    <p className="text-xs text-gray-600">需要确认的捐赠申请</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-[#F15B98]">{pendingInvestments}</span>
                  <p className="text-xs text-gray-600 font-medium">待处理</p>
                </div>
              </div>
            </div>

            {/* 快速操作按钮 */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={() => {
                  // 触发父组件的导航事件
                  const event = new CustomEvent('admin-navigate', { 
                    detail: { view: 'events' } 
                  })
                  window.dispatchEvent(event)
                }}
                className="px-4 py-2.5 text-sm bg-gradient-to-r from-[#F15B98] to-[#F15B98]/90 text-white rounded-lg hover:from-[#F15B98]/90 hover:to-[#F15B98]/80 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
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
                className="px-4 py-2.5 text-sm bg-gradient-to-r from-[#F15B98] to-[#F15B98]/90 text-white rounded-lg hover:from-[#F15B98]/90 hover:to-[#F15B98]/80 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
              >
                处理捐赠
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 第二行：成绩趋势分析 */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-[#F15B98]/30 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-[#F15B98] to-[#F15B98]/80 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">成绩趋势分析</h3>
            <p className="text-sm text-[#F15B98] font-medium">比赛成绩统计</p>
          </div>
        </div>
        <div className="h-80" ref={scoreChartRef}></div>
      </div>

      {/* 第三行：今年费用分析 + 历年费用趋势分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 今年费用分析 - 1/3 宽度 */}
        <div className="lg:col-span-1 bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-[#F15B98]/30 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#F15B98] to-[#F15B98]/80 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">今年费用分析</h3>
              <p className="text-sm text-[#F15B98] font-medium">费用分类统计</p>
            </div>
          </div>
          <div className="h-80" ref={pieChartRef}></div>
        </div>

        {/* 历年费用趋势分析 - 2/3 宽度 */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-[#F15B98]/30 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#F15B98] to-[#F15B98]/80 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">历年费用趋势</h3>
              <p className="text-sm text-[#F15B98] font-medium">费用变化趋势</p>
            </div>
          </div>
          <div className="h-80" ref={barChartRef}></div>
        </div>
      </div>
    </div>
  )
}

export default AdminAnalytics