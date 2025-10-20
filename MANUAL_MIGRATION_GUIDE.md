# 手动数据迁移指南

## 🎯 迁移目标
将现有数据从多个存储桶迁移到统一的 `golf-club-images` 存储桶

## 📋 迁移步骤

### 步骤1：在 Supabase 中执行 SQL
```sql
-- 执行 create-unified-image-storage.sql
-- 这会创建统一存储桶和权限策略
```

### 步骤2：手动迁移文件（推荐方法）

#### 方法1：通过 Supabase Dashboard
1. **登录 Supabase Dashboard**
   - 访问：https://supabase.com/dashboard
   - 选择项目：`mypglmtsgfgojtnpmkbc`

2. **进入 Storage 页面**
   - 点击左侧菜单的 "Storage"
   - 点击 "Buckets"

3. **迁移每个存储桶**
   - 点击 `poster-images` 存储桶
   - 选择所有文件，下载到本地
   - 切换到 `golf-club-images` 存储桶
   - 创建 `posters` 文件夹
   - 上传文件到 `posters/` 目录

4. **重复以上步骤**
   - `event-images` -> `golf-club-images/events/`
   - `expenses` -> `golf-club-images/expenses/`
   - `avatars` -> `golf-club-images/avatars/`
   - `payment-proofs` -> `golf-club-images/payment-proofs/`

### 步骤3：更新数据库路径
```sql
-- 在 Supabase SQL 编辑器中执行
-- 执行 migrate-existing-data.sql
```

### 步骤4：验证迁移结果
```sql
-- 检查迁移结果
SELECT 'posters' as table_name, COUNT(*) as count FROM posters WHERE image_url LIKE '%golf-club-images%'
UNION ALL
SELECT 'events', COUNT(*) FROM events WHERE qr_code_url LIKE '%golf-club-images%'
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses WHERE receipt_url LIKE '%golf-club-images%'
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles WHERE avatar_url LIKE '%golf-club-images%'
UNION ALL
SELECT 'event_registrations', COUNT(*) FROM event_registrations WHERE payment_proof_url LIKE '%golf-club-images%'
UNION ALL
SELECT 'investment_projects', COUNT(*) FROM investment_projects WHERE qrcode_url LIKE '%golf-club-images%';
```

## 🔧 迁移映射表

| 旧存储桶 | 新路径 | 影响的数据表 |
|---------|--------|-------------|
| `poster-images` | `golf-club-images/posters` | `posters` |
| `event-images` | `golf-club-images/events` | `events` |
| `expenses` | `golf-club-images/expenses` | `expenses` |
| `avatars` | `golf-club-images/avatars` | `user_profiles` |
| `payment-proofs` | `golf-club-images/payment-proofs` | `event_registrations` |

## ⚠️ 注意事项

1. **备份数据** - 迁移前请备份所有数据
2. **逐步迁移** - 建议先迁移一个存储桶测试
3. **验证功能** - 迁移后测试所有上传/下载功能
4. **删除旧桶** - 确认无误后可以删除旧存储桶

## 🚀 迁移完成检查

- [ ] 统一存储桶已创建
- [ ] 所有文件已迁移到新路径
- [ ] 数据库路径已更新
- [ ] 所有图片正常显示
- [ ] 上传功能正常工作
- [ ] 删除旧存储桶（可选）

## 📞 如果遇到问题

1. **文件迁移失败** - 检查权限和网络连接
2. **数据库更新失败** - 检查 SQL 语法和表结构
3. **图片不显示** - 检查路径和权限设置
4. **上传失败** - 检查新存储桶权限



