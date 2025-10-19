-- 创建统一图片存储桶
-- 将所有图片文件统一到一个 bucket 中管理

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

-- 删除所有旧策略（避免冲突）
DROP POLICY IF EXISTS "允许认证用户操作 event-images" ON storage.objects;
DROP POLICY IF EXISTS "允许所有人查看 event-images" ON storage.objects;
DROP POLICY IF EXISTS "允许认证用户上传文章图片到poster-images" ON storage.objects;
DROP POLICY IF EXISTS "允许所有人查看poster-images" ON storage.objects;
DROP POLICY IF EXISTS "允许用户更新poster-images中的文章图片" ON storage.objects;
DROP POLICY IF EXISTS "允许用户删除poster-images中的文章图片" ON storage.objects;
DROP POLICY IF EXISTS "Public can view expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete expense receipts" ON storage.objects;

-- 创建统一策略 - 允许认证用户管理所有图片
CREATE POLICY "允许认证用户管理所有图片" ON storage.objects
FOR ALL USING (
  bucket_id = 'golf-club-images' 
  AND auth.role() = 'authenticated'
);

-- 创建统一策略 - 允许所有人查看图片
CREATE POLICY "允许所有人查看图片" ON storage.objects
FOR SELECT USING (bucket_id = 'golf-club-images');

-- 验证存储桶创建成功
SELECT 
  id, 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'golf-club-images';

