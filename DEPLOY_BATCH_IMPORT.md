# 🚀 批量导入功能部署指南

## ❌ 错误说明

如果遇到错误：**"Failed to send a request to the Edge Function"**

这表示 `batch-import-users` Edge Function 还没有部署到 Supabase。

## ✅ 解决方案

### 方法一：使用 Supabase CLI 部署（推荐）

#### 1. 安装 Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# 或使用 npm
npm install -g supabase
```

#### 2. 登录 Supabase

```bash
supabase login
```

#### 3. 链接项目

```bash
# 在项目根目录执行
supabase link --project-ref your-project-ref
```

> 获取 project-ref：
> 1. 登录 Supabase Dashboard
> 2. 进入项目设置
> 3. 在 URL 中找到项目 ID（如：`https://xxxxx.supabase.co` 中的 `xxxxx`）

#### 4. 部署 Edge Function

```bash
supabase functions deploy batch-import-users
```

### 方法二：通过 Supabase Dashboard 部署

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 **Edge Functions** 页面
4. 点击 **Create a new function**
5. 函数名称：`batch-import-users`
6. 复制 `supabase/functions/batch-import-users/index.ts` 的内容
7. 粘贴到编辑器中
8. 点击 **Deploy**

### 方法三：使用 Supabase CLI 快速部署（如果已配置）

```bash
# 确保在项目根目录
cd /Users/lijingju/Desktop/golf_club_project

# 部署函数
supabase functions deploy batch-import-users --project-ref your-project-ref
```

## 🔍 验证部署

部署成功后，可以通过以下方式验证：

### 1. 在 Supabase Dashboard 中检查

- 进入 **Edge Functions** 页面
- 应该能看到 `batch-import-users` 函数
- 状态应该显示为 **Active**

### 2. 测试函数

在浏览器控制台中测试：

```javascript
const { data, error } = await supabase.functions.invoke('batch-import-users', {
  body: { 
    users: [{
      email: 'test@example.com',
      password: 'test123456',
      full_name: '测试用户',
      phone: '13800138000'
    }]
  }
})

console.log('结果:', data, error)
```

## 📋 部署前检查清单

- [ ] Supabase CLI 已安装
- [ ] 已登录 Supabase
- [ ] 项目已链接
- [ ] Edge Function 代码在 `supabase/functions/batch-import-users/index.ts`
- [ ] 有 Supabase 项目访问权限

## 🆘 常见问题

### Q: 提示 "command not found: supabase"
**A:** 需要先安装 Supabase CLI，参考上面的安装步骤。

### Q: 提示 "Project not found"
**A:** 检查 project-ref 是否正确，或使用 `supabase link` 重新链接。

### Q: 部署后仍然报错
**A:** 
1. 检查函数名称是否正确（必须是 `batch-import-users`）
2. 等待几分钟让部署生效
3. 刷新浏览器页面重试

### Q: 没有 Supabase CLI 访问权限
**A:** 使用方法二（通过 Dashboard）部署，不需要 CLI。

## 📝 注意事项

- Edge Function 部署需要几分钟时间
- 部署后建议等待 1-2 分钟再测试
- 确保 Supabase 项目有足够的配额
- 批量导入功能需要服务角色密钥权限

