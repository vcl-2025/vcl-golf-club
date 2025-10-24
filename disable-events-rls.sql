-- 完全禁用events表的RLS
ALTER TABLE events DISABLE ROW LEVEL SECURITY;

-- 验证RLS是否已禁用
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'events' AND schemaname = 'public';




