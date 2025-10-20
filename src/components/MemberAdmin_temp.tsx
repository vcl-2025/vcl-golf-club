        {filteredMembers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchTerm || selectedRole !== 'all' || selectedYear !== 'all' || selectedMonth !== 'all' || showInactive
              ? '没有找到匹配的会员'
              : '暂无会员数据'
            }
          </div>
        )}
      </div>
    </div>
  )
}