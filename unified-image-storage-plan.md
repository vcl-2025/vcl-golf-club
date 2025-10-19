# 统一图片存储方案

## 🎯 目标
将所有图片文件统一到一个 bucket 中管理

## 📋 当前问题
- 5个不同的 bucket 管理复杂
- 所有文件都是图片，没必要分开
- 权限策略重复

## ✅ 推荐方案：1个统一 Bucket

### `golf-club-images` (统一图片存储)
```
用途：所有图片文件
权限：统一的认证用户权限
结构：
├── posters/          # 海报图片
├── events/           # 活动图片
├── articles/         # 文章图片
├── avatars/          # 用户头像
├── expenses/         # 费用凭证图片
└── payment-proofs/   # 支付证明图片
```

## 🔧 实施步骤

### 步骤1：创建统一存储桶
```sql
-- 创建统一图片存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'golf-club-images',
  'golf-club-images', 
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
```

### 步骤2：设置统一权限策略
```sql
-- 删除所有旧策略
DROP POLICY IF EXISTS "允许认证用户操作 event-images" ON storage.objects;
DROP POLICY IF EXISTS "允许所有人查看 event-images" ON storage.objects;
DROP POLICY IF EXISTS "允许认证用户上传文章图片到poster-images" ON storage.objects;
DROP POLICY IF EXISTS "允许所有人查看poster-images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload expense receipts" ON storage.objects;

-- 创建统一策略
CREATE POLICY "允许认证用户管理所有图片" ON storage.objects
FOR ALL USING (
  bucket_id = 'golf-club-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "允许所有人查看图片" ON storage.objects
FOR SELECT USING (bucket_id = 'golf-club-images');
```

### 步骤3：更新代码引用
需要修改以下文件中的 bucket 名称：
- `src/utils/imageUpload.ts`
- `src/components/TinyMCEEditor.tsx`
- 其他上传图片的组件

### 步骤4：迁移现有文件
1. 从旧 bucket 下载文件
2. 上传到新 bucket 对应目录
3. 更新数据库中的文件路径

## 💡 优势
- **极简管理** - 只需1个 bucket
- **统一权限** - 一套策略搞定所有
- **成本最低** - 减少 bucket 数量
- **易于扩展** - 新功能直接添加目录

## ⚠️ 注意事项
- 需要迁移现有文件
- 需要更新所有代码引用
- 需要测试所有上传功能
- 建议在测试环境先验证

