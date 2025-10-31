-- 为 poster-images bucket 的 articles 文件夹设置权限
-- 用于 TinyMCE 编辑器上传的文章图片

-- 确保 poster-images bucket 存在
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'poster-images',
  'poster-images', 
  true,
  5242880, -- 5MB 限制
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "允许认证用户上传文章图片到poster-images" ON storage.objects;
DROP POLICY IF EXISTS "允许所有人查看poster-images" ON storage.objects;
DROP POLICY IF EXISTS "允许用户更新poster-images中的文章图片" ON storage.objects;
DROP POLICY IF EXISTS "允许用户删除poster-images中的文章图片" ON storage.objects;

-- 设置存储策略 - 允许认证用户上传图片到 articles 目录
CREATE POLICY "允许认证用户上传文章图片到poster-images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'poster-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'articles'
);

-- 设置存储策略 - 允许所有人查看 poster-images 中的图片
CREATE POLICY "允许所有人查看poster-images" ON storage.objects
FOR SELECT USING (bucket_id = 'poster-images');

-- 设置存储策略 - 允许认证用户更新 articles 目录中的图片
CREATE POLICY "允许用户更新poster-images中的文章图片" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'poster-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'articles'
);

-- 设置存储策略 - 允许认证用户删除 articles 目录中的图片
CREATE POLICY "允许用户删除poster-images中的文章图片" ON storage.objects
FOR DELETE USING (
  bucket_id = 'poster-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'articles'
);

-- 添加注释
COMMENT ON POLICY "允许认证用户上传文章图片到poster-images" ON storage.objects IS '允许认证用户上传文章图片到 poster-images/articles 目录';
COMMENT ON POLICY "允许所有人查看poster-images" ON storage.objects IS '允许所有人查看 poster-images 中的文件';
COMMENT ON POLICY "允许用户更新poster-images中的文章图片" ON storage.objects IS '允许用户更新 poster-images/articles 目录中的图片';
COMMENT ON POLICY "允许用户删除poster-images中的文章图片" ON storage.objects IS '允许用户删除 poster-images/articles 目录中的图片';






