# 批量导入用户功能使用指南

## 🎯 功能概述

在用户管理界面新增了**批量导入**功能，可以通过CSV文件一次性导入多个用户到系统中。

## 📋 CSV文件格式

### 必需字段
- `email` - 用户邮箱（唯一标识）
- `password` - 用户密码（至少6位）
- `full_name` - 用户姓名
- `phone` - 手机号码
- `membership_type` - 会员类型（standard/premium/vip）

### 可选字段
- `real_name` - 真实姓名（默认使用full_name）
- `role` - 角色（默认member）
- `handicap` - 差点
- `clothing_size` - 服装尺寸
- `vancouver_residence` - 温哥华居住地
- `domestic_residence` - 国内居住地
- `main_club_membership` - 主要俱乐部会员
- `industry` - 行业
- `golf_preferences` - 高尔夫偏好
- `golf_motto` - 高尔夫座右铭
- `other_interests` - 其他兴趣

## 📝 CSV示例

```csv
email,password,full_name,real_name,phone,membership_type,role,handicap,clothing_size,vancouver_residence,domestic_residence,main_club_membership,industry,golf_preferences,golf_motto,other_interests
user13@example.com,password123,张三,张三,13800138013,standard,member,18,L,温哥华,北京,温哥华高尔夫俱乐部,IT,喜欢挑战性球场,永不放弃,摄影
user14@example.com,password123,李四,李四,13800138014,premium,member,12,M,温哥华,上海,温哥华高尔夫俱乐部,金融,喜欢风景优美的球场,享受高尔夫,旅游
user15@example.com,password123,王五,王五,13800138015,vip,member,8,XL,温哥华,广州,温哥华高尔夫俱乐部,房地产,喜欢竞技性球场,追求完美,音乐
```

## 🚀 使用步骤

1. **准备CSV文件**
   - 使用Excel或文本编辑器创建CSV文件
   - 确保包含所有必需字段
   - 保存为UTF-8编码

2. **上传文件**
   - 进入用户管理界面
   - 点击"批量导入"按钮
   - 选择准备好的CSV文件

3. **查看结果**
   - 系统会显示导入进度
   - 完成后显示成功/失败统计
   - 如有错误会显示详细错误信息

## ⚠️ 注意事项

- **邮箱唯一性**：系统会检查邮箱是否已存在，重复邮箱会跳过
- **数据验证**：缺少必需字段的用户会被跳过
- **密码安全**：建议使用强密码，避免使用简单密码
- **文件大小**：建议单次导入不超过100个用户
- **备份数据**：导入前建议备份现有数据

## 🔧 技术实现

- **前端**：React组件处理文件上传和结果展示
- **后端**：Supabase Edge Function处理批量创建
- **数据库**：同时写入`auth.users`和`user_profiles`表
- **错误处理**：完整的错误回滚机制

## 📊 导入结果

导入完成后会显示：
- ✅ 成功导入的用户数量
- ❌ 失败的用户数量
- 📋 详细错误信息（如有）

## 🆘 故障排除

### 常见错误
1. **"CSV文件缺少必需字段"**
   - 检查CSV文件是否包含所有必需字段
   - 确保字段名称拼写正确

2. **"用户已存在"**
   - 检查邮箱是否重复
   - 删除重复记录或使用不同邮箱

3. **"创建认证用户失败"**
   - 检查密码是否符合要求
   - 确保邮箱格式正确

### 联系支持
如遇到技术问题，请联系系统管理员。
