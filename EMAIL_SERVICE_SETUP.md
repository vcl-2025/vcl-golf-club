# 📧 邮件服务配置指南

## 🎯 问题说明
目前邮件通知功能只是模拟发送，需要配置真实的邮件服务才能收到邮件。

## 🚀 推荐方案：使用 Resend 邮件服务

### 为什么选择 Resend？
- ✅ 免费额度：每月 3,000 封邮件
- ✅ 简单易用：API 简单，文档清晰
- ✅ 高送达率：专业的邮件发送服务
- ✅ 支持 HTML：支持富文本邮件
- ✅ 无需验证域名：可以直接使用

## 📋 配置步骤

### 1. 注册 Resend 账户
1. 访问 [https://resend.com](https://resend.com)
2. 点击 "Sign Up" 注册账户
3. 验证邮箱地址

### 2. 获取 API Key
1. 登录 Resend 控制台
2. 进入 "API Keys" 页面
3. 点击 "Create API Key"
4. 输入名称：`golf-club-email`
5. 选择权限：`Send emails`
6. 复制生成的 API Key（格式：`re_xxxxxxxxxx`）

### 3. 配置 Supabase 环境变量
1. 登录 Supabase 控制台
2. 进入你的项目
3. 点击 "Settings" → "Edge Functions"
4. 在 "Environment Variables" 中添加：
   - **Name**: `RESEND_API_KEY`
   - **Value**: `你的 Resend API Key`

### 4. 部署 Edge Functions
```bash
# 部署邮件发送功能
supabase functions deploy send-email

# 部署审批通知功能
supabase functions deploy send-approval-notification
```

## 🧪 测试邮件发送

### 1. 测试单个邮件发送
```javascript
// 在浏览器控制台中测试
const response = await fetch('https://your-project.supabase.co/functions/v1/send-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY'
  },
  body: JSON.stringify({
    to: 'your-email@example.com',
    subject: '测试邮件',
    html: '<h1>这是一封测试邮件</h1><p>如果您收到这封邮件，说明配置成功！</p>'
  })
})

const result = await response.json()
console.log(result)
```

### 2. 测试审批通知
1. 登录管理员账户
2. 进入活动管理页面
3. 审批一个报名申请
4. 检查用户邮箱是否收到邮件

## 🔧 其他邮件服务选项

### SendGrid
```typescript
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

### AWS SES
```typescript
// 需要配置 AWS SDK
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const sesClient = new SESClient({ region: 'us-east-1' })
const command = new SendEmailCommand({
  Source: 'noreply@golfclub.com',
  Destination: { ToAddresses: [to] },
  Message: {
    Subject: { Data: subject },
    Body: { Html: { Data: html } }
  }
})

await sesClient.send(command)
```

## 📊 邮件发送监控

### 1. 查看发送日志
- 在 Supabase 控制台查看 Edge Functions 日志
- 在 Resend 控制台查看发送统计

### 2. 常见问题排查
- **API Key 错误**：检查环境变量配置
- **发送失败**：检查收件人邮箱格式
- **垃圾邮件**：检查邮件内容是否被标记

## 🎨 邮件模板优化

### 1. 避免垃圾邮件标记
- 使用清晰的发件人名称
- 避免过多的营销词汇
- 包含退订链接
- 控制邮件频率

### 2. 提升送达率
- 验证发件人域名
- 设置 SPF、DKIM 记录
- 使用专业的邮件模板

## 📈 高级配置

### 1. 邮件模板管理
```typescript
const emailTemplates = {
  approval: {
    subject: '🎉 活动报名已批准',
    template: 'approval-template.html'
  },
  rejection: {
    subject: '❌ 活动报名未通过',
    template: 'rejection-template.html'
  }
}
```

### 2. 批量邮件发送
```typescript
// 批量发送邮件，避免频率限制
const batchSize = 10
const batches = chunk(recipients, batchSize)

for (const batch of batches) {
  await Promise.all(batch.map(sendEmail))
  await delay(1000) // 延迟1秒
}
```

## 🚨 注意事项

1. **API 限制**：注意邮件服务的发送限制
2. **成本控制**：监控邮件发送量，避免超出免费额度
3. **隐私保护**：确保用户邮箱信息安全
4. **合规要求**：遵守相关法律法规

## 🎯 下一步计划

1. **邮件模板**：创建更多邮件模板
2. **用户偏好**：允许用户设置邮件通知偏好
3. **邮件统计**：添加邮件发送统计功能
4. **多语言支持**：支持多语言邮件模板

---

**配置完成后，用户就能收到真实的邮件通知了！** 📧✨
