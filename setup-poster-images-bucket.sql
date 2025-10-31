-- 创建 poster-images 存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('poster-images', 'poster-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 删除旧的策略（如果存在）
DROP POLICY IF EXISTS "Public can view poster images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload poster images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update poster images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete poster images" ON storage.objects;

-- 创建新的策略
CREATE POLICY "Public can view poster images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'poster-images');

CREATE POLICY "Authenticated users can upload poster images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'poster-images');

CREATE POLICY "Authenticated users can update poster images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'poster-images');

CREATE POLICY "Authenticated users can delete poster images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'poster-images');

-- 验证存储桶是否创建成功
SELECT 
  id, 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'poster-images';






