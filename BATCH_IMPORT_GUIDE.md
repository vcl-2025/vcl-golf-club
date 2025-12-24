# 批量导入用户功能使用指南

## 🎯 功能概述

在用户管理界面新增了**批量导入**功能，可以通过 **Excel (.xlsx, .xls)** 或 **CSV (.csv)** 文件一次性导入多个用户到系统中。

## 📋 CSV文件格式

### 必需字段
- `email` - 用户邮箱（唯一标识）
- `password` - 用户密码（至少6位）
- `full_name` - 用户姓名
- `phone` - 手机号码

### 可选字段
- `real_name` - 真实姓名（默认使用full_name）
- `golflive_name` - GolfLive 平台用户名
- `membership_type` - 会员类型（standard/premium/vip/basic，默认为basic）
- `role` - 角色（默认member）
- `handicap` - 差点（数字，如：12.3）
- `bc_handicap` - BC 差点（数字，如：9.3，非数字值会被忽略）
- `birthday` - 生日（日期格式：YYYY-MM-DD，如：1966-06-28）
- `clothing_size` - 服装尺寸
- `vancouver_residence` - 温哥华居住地
- `domestic_residence` - 国内居住地
- `main_club_membership` - 主要俱乐部会员
- `industry` - 行业
- `golf_preferences` - 高尔夫偏好
- `golf_motto` - 高尔夫座右铭
- `other_interests` - 其他兴趣

### Excel 表头说明
Excel 表格中的以下字段会被自动忽略（数据库中没有对应字段）：
- `填表人` - 仅用于记录，不会导入
- `微信名` - 仅用于记录，不会导入

## 📝 CSV示例

### 完整字段示例（匹配 Excel 表头）

```csv
email,password,full_name,golflive_name,real_name,phone,handicap,bc_handicap,vancouver_residence,domestic_residence,main_club_membership,birthday,industry,golf_motto,other_interests
cindyhehh@hotmail.com,88888888,天水,天水,何惠洪,7782237588,12.3,9.3,Richmond,上海,VCL,1966-06-28,,打球看世界,随心所至!,
liyu1112@gmail.com,88888888,yoyo li,yoyo li,李钰,7788550985,10,13.6,温西,江苏常州,无,2025-11-12,,,
Mariezhao@hotmail.com,88888888,Marie,Marie,Zhao Xin,6047803518,11.9,11.5,Vancouver,北京,Vcl,1967-12-22,地产,快乐高尔夫,看书,唱歌
```

### 最小必需字段示例

```csv
email,password,full_name,phone
user13@example.com,password123,张三,13800138013
user14@example.com,password123,李四,13800138014
```

## 🚀 使用步骤

1. **准备文件**
   - **方式一（推荐）**：直接使用 Excel 文件（.xlsx 或 .xls），无需转换
   - **方式二**：使用 Excel 或文本编辑器创建 CSV 文件
   - 确保包含所有必需字段
   - 如果使用 CSV，保存为 UTF-8 编码

2. **上传文件**
   - 进入用户管理界面
   - 点击"批量导入"按钮
   - 选择准备好的 Excel 或 CSV 文件
   - 系统会自动识别文件格式并解析

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
- **日期格式**：`birthday` 字段必须为 `YYYY-MM-DD` 格式（如：1966-06-28），格式不正确会被忽略
- **数字字段**：`handicap` 和 `bc_handicap` 必须是数字，非数字值（如"暂时没有"）会被忽略
- **会员类型**：如果未提供 `membership_type`，将自动设置为 `basic`
- **CSV 编码**：确保 CSV 文件使用 UTF-8 编码，以正确显示中文

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
1. **"文件缺少必需字段"**
   - 检查文件是否包含所有必需字段
   - 确保字段名称拼写正确
   - 检查 Excel 文件的第一行是否为表头

2. **"用户已存在"**
   - 检查邮箱是否重复
   - 删除重复记录或使用不同邮箱

3. **"创建认证用户失败"**
   - 检查密码是否符合要求
   - 确保邮箱格式正确

### 联系支持
如遇到技术问题，请联系系统管理员。
