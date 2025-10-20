-- 完全禁用存储桶的RLS
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- 验证RLS是否已禁用
SELECT relrowsecurity FROM pg_class WHERE relname = 'objects';



