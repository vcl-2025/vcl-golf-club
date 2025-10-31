# 存储桶权限设置指南

## 问题
支付证明上传失败，错误：`new row violates row-level security policy`

## 解决方案

### 方法1：通过Supabase Dashboard设置（推荐）

1. **登录Supabase Dashboard**
   - 访问 https://supabase.com/dashboard
   - 选择您的项目

2. **进入Storage设置**
   - 点击左侧菜单的 "Storage"
   - 点击 "Buckets"

3. **检查event-images存储桶**
   - 如果不存在，点击 "New bucket" 创建
   - 名称：`event-images`
   - 设置为公开：✅ Public bucket

4. **设置存储桶策略**
   - 点击存储桶名称进入详情
   - 点击 "Policies" 标签
   - 删除所有现有策略
   - 添加新策略：

   **策略1：允许上传**
   - 名称：`Allow uploads`
   - 操作：`INSERT`
   - 目标角色：`authenticated`
   - 条件：`bucket_id = 'event-images'`

   **策略2：允许读取**
   - 名称：`Allow reads`
   - 操作：`SELECT`
   - 目标角色：`public`
   - 条件：`bucket_id = 'event-images'`

   **策略3：允许删除**
   - 名称：`Allow deletes`
   - 操作：`DELETE`
   - 目标角色：`authenticated`
   - 条件：`bucket_id = 'event-images'`

### 方法2：使用SQL（需要超级用户权限）

如果您有数据库超级用户权限，可以运行：

```sql
-- 禁用storage.objects的RLS
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

### 方法3：临时解决方案

如果以上方法都不行，可以修改代码，使用不同的存储桶或跳过图片上传：

1. **使用现有存储桶**
   - 检查是否有其他可用的存储桶
   - 修改代码中的存储桶名称

2. **暂时跳过图片上传**
   - 注释掉图片上传代码
   - 先让基本功能正常工作

## 验证设置

设置完成后，测试上传功能：
1. 刷新浏览器页面
2. 尝试提交报名申请
3. 检查控制台是否还有错误

## 联系支持

如果问题仍然存在，请联系Supabase支持团队获取帮助。






