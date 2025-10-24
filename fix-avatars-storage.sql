-- 修复头像存储桶的 RLS 策略问题

-- 1. 确保存储桶存在
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. 删除所有现有的 avatars 相关策略
DROP POLICY IF EXISTS "Allow authenticated users to view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete avatars" ON storage.objects;

-- 3. 创建简单的策略 - 允许所有认证用户访问 avatars 存储桶
CREATE POLICY "Allow authenticated users to view avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated users to upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated users to update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated users to delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- 4. 验证设置
SELECT 'Storage bucket created' as status, id, name, public FROM storage.buckets WHERE id = 'avatars';
SELECT 'RLS policies created' as status, policyname, cmd FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE '%avatars%';






