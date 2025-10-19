-- 检查现有的约束和索引
-- 避免重复创建

-- 1. 检查现有的外键约束
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'scores' 
  AND tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY';

-- 2. 检查现有的索引
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'scores' 
  AND schemaname = 'public'
ORDER BY indexname;

-- 3. 检查 event_id 字段是否存在
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'scores' 
  AND table_schema = 'public'
  AND column_name = 'event_id';

-- 4. 检查 event_id 字段的数据情况
SELECT 
  'event_id 字段状态' as status,
  COUNT(*) as total_records,
  COUNT(event_id) as records_with_event_id,
  COUNT(*) - COUNT(event_id) as records_without_event_id
FROM scores;



