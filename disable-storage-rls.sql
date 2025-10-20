-- 完全禁用storage.objects表的RLS
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- 验证RLS是否已禁用
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'objects' AND schemaname = 'storage';



