-- 分析活动相关表的设计
-- 专门查看 events 表和相关的表结构

-- 1. 查看 events 表的详细结构
SELECT 
  'EVENTS_TABLE' as analysis_type,
  c.column_name,
  c.data_type,
  c.character_maximum_length,
  c.is_nullable,
  c.column_default,
  c.ordinal_position,
  CASE 
    WHEN c.column_name = 'id' THEN '主键'
    WHEN c.column_name LIKE '%_id' THEN '外键'
    WHEN c.column_name LIKE '%_date' OR c.column_name LIKE '%_time' THEN '时间字段'
    WHEN c.column_name LIKE '%_status' THEN '状态字段'
    WHEN c.column_name LIKE '%_name' OR c.column_name = 'title' THEN '名称字段'
    ELSE '其他字段'
  END as field_category
FROM information_schema.columns c
WHERE c.table_name = 'events' 
  AND c.table_schema = 'public'
ORDER BY c.ordinal_position;

-- 2. 查看 events 表的约束
SELECT 
  'CONSTRAINTS' as analysis_type,
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
WHERE tc.table_name = 'events' 
  AND tc.table_schema = 'public';

-- 3. 查看与 events 相关的表
SELECT 
  'RELATED_TABLES' as analysis_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS references_events,
  ccu.column_name AS references_column,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE ccu.table_name = 'events' 
  AND tc.table_schema = 'public';

-- 4. 查看 events 表的索引
SELECT 
  'INDEXES' as analysis_type,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'events' 
  AND schemaname = 'public';

-- 5. 查看 events 表的数据样本（前5条）
SELECT 
  'SAMPLE_DATA' as analysis_type,
  id,
  title,
  event_date,
  end_date,
  location,
  status,
  created_at
FROM events 
ORDER BY created_at DESC 
LIMIT 5;





