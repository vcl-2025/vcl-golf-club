# 邮件通知功能设置指南

## 📧 功能概述

已为活动报名审批系统添加了邮件通知功能，当管理员批准或拒绝报名申请时，系统会自动发送邮件通知给相关用户。

## 🚀 已实现的功能

### 1. 单个审批邮件通知
- 批准报名时发送确认邮件
- 拒绝报名时发送拒绝邮件
- 包含活动详情和审批备注

### 2. 批量审批邮件通知
- 支持批量审批时的邮件通知
- 并行发送多个邮件通知
- 统计发送成功/失败数量

### 3. 邮件模板
- 美观的HTML邮件模板
- 响应式设计，支持移动端
- 包含俱乐部品牌元素

## 🛠️ 技术实现

### Edge Functions
- `send-email`: 基础邮件发送功能
- `send-approval-notification`: 审批通知专用功能

### 前端集成
- 在 `EventRegistrationAdmin.tsx` 中集成邮件通知
- 异步发送，不影响审批流程
- 错误处理，确保审批流程稳定

## 📋 部署步骤

### 1. 部署 Edge Functions

```bash
# 部署邮件发送功能
supabase functions deploy send-email

# 部署审批通知功能
supabase functions deploy send-approval-notification
```

### 2. 配置环境变量

在 Supabase 项目设置中添加以下环境变量：

```bash
# 邮件服务配置（选择一种）
SENDGRID_API_KEY=your_sendgrid_api_key
AWS_SES_ACCESS_KEY=your_aws_access_key
AWS_SES_SECRET_KEY=your_aws_secret_key
RESEND_API_KEY=your_resend_api_key
```

### 3. 更新邮件服务集成

在 `supabase/functions/send-email/index.ts` 中集成真实的邮件服务：

```typescript
// 示例：使用 SendGrid
const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    personalizations: [{ to: [{ email: to }] }],
    from: { email: 'noreply@golfclub.com' },
    subject: subject,
    content: [{ type: 'text/html', value: html }]
  })
})
```

## 🧪 测试功能

### 1. 使用测试页面
打开 `test-email-notification.html` 进行功能测试

### 2. 手动测试
1. 登录管理员账户
2. 进入活动管理页面
3. 审批一个报名申请
4. 检查控制台日志确认邮件发送状态

### 3. 检查邮件发送
- 开发环境：查看控制台输出
- 生产环境：检查用户邮箱

## 📊 邮件模板预览

### 批准邮件
```
🎉 活动报名已批准 - [活动名称]

亲爱的 [用户姓名]，

您的活动报名申请已处理完成：

[活动详情]
状态：已批准
备注：[审批备注]

🎉 恭喜！您已成功报名参加此活动。
```

### 拒绝邮件
```
❌ 活动报名未通过 - [活动名称]

亲爱的 [用户姓名]，

您的活动报名申请已处理完成：

[活动详情]
状态：未通过
备注：[拒绝原因]

很抱歉，您的报名申请未能通过。
```

## 🔧 自定义配置

### 1. 修改邮件模板
编辑 `supabase/functions/send-approval-notification/index.ts` 中的 `emailContent` 变量

### 2. 添加邮件服务
在 `supabase/functions/send-email/index.ts` 中集成其他邮件服务

### 3. 自定义发送逻辑
修改 `EventRegistrationAdmin.tsx` 中的邮件发送调用

## 🚨 注意事项

1. **邮件服务限制**：注意邮件服务的发送限制
2. **错误处理**：邮件发送失败不影响审批流程
3. **用户隐私**：确保用户邮箱信息安全
4. **垃圾邮件**：避免被标记为垃圾邮件

## 📈 监控和维护

### 1. 日志监控
- 检查 Edge Function 执行日志
- 监控邮件发送成功率

### 2. 性能优化
- 批量发送时使用 Promise.allSettled
- 异步发送，不阻塞主流程

### 3. 故障排除
- 检查环境变量配置
- 验证邮件服务API密钥
- 查看 Supabase 函数日志

## 🎯 下一步计划

1. **微信通知**：集成微信通知功能
2. **短信通知**：添加短信通知选项
3. **邮件模板**：更多邮件模板选择
4. **通知设置**：用户自定义通知偏好

---

**邮件通知功能已成功集成到活动报名审批系统中！** 🎉
