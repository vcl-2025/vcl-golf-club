# 数据迁移指南

## 🎯 迁移目标
将现有数据从多个存储桶迁移到统一的 `golf-club-images` 存储桶

## 📋 迁移步骤

### 步骤1：迁移存储文件
```bash
# 1. 安装依赖
npm install @supabase/supabase-js

# 2. 配置环境变量
export SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_KEY="your_service_role_key"

# 3. 执行文件迁移
node migrate-storage-files.js
```

### 步骤2：更新数据库路径
```sql
-- 在 Supabase SQL 编辑器中执行
-- 执行 migrate-existing-data.sql
```

### 步骤3：验证迁移结果
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
2. **权限要求** - 需要 Supabase 服务角色密钥
3. **测试验证** - 迁移后测试所有功能
4. **逐步迁移** - 建议先在测试环境验证

## 🚀 迁移完成检查

- [ ] 存储文件已迁移到新路径
- [ ] 数据库路径已更新
- [ ] 所有图片正常显示
- [ ] 上传功能正常工作
- [ ] 删除旧存储桶（可选）

## 📞 如果遇到问题

1. **文件迁移失败** - 检查权限和网络连接
2. **数据库更新失败** - 检查 SQL 语法和表结构
3. **图片不显示** - 检查路径和权限设置
4. **上传失败** - 检查新存储桶权限




