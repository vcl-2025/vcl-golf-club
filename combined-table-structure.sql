-- 合并所有表结构查询结果
-- 使用 UNION ALL 将所有结果合并到一个结果集中

-- 1. 表基本信息
SELECT 
  'table_info' as query_type,
  tablename as table_name,
  tableowner as owner,
  CASE WHEN hasindexes THEN 'Yes' ELSE 'No' END as has_indexes,
  CASE WHEN hasrules THEN 'Yes' ELSE 'No' END as has_rules,
  CASE WHEN hastriggers THEN 'Yes' ELSE 'No' END as has_triggers,
  NULL as column_name,
  NULL as data_type,
  NULL as is_nullable,
  NULL as column_default
FROM pg_tables 
WHERE schemaname = 'public'

UNION ALL

-- 2. 列信息
SELECT 
  'column_info' as query_type,
  t.table_name,
  NULL as owner,
  NULL as has_indexes,
  NULL as has_rules,
  NULL as has_triggers,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'

ORDER BY query_type, table_name, column_name;






