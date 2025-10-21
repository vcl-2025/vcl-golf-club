# 📋 批量注册用户工具使用指南

## 🎯 功能说明

这个工具可以批量注册用户到 Supabase，同时写入 `auth.users` 和 `user_profiles` 表。

## 📦 安装依赖

```bash
# 安装依赖包
npm install @supabase/supabase-js csv-parser xlsx bcryptjs

# 或者使用提供的 package.json
npm install --package-lock-only
```

## 🔧 配置

1. **修改 Supabase 配置**：
   在 `batch-register-users.js` 中修改：
   ```javascript
   const supabaseKey = 'your-service-role-key' // 替换为您的服务角色密钥
   ```

2. **获取服务角色密钥**：
   - 登录 Supabase 控制台
   - 进入 Settings → API
   - 复制 "service_role" 密钥（不是 anon 密钥）

## 📄 数据格式

### CSV 格式示例：
```csv
email,password,full_name,phone,membership_type,real_name
user1@example.com,password123,张三,13800138001,standard,张三
user2@example.com,password123,李四,13800138002,premium,李四
user3@example.com,password123,王五,13800138003,vip,王五
```

### Excel 格式示例：
| email | password | full_name | phone | membership_type | real_name |
|-------|----------|-----------|-------|-----------------|-----------|
| user1@example.com | password123 | 张三 | 13800138001 | standard | 张三 |
| user2@example.com | password123 | 李四 | 13800138002 | premium | 李四 |

## 🚀 使用方法

### 1. 生成示例文件
```bash
node batch-register-users.js --generate-sample
```

### 2. 批量注册用户
```bash
# 从 CSV 文件注册
node batch-register-users.js users.csv

# 从 Excel 文件注册
node batch-register-users.js users.xlsx excel
```

## 📋 字段说明

### 必填字段：
- `email` - 用户邮箱（唯一）
- `password` - 用户密码（至少6位）
- `full_name` - 用户姓名

### 可选字段：
- `phone` - 手机号码
- `membership_type` - 会员类型（standard/premium/vip，默认 standard）
- `real_name` - 真实姓名

## 🔄 处理流程

1. **读取文件**：解析 CSV/Excel 文件
2. **数据验证**：检查必填字段和格式
3. **创建认证用户**：在 `auth.users` 表中创建用户
4. **创建用户资料**：在 `user_profiles` 表中创建资料
5. **错误处理**：如果用户资料创建失败，会删除已创建的认证用户

## 📊 输出结果

```
🚀 开始批量注册用户...
📊 读取到 3 个用户数据
✅ 验证通过 3 个用户
📝 注册用户: user1@example.com
✅ 用户 user1@example.com 注册成功
📝 注册用户: user2@example.com
✅ 用户 user2@example.com 注册成功

📋 注册结果:
✅ 成功: 2 个
❌ 失败: 1 个

❌ 失败详情:
1. user3@example.com: 邮箱已存在
```

## ⚠️ 注意事项

1. **服务角色密钥**：必须使用 service_role 密钥，anon 密钥权限不足
2. **邮箱唯一性**：每个邮箱只能注册一次
3. **密码安全**：建议使用强密码
4. **数据备份**：批量操作前建议备份数据
5. **错误处理**：失败的用户不会影响其他用户的注册

## 🛠️ 高级用法

### 自定义验证规则
```javascript
// 在 validateUserData 函数中添加自定义验证
if (user.membership_type && !['standard', 'premium', 'vip'].includes(user.membership_type)) {
  throw new Error('会员类型必须是 standard、premium 或 vip')
}
```

### 批量更新用户
```javascript
// 可以扩展为批量更新用户信息
const updateUsers = async (users) => {
  // 更新逻辑
}
```

## 🔍 故障排除

### 常见错误：

1. **"Invalid API key"**
   - 检查是否使用了正确的 service_role 密钥

2. **"Email already exists"**
   - 邮箱已存在，跳过或使用不同邮箱

3. **"Password too short"**
   - 密码长度至少6位

4. **"Missing required fields"**
   - 检查 CSV 文件是否包含所有必填字段

## 📞 技术支持

如有问题，请检查：
1. Supabase 服务是否正常运行
2. 服务角色密钥是否正确
3. 文件格式是否正确
4. 网络连接是否正常
