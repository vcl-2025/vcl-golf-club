-- 简单的存储权限修复
-- 这个脚本不需要修改系统表，只需要创建策略

-- 确保 event-images bucket 存在
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images', 
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "允许所有认证用户操作 event-images" ON storage.objects;
DROP POLICY IF EXISTS "允许所有人查看 event-images" ON storage.objects;
DROP POLICY IF EXISTS "允许认证用户上传文章图片" ON storage.objects;
DROP POLICY IF EXISTS "允许所有人查看文章图片" ON storage.objects;

-- 创建新的宽松策略
CREATE POLICY "允许认证用户操作 event-images" ON storage.objects
FOR ALL USING (
  bucket_id = 'event-images' 
  AND auth.role() = 'authenticated'
);

-- 允许所有人查看 event-images 中的文件
CREATE POLICY "允许所有人查看 event-images" ON storage.objects
FOR SELECT USING (bucket_id = 'event-images');




