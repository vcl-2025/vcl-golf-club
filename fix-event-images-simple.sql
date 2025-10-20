-- 为 event-images 创建简单的宽松策略（类似 poster-images）

-- 删除所有复杂的策略
DROP POLICY IF EXISTS "允许认证用户上传文章图片" ON storage.objects;
DROP POLICY IF EXISTS "允许所有人查看文章图片" ON storage.objects;
DROP POLICY IF EXISTS "允许用户更新自己的文章图片" ON storage.objects;
DROP POLICY IF EXISTS "允许用户删除自己的文章图片" ON storage.objects;
DROP POLICY IF EXISTS "允许认证用户操作 event-images" ON storage.objects;
DROP POLICY IF EXISTS "允许所有人查看 event-images" ON storage.objects;

-- 创建简单的宽松策略（类似 poster-images）
CREATE POLICY "Allow authenticated users to upload to event-images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'event-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow public read access to event-images" ON storage.objects
FOR SELECT USING (bucket_id = 'event-images');

CREATE POLICY "Allow authenticated users to delete from event-images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'event-images' 
  AND auth.role() = 'authenticated'
);

-- 验证策略
SELECT policyname, cmd, qual FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%event-images%';



