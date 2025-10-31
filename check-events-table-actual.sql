-- 直接查询 events 表的实际结构
-- 这个查询会返回 events 表的所有字段信息

SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 查询 events 表的约束信息
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'events' 
  AND tc.table_schema = 'public';

-- 查询 events 表的索引信息
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'events' 
  AND schemaname = 'public';

