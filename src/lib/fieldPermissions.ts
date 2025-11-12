/**
 * 字段权限配置
 * 定义每个表的每个字段可以被哪些角色修改
 */

export type UserRole = 'admin' | 'member' | 'editor'

export interface FieldPermission {
  [fieldName: string]: UserRole[]
}

export interface TablePermissions {
  [tableName: string]: FieldPermission
}

/**
 * 字段权限配置表
 * 格式：表名 -> 字段名 -> 允许的角色数组
 */
export const FIELD_PERMISSIONS: TablePermissions = {
  // 活动表权限
  events: {
    title: ['admin', 'editor'],
    description: ['admin', 'editor'],
    start_time: ['admin'],
    end_time: ['admin'],
    location: ['admin', 'editor'],
    fee: ['admin'],
    max_participants: ['admin'],
    registration_deadline: ['admin'],
    rules: ['admin', 'editor'],
    image_url: ['admin', 'editor'],
    status: ['admin'],
    event_type: ['admin'],
    scoring_mode: ['admin'],
    par_values: ['admin'],
    team_config: ['admin'],
    article_published: ['admin', 'editor'],
    article_featured_image_url: ['admin', 'editor'],
    article_content: ['admin', 'editor'],
    is_public: ['admin'],
  },

  // 用户资料表权限
  user_profiles: {
    full_name: ['admin'],
    member_number: ['admin'],
    phone: ['admin', 'member'], // 会员可以修改自己的电话
    email: ['admin'],
    role: ['admin'], // 只有管理员可以修改角色
    bc_handicap: ['admin', 'member'], // 会员可以修改自己的差点
    member_photo_url: ['admin', 'member'], // 会员可以修改自己的照片
    clothing_size_top: ['admin', 'member'],
    clothing_size_bottom: ['admin', 'member'],
    is_active: ['admin'],
  },

  // 活动报名表权限
  event_registrations: {
    participant_name: ['admin', 'member'], // 会员可以修改自己的报名信息
    payment_status: ['admin'],
    payment_proof_url: ['admin', 'member'],
    status: ['admin'],
    notes: ['admin'],
  },

  // 成绩表权限
  scores: {
    total_strokes: ['admin'],
    net_strokes: ['admin'],
    handicap: ['admin'],
    rank: ['admin'],
    notes: ['admin'],
    hole_scores: ['admin'],
    team_name: ['admin'],
    group_number: ['admin'],
  },

  // 访客成绩表权限
  guest_scores: {
    guest_name: ['admin'],
    total_strokes: ['admin'],
    net_strokes: ['admin'],
    handicap: ['admin'],
    rank: ['admin'],
    notes: ['admin'],
    hole_scores: ['admin'],
    team_name: ['admin'],
    group_number: ['admin'],
  },

  // 信息中心表权限
  information_items: {
    title: ['admin', 'editor'],
    content: ['admin', 'editor'],
    excerpt: ['admin', 'editor'],
    category: ['admin'],
    status: ['admin', 'editor'],
    priority: ['admin'],
    is_pinned: ['admin'],
    published_at: ['admin', 'editor'],
    expires_at: ['admin', 'editor'],
    featured_image_url: ['admin', 'editor'],
  },

  // 费用表权限
  expenses: {
    expense_type: ['admin'],
    transaction_type: ['admin'],
    title: ['admin'],
    amount: ['admin'],
    expense_date: ['admin'],
    payment_method: ['admin'],
    receipt_url: ['admin'],
    notes: ['admin'],
    status: ['admin'],
  },

  // 投资表权限
  investments: {
    project_name: ['admin'],
    investment_amount: ['admin'],
    investment_date: ['admin'],
    return_rate: ['admin'],
    status: ['admin'],
    notes: ['admin'],
  },
}

/**
 * 检查用户是否有权限修改指定表的指定字段
 * @param tableName 表名
 * @param fieldName 字段名
 * @param userRole 用户角色
 * @returns 是否有权限
 */
export function canModifyField(
  tableName: string,
  fieldName: string,
  userRole: UserRole
): boolean {
  const tablePermissions = FIELD_PERMISSIONS[tableName]
  if (!tablePermissions) {
    // 如果表不在配置中，默认只有管理员可以修改
    return userRole === 'admin'
  }

  const fieldPermissions = tablePermissions[fieldName]
  if (!fieldPermissions) {
    // 如果字段不在配置中，默认只有管理员可以修改
    return userRole === 'admin'
  }

  return fieldPermissions.includes(userRole)
}

/**
 * 检查用户是否有权限修改指定表的所有指定字段
 * @param tableName 表名
 * @param fields 字段名数组
 * @param userRole 用户角色
 * @returns 是否有权限修改所有字段
 */
export function canModifyFields(
  tableName: string,
  fields: string[],
  userRole: UserRole
): { allowed: boolean; deniedFields: string[] } {
  const deniedFields: string[] = []

  for (const field of fields) {
    if (!canModifyField(tableName, field, userRole)) {
      deniedFields.push(field)
    }
  }

  return {
    allowed: deniedFields.length === 0,
    deniedFields,
  }
}

/**
 * 获取用户可以修改的字段列表
 * @param tableName 表名
 * @param userRole 用户角色
 * @returns 可修改的字段名数组
 */
export function getModifiableFields(
  tableName: string,
  userRole: UserRole
): string[] {
  const tablePermissions = FIELD_PERMISSIONS[tableName]
  if (!tablePermissions) {
    return []
  }

  return Object.keys(tablePermissions).filter((field) =>
    canModifyField(tableName, field, userRole)
  )
}

