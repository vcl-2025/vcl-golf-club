-- 检查event_registrations表的RLS策略
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
WHERE tablename = 'event_registrations'
ORDER BY policyname;

-- 检查表是否有RLS启用
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'event_registrations';

-- 检查当前用户是否有删除权限
SELECT 
    table_name,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'event_registrations' 
AND grantee = current_user;

