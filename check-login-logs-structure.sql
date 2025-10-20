-- 检查 login_logs 表结构
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'login_logs' 
AND table_schema = 'public'
ORDER BY ordinal_position;





