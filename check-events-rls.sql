-- 检查events表的RLS策略
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;

-- 检查events表是否有RLS启用
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'events';

-- 检查当前用户对events表的权限
SELECT 
    table_name,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'events' 
AND grantee = current_user;




