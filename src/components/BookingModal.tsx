import React, { useState, useEffect } from 'react'
import { X, Calendar, Clock, Users, MapPin, DollarSign } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Course } from '../types'

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  user: any
}

export default function BookingModal({ isOpen, onClose, user }: BookingModalProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [bookingDate, setBookingDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [playersCount, setPlayersCount] = useState(1)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchCourses()
      // 设置默认日期为明天
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setBookingDate(tomorrow.toISOString().split('T')[0])
    }
  }, [isOpen])

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('获取球场信息失败:', error)
    } else {
      setCourses(data || [])
      if (data && data.length > 0) {
        setSelectedCourse(data[0].id)
      }
    }
  }

  const calculateEndTime = (start: string) => {
    const [hours, minutes] = start.split(':').map(Number)
    const endHours = hours + 4 // 假设每轮需要4小时
    return `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  const calculateTotalPrice = () => {
    const course = courses.find(c => c.id === selectedCourse)
    if (!course) return 0
    return course.price_per_round * playersCount
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setMessage('请先登录')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const endTime = calculateEndTime(startTime)
      const totalPrice = calculateTotalPrice()

      const { error } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          course_id: selectedCourse,
          booking_date: bookingDate,
          start_time: startTime,
          end_time: endTime,
          players_count: playersCount,
          total_price: totalPrice,
          notes: notes,
          status: 'pending'
        })

      if (error) throw error

      setMessage('预订成功！我们会尽快确认您的预订。')
      setTimeout(() => {
        onClose()
        // 重置表单
        setSelectedCourse('')
        setBookingDate('')
        setStartTime('')
        setPlayersCount(1)
        setNotes('')
        setMessage('')
      }, 2000)
    } catch (error: any) {
      setMessage(error.message || '预订失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const selectedCourseData = courses.find(c => c.id === selectedCourse)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">球场预订</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 球场选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择球场
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                required
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} - ¥{course.price_per_round}/人
                  </option>
                ))}
              </select>
            </div>

            {/* 球场信息展示 */}
            {selectedCourseData && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start space-x-4">
                  <img
                    src={selectedCourseData.image_url || 'https://via.placeholder.com/80x80/4ade80/ffffff?text=课程'}
                    alt={selectedCourseData.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{selectedCourseData.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{selectedCourseData.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {selectedCourseData.holes}洞
                      </span>
                      <span>标准杆{selectedCourseData.par}</span>
                      <span className="capitalize">{selectedCourseData.difficulty}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 预订日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                预订日期
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* 开始时间 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                开始时间
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  min="06:00"
                  max="18:00"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                  required
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                营业时间：06:00 - 22:00（预计每轮4小时）
              </p>
            </div>

            {/* 球员数量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                球员数量
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={playersCount}
                  onChange={(e) => setPlayersCount(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                >
                  <option value={1}>1人</option>
                  <option value={2}>2人</option>
                  <option value={3}>3人</option>
                  <option value={4}>4人</option>
                </select>
              </div>
            </div>

            {/* 备注 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                备注信息（可选）
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                placeholder="请输入特殊要求或备注信息..."
              />
            </div>

            {/* 价格总计 */}
            <div className="bg-golf-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900">总计费用</span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-golf-600">
                    ¥{calculateTotalPrice().toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {playersCount}人 × ¥{selectedCourseData?.price_per_round || 0}
                  </div>
                </div>
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.includes('成功') 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {message}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-primary py-3 disabled:opacity-50"
              >
                {loading ? '预订中...' : '确认预订'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}