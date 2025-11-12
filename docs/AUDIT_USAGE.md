# 审计功能使用指南

## 概述

审计功能提供了完整的数据变更追踪系统，可以记录所有数据修改操作，支持字段级别的变更追踪和权限控制。

## 功能特性

1. **字段级审计**：记录每个字段的旧值和新值
2. **权限控制**：基于角色的字段修改权限检查
3. **完整记录**：记录操作者、时间、IP地址、用户代理等信息
4. **查询界面**：管理员可以查看和筛选审计日志

## 使用步骤

### 1. 运行数据库迁移

首先需要运行数据库迁移来创建审计表：

```bash
# 在 Supabase Dashboard 中运行迁移文件
# 或使用 Supabase CLI
supabase migration up
```

迁移文件位置：`supabase/migrations/20250201000000_create_audit_log_table.sql`

### 2. 在代码中使用审计功能

#### 基本用法：更新数据

```typescript
import { updateWithAudit, createAuditContext } from '../lib/audit'
import { useAuth } from '../hooks/useAuth'

async function updateEvent(eventId: string, changes: any) {
  const { user } = useAuth()
  if (!user) return

  // 创建审计上下文
  const context = await createAuditContext(user.id)

  // 获取用户角色（从 user_profiles 表）
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = (profile?.role || 'member') as UserRole

  // 使用审计功能更新数据
  const { data, error } = await updateWithAudit(
    'events',           // 表名
    eventId,            // 记录ID
    changes,            // 要修改的字段和值
    context,            // 审计上下文
    userRole            // 用户角色
  )

  if (error) {
    console.error('更新失败:', error)
    return
  }

  console.log('更新成功:', data)
}
```

#### 插入数据

```typescript
import { insertWithAudit, createAuditContext } from '../lib/audit'

async function createEvent(eventData: any) {
  const { user } = useAuth()
  if (!user) return

  const context = await createAuditContext(user.id)
  const userRole = await getUserRole(user.id)

  const { data, error } = await insertWithAudit(
    'events',
    eventData,
    context,
    userRole
  )

  if (error) {
    console.error('创建失败:', error)
    return
  }

  console.log('创建成功:', data)
}
```

#### 删除数据

```typescript
import { deleteWithAudit, createAuditContext } from '../lib/audit'

async function deleteEvent(eventId: string) {
  const { user } = useAuth()
  if (!user) return

  const context = await createAuditContext(user.id)
  const userRole = await getUserRole(user.id)

  const { error } = await deleteWithAudit(
    'events',
    eventId,
    context,
    userRole
  )

  if (error) {
    console.error('删除失败:', error)
    return
  }

  console.log('删除成功')
}
```

### 3. 配置字段权限

在 `src/lib/fieldPermissions.ts` 中配置每个表的字段权限：

```typescript
export const FIELD_PERMISSIONS: TablePermissions = {
  events: {
    title: ['admin', 'editor'],        // admin 和 editor 可以修改
    start_time: ['admin'],             // 只有 admin 可以修改
    location: ['admin', 'editor'],     // admin 和 editor 可以修改
    // ...
  },
  // ...
}
```

### 4. 查看审计日志

管理员可以在管理面板中查看审计日志：

1. 登录管理员账号
2. 进入"管理员控制台"
3. 点击"审计日志"菜单
4. 使用筛选器查看特定条件的日志

## 权限说明

### 角色类型

- `admin`：管理员，可以修改所有字段
- `editor`：编辑者，可以修改部分字段
- `member`：普通会员，只能修改自己的部分字段

### 权限检查

系统会在每次数据修改前检查：
1. 用户是否有权限修改该表的该字段
2. 如果没有权限，操作会被拒绝并返回错误

## 审计日志字段说明

- `table_name`：被修改的表名
- `record_id`：被修改的记录ID
- `field_name`：被修改的字段名（NULL表示整行操作）
- `old_value`：旧值（JSON格式）
- `new_value`：新值（JSON格式）
- `operation`：操作类型（INSERT, UPDATE, DELETE）
- `user_id`：操作用户ID
- `user_email`：用户邮箱
- `user_role`：用户角色
- `ip_address`：IP地址
- `user_agent`：用户代理（浏览器信息）
- `created_at`：操作时间

## 注意事项

1. **性能考虑**：审计日志会记录所有变更，对于高频操作的表，可能需要定期清理旧日志
2. **存储空间**：审计日志会占用数据库空间，建议定期归档
3. **权限配置**：确保字段权限配置正确，避免误操作
4. **前端IP获取**：前端无法直接获取真实IP，需要通过后端API获取

## 集成示例

### 在 EventForm 中集成

```typescript
// 修改前
const { data, error } = await supabase
  .from('events')
  .update(changes)
  .eq('id', eventId)

// 修改后
const context = await createAuditContext(user.id)
const userRole = await getUserRole(user.id)
const { data, error } = await updateWithAudit(
  'events',
  eventId,
  changes,
  context,
  userRole
)
```

## 故障排查

### 问题：审计日志没有记录

1. 检查是否使用了 `updateWithAudit` 等审计函数
2. 检查用户是否有权限
3. 检查数据库迁移是否已运行
4. 检查 Supabase RLS 策略是否正确

### 问题：权限检查失败

1. 检查 `fieldPermissions.ts` 中的配置
2. 检查用户角色是否正确
3. 检查字段名是否匹配

## 后续优化建议

1. **数据恢复**：基于审计日志实现数据恢复功能
2. **批量操作**：优化批量操作的审计日志记录
3. **导出功能**：支持导出审计日志为 CSV/Excel
4. **统计分析**：添加审计日志的统计分析功能
5. **告警功能**：对敏感操作添加告警通知


