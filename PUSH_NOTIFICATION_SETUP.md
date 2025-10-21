# 🔔 推送通知功能设置指南

## 📋 **功能概述**

为高尔夫俱乐部网站实现浏览器推送通知功能，用户可以在不打开网页的情况下接收：
- 活动开始前24小时提醒
- 报名确认通知
- 活动变更通知
- 紧急通知

## 🚀 **快速开始**

### **1. 环境变量配置**

在项目根目录创建 `.env.local` 文件：

```bash
# VAPID密钥（用于推送通知认证）
REACT_APP_VAPID_PUBLIC_KEY=你的VAPID公钥
VAPID_PUBLIC_KEY=你的VAPID公钥
VAPID_PRIVATE_KEY=你的VAPID私钥
```

### **2. 生成VAPID密钥**

```bash
# 安装web-push工具
npm install -g web-push

# 生成VAPID密钥对
web-push generate-vapid-keys
```

### **3. 数据库设置**

执行SQL脚本创建推送订阅表：

```bash
# 在Supabase SQL编辑器中执行
psql -h your-db-host -U postgres -d postgres -f create-push-subscriptions-table.sql
```

### **4. 部署Edge Function**

```bash
# 部署推送通知Edge Function
supabase functions deploy send-push-notification
```

## 🔧 **详细配置**

### **Service Worker配置**

`public/sw.js` 文件已配置：
- 推送通知处理
- 通知点击事件
- 缓存策略
- 振动和声音设置

### **推送通知管理组件**

`src/components/PushNotificationManager.tsx` 提供：
- 权限请求
- 订阅管理
- 测试通知
- 状态显示

### **Edge Function配置**

`supabase/functions/send-push-notification/index.ts` 支持：
- 批量推送
- 个性化通知
- 错误处理
- 推送统计

## 📱 **使用方式**

### **用户端**

1. **启用通知**：
   - 用户打开个人资料页面
   - 点击"推送通知设置"
   - 点击"启用通知"按钮
   - 浏览器会弹出权限请求

2. **订阅推送**：
   - 权限授权后，自动订阅推送
   - 可以测试通知功能
   - 可以随时取消订阅

### **管理员端**

1. **发送推送通知**：
   ```javascript
   // 调用Edge Function发送推送
   const { data, error } = await supabase.functions.invoke('send-push-notification', {
     body: {
       user_id: 'user-uuid',
       title: '活动提醒',
       message: '明天上午9点高尔夫活动',
       data: { event_id: 'event-uuid' },
       url: '/events/event-uuid'
     }
   });
   ```

2. **批量推送**：
   ```javascript
   // 发送给所有订阅用户
   const { data, error } = await supabase.functions.invoke('send-push-notification', {
     body: {
       user_id: 'all', // 特殊标识，发送给所有用户
       title: '系统通知',
       message: '网站维护通知'
     }
   });
   ```

## 🎯 **推送场景**

### **1. 活动提醒**
```javascript
// 活动开始前24小时
await sendPushNotification({
  user_id: participant.user_id,
  title: '活动提醒',
  message: `明天上午9点${event.title}，记得带球杆！`,
  data: { event_id: event.id },
  url: `/events/${event.id}`
});
```

### **2. 报名确认**
```javascript
// 用户报名成功后
await sendPushNotification({
  user_id: user.id,
  title: '报名成功',
  message: `已成功报名${event.title}，活动时间：${event.start_time}`,
  data: { event_id: event.id },
  url: `/events/${event.id}`
});
```

### **3. 活动取消**
```javascript
// 活动取消时
await sendPushNotification({
  user_id: participant.user_id,
  title: '活动取消',
  message: `${event.title}因天气原因取消，已为您退款`,
  data: { event_id: event.id },
  url: `/events/${event.id}`
});
```

## 🔍 **测试功能**

### **测试页面**

访问 `http://localhost:5173/test-push-notification.html` 进行测试：

1. **权限测试**：检查浏览器支持、权限状态
2. **订阅测试**：测试推送订阅功能
3. **通知测试**：发送测试通知
4. **取消测试**：测试取消订阅

### **测试步骤**

1. 打开测试页面
2. 点击"请求权限"
3. 点击"订阅推送"
4. 点击"测试通知"
5. 检查手机通知栏

## 📊 **推送统计**

### **数据库表结构**

```sql
-- 推送订阅表
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  subscription JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 推送日志表（可选）
CREATE TABLE push_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'sent'
);
```

### **推送效果统计**

- 订阅用户数量
- 推送成功率
- 点击率统计
- 取消订阅率

## 🛠 **故障排除**

### **常见问题**

1. **权限被拒绝**：
   - 检查浏览器设置
   - 清除网站数据重新授权
   - 使用HTTPS协议

2. **订阅失败**：
   - 检查VAPID密钥配置
   - 确认Service Worker注册
   - 检查网络连接

3. **通知不显示**：
   - 检查浏览器通知设置
   - 确认权限已授权
   - 检查通知内容格式

### **调试工具**

1. **浏览器开发者工具**：
   - Application > Service Workers
   - Application > Storage > IndexedDB
   - Console > 查看错误日志

2. **测试页面**：
   - 实时状态显示
   - 详细错误信息
   - 操作日志记录

## 🔒 **安全考虑**

### **权限控制**

- 用户只能管理自己的推送订阅
- 管理员可以发送系统通知
- 敏感操作需要二次确认

### **数据保护**

- 推送订阅信息加密存储
- 定期清理无效订阅
- 用户隐私保护

## 📈 **性能优化**

### **推送优化**

- 批量推送减少请求
- 异步处理避免阻塞
- 错误重试机制
- 推送频率限制

### **用户体验**

- 个性化通知内容
- 智能推送时机
- 用户偏好设置
- 通知分类管理

## 🎉 **完成设置**

推送通知功能设置完成后，用户将能够：

✅ 接收活动提醒通知  
✅ 接收报名确认通知  
✅ 接收活动变更通知  
✅ 在手机通知栏查看  
✅ 点击通知直接打开网站  
✅ 自定义通知设置  

现在您的网站具备了完整的推送通知功能！🚀
