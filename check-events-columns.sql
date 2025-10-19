-- 查看events表的列信息
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;
