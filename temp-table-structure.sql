-- 使用临时表存储所有结果
-- 这样可以查看完整的执行结果

-- 创建临时表存储结果
CREATE TEMP TABLE IF NOT EXISTS table_analysis (
  query_type TEXT,
  table_name TEXT,
  column_name TEXT,
  data_type TEXT,
  is_nullable TEXT,
  column_default TEXT,
  constraint_info TEXT,
  size_info TEXT
);

-- 清空临时表
TRUNCATE TABLE table_analysis;

-- 1. 插入表基本信息
INSERT INTO table_analysis (query_type, table_name, column_name, data_type, is_nullable, column_default, constraint_info, size_info)
SELECT 
  'TABLE_INFO' as query_type,
  tablename as table_name,
  NULL as column_name,
  NULL as data_type,
  NULL as is_nullable,
  NULL as column_default,
  'Owner: ' || tableowner || ', Indexes: ' || CASE WHEN hasindexes THEN 'Yes' ELSE 'No' END as constraint_info,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size_info
FROM pg_tables 
WHERE schemaname = 'public';

-- 2. 插入列信息
INSERT INTO table_analysis (query_type, table_name, column_name, data_type, is_nullable, column_default, constraint_info, size_info)
SELECT 
  'COLUMN_INFO' as query_type,
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default,
  'Position: ' || c.ordinal_position as constraint_info,
  NULL as size_info
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE';

-- 3. 插入主键信息
INSERT INTO table_analysis (query_type, table_name, column_name, data_type, is_nullable, column_default, constraint_info, size_info)
SELECT 
  'PRIMARY_KEY' as query_type,
  tc.table_name,
  kcu.column_name,
  NULL as data_type,
  NULL as is_nullable,
  NULL as column_default,
  'Primary Key: ' || tc.constraint_name as constraint_info,
  NULL as size_info
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public';

-- 4. 插入外键信息
INSERT INTO table_analysis (query_type, table_name, column_name, data_type, is_nullable, column_default, constraint_info, size_info)
SELECT 
  'FOREIGN_KEY' as query_type,
  tc.table_name,
  kcu.column_name,
  NULL as data_type,
  NULL as is_nullable,
  NULL as column_default,
  'References: ' || ccu.table_name || '.' || ccu.column_name as constraint_info,
  NULL as size_info
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public';

-- 查看所有结果
SELECT * FROM table_analysis 
ORDER BY table_name, query_type, column_name;



