# Bucket 整合方案

## 🎯 目标
将多个分散的 bucket 整合为更合理的设计

## 📋 当前问题
- 5个不同的 bucket 管理复杂
- 权限策略混乱
- 维护成本高

## ✅ 推荐方案：2个主要 Bucket

### 1. `golf-club-media` (图片存储)
```
用途：所有图片文件
权限：宽松的认证用户权限
结构：
├── posters/          # 海报图片
├── events/           # 活动图片
├── articles/         # 文章图片
└── avatars/          # 用户头像
```

### 2. `golf-club-documents` (文档存储)
```
用途：所有文档和凭证
权限：严格的权限控制
结构：
├── expenses/         # 费用凭证
├── payment-proofs/   # 支付证明
└── reports/          # 报告文档
```

## 🔧 迁移步骤

### 步骤1：创建新的 bucket
```sql
-- 创建媒体存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'golf-club-media',
  'golf-club-media', 
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
);

-- 创建文档存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'golf-club-documents',
  'golf-club-documents', 
  false, -- 私有
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);
```

### 步骤2：设置权限策略
```sql
-- 媒体存储桶权限（宽松）
CREATE POLICY "Allow authenticated users to manage media" ON storage.objects
FOR ALL USING (
  bucket_id = 'golf-club-media' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow public read access to media" ON storage.objects
FOR SELECT USING (bucket_id = 'golf-club-media');

-- 文档存储桶权限（严格）
CREATE POLICY "Allow admins to manage documents" ON storage.objects
FOR ALL USING (
  bucket_id = 'golf-club-documents' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);
```

### 步骤3：迁移现有文件
1. 使用 Supabase Storage API 迁移文件
2. 更新代码中的 bucket 引用
3. 测试所有功能

## 💡 优势
- **简化管理** - 只需管理2个 bucket
- **统一权限** - 每个 bucket 一套权限策略
- **清晰分类** - 按文件类型分类
- **易于扩展** - 新功能可以添加到对应分类

## ⚠️ 注意事项
- 需要迁移现有文件
- 需要更新所有代码引用
- 需要测试所有功能
- 建议在测试环境先验证






