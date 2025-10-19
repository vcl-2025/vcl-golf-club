-- 修复 poster-images 存储桶的 RLS 策略
-- 删除所有现有策略
DROP POLICY IF EXISTS "Authenticated users can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Payment proofs are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to poster-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to poster-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own files in poster-images" ON storage.objects;

-- 创建宽松的存储策略
CREATE POLICY "Allow authenticated users to upload to poster-images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'poster-images'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow public read access to poster-images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'poster-images'
);

CREATE POLICY "Allow authenticated users to delete from poster-images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'poster-images'
  AND auth.role() = 'authenticated'
);

-- 验证策略
SELECT policyname, cmd, qual FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%poster-images%';

