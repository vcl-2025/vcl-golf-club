import React, { useState } from 'react'
import { Search, Calendar, MapPin, Filter, ChevronDown, ChevronUp } from 'lucide-react'

interface UnifiedSearchProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  selectedYear: string
  onYearChange: (value: string) => void
  selectedMonth: string
  onMonthChange: (value: string) => void
  availableYears: number[]
  availableMonths?: Array<{ value: string; label: string }>
  placeholder?: string
  showLocationFilter?: boolean
  locationTerm?: string
  onLocationChange?: (value: string) => void
  showRoleFilter?: boolean
  selectedRole?: string
  onRoleChange?: (value: string) => void
  showExpenseTypeFilter?: boolean
  selectedExpenseType?: string
  onExpenseTypeChange?: (value: string) => void
  onClearFilters: () => void
}

export default function UnifiedSearch({
  searchTerm,
  onSearchChange,
  selectedYear,
  onYearChange,
  selectedMonth,
  onMonthChange,
  availableYears,
  availableMonths = [
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
  ],
  placeholder = "按名称搜索...",
  showLocationFilter = false,
  locationTerm = "",
  onLocationChange = () => {},
  showRoleFilter = false,
  selectedRole = "all",
  onRoleChange = () => {},
  showExpenseTypeFilter = false,
  selectedExpenseType = "all",
  onExpenseTypeChange = () => {},
  onClearFilters
}: UnifiedSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasActiveFilters = searchTerm || selectedYear || selectedMonth || (showLocationFilter && locationTerm) || (showRoleFilter && selectedRole !== 'all') || (showExpenseTypeFilter && selectedExpenseType !== 'all')

  return (
    <div className="bg-white rounded-2xl shadow-sm p-3 sm:p-6 mb-4 sm:mb-6">
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <div className="flex items-center">
          <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 mr-2" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">搜索和筛选</h3>
          {hasActiveFilters && (
            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              已筛选
            </span>
          )}
        </div>
        
        {/* 移动端折叠按钮 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="md:hidden flex items-center text-gray-500 hover:text-gray-700 transition-colors"
        >
          {isExpanded ? (
            <>
              <span className="text-xs mr-1">收起</span>
              <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              <span className="text-xs mr-1">展开</span>
              <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      </div>
      
      {/* 桌面端始终显示，移动端根据状态显示 */}
      <div className={`flex flex-col lg:flex-row gap-3 sm:gap-4 ${isExpanded ? 'block' : 'hidden md:flex'}`}>
        {/* 搜索框 - 占据剩余空间 */}
        <div className="flex-1">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            搜索
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-[#F15B98] text-sm"
            />
          </div>
        </div>

        {/* 地点筛选（可选） */}
        {showLocationFilter && (
          <div className="w-48">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              地点
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="按地点搜索..."
                value={locationTerm}
                onChange={(e) => onLocationChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-[#F15B98] text-sm"
              />
            </div>
          </div>
        )}

        {/* 年份和月份选择 - 一行显示 */}
        <div className="flex flex-row gap-2 sm:gap-4">
          <div className="w-32">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              年份
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={selectedYear}
                onChange={(e) => onYearChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-[#F15B98] appearance-none bg-white text-sm"
              >
                <option value="">全部年份</option>
                {availableYears.map(year => (
                  <option key={year} value={year.toString()}>{year}年</option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-32">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              月份
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={selectedMonth}
                onChange={(e) => onMonthChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-[#F15B98] appearance-none bg-white text-sm"
              >
                <option value="">全部月份</option>
                {availableMonths.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 角色筛选 */}
        {showRoleFilter && (
          <div className="w-32">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              角色
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={selectedRole}
                onChange={(e) => onRoleChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-[#F15B98] appearance-none bg-white text-sm"
              >
                <option value="all">所有角色</option>
                <option value="admin">管理员</option>
                <option value="member">普通会员</option>
              </select>
            </div>
          </div>
        )}

        {/* 费用类型筛选 */}
        {showExpenseTypeFilter && (
          <div className="w-32">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              费用类型
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={selectedExpenseType}
                onChange={(e) => {
                  // console.log('费用类型筛选变化:', e.target.value)
                  onExpenseTypeChange(e.target.value)
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15B98] focus:border-[#F15B98] appearance-none bg-white text-sm"
              >
                <option value="all">全部类型</option>
                <option value="equipment">设备采购</option>
                <option value="maintenance">场地维护</option>
                <option value="activity">活动支出</option>
                <option value="salary">人员工资</option>
                <option value="other">其他费用</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 清除过滤器按钮 */}
      {hasActiveFilters && (
        <div className="mt-2 sm:mt-4 flex justify-end">
          <button
            onClick={onClearFilters}
            className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            清除所有筛选
          </button>
        </div>
      )}
    </div>
  )
}

