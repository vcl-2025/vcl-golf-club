-- 检查 get_event_registrations 存储过程是否存在
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'get_event_registrations' 
AND routine_schema = 'public';








