-- 全面的表设计分析
-- 分析整个数据库的表设计问题

-- 1. 所有表的基本信息
SELECT 
  'TABLE_OVERVIEW' as analysis_type,
  t.table_name,
  COUNT(c.column_name) as column_count,
  pg_size_pretty(pg_total_relation_size('public.'||t.table_name)) as table_size,
  CASE 
    WHEN t.table_name LIKE '%event%' THEN '活动相关'
    WHEN t.table_name LIKE '%user%' OR t.table_name LIKE '%profile%' THEN '用户相关'
    WHEN t.table_name LIKE '%score%' THEN '成绩相关'
    WHEN t.table_name LIKE '%registration%' THEN '报名相关'
    WHEN t.table_name LIKE '%investment%' THEN '投资相关'
    WHEN t.table_name LIKE '%poster%' THEN '海报相关'
    ELSE '其他'
  END as table_category
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name
ORDER BY table_category, t.table_name;

-- 2. 检查可能的设计问题
-- 2.1 缺少主键的表
SELECT 
  'MISSING_PRIMARY_KEY' as issue_type,
  t.table_name,
  '缺少主键' as issue_description
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND t.table_name NOT IN (
    SELECT tc.table_name 
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = 'public'
  );

-- 2.2 缺少外键约束的表
SELECT 
  'POTENTIAL_FK_ISSUES' as issue_type,
  c.table_name,
  c.column_name,
  CASE 
    WHEN c.column_name LIKE '%_id' AND c.column_name != 'id' THEN '可能是外键但缺少约束'
    WHEN c.column_name = 'user_id' THEN '用户ID字段'
    WHEN c.column_name = 'event_id' THEN '活动ID字段'
    ELSE '其他ID字段'
  END as potential_issue
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.column_name LIKE '%_id'
  AND c.table_name NOT IN (
    SELECT DISTINCT tc.table_name
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  );

-- 2.3 检查时间字段设计
SELECT 
  'DATE_TIME_ANALYSIS' as analysis_type,
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  CASE 
    WHEN c.column_name LIKE '%_date' AND c.data_type != 'date' THEN '日期字段类型可能不正确'
    WHEN c.column_name LIKE '%_time' AND c.data_type NOT IN ('timestamp', 'timestamptz') THEN '时间字段类型可能不正确'
    WHEN c.column_name LIKE '%_at' AND c.data_type NOT IN ('timestamp', 'timestamptz') THEN '时间戳字段类型可能不正确'
    ELSE '时间字段设计正常'
  END as time_field_analysis
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND (c.column_name LIKE '%_date%' OR c.column_name LIKE '%_time%' OR c.column_name LIKE '%_at')
ORDER BY c.table_name, c.column_name;

-- 2.4 检查状态字段设计
SELECT 
  'STATUS_FIELD_ANALYSIS' as analysis_type,
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  CASE 
    WHEN c.column_name LIKE '%_status' AND c.data_type = 'text' THEN '状态字段使用text类型，建议使用enum'
    WHEN c.column_name LIKE '%_status' AND c.data_type = 'varchar' THEN '状态字段使用varchar，建议使用enum'
    ELSE '状态字段设计正常'
  END as status_field_analysis
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.column_name LIKE '%_status'
ORDER BY c.table_name, c.column_name;

-- 2.5 检查重复或冗余的字段
SELECT 
  'POTENTIAL_REDUNDANCY' as analysis_type,
  c.table_name,
  c.column_name,
  c.data_type,
  CASE 
    WHEN c.column_name IN ('created_at', 'updated_at', 'created_time', 'updated_time') THEN '可能有重复的时间戳字段'
    WHEN c.column_name IN ('name', 'title', 'full_name', 'display_name') THEN '可能有重复的名称字段'
    WHEN c.column_name IN ('description', 'content', 'details', 'notes') THEN '可能有重复的描述字段'
    ELSE '字段设计正常'
  END as redundancy_analysis
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.column_name IN ('created_at', 'updated_at', 'created_time', 'updated_time', 
                       'name', 'title', 'full_name', 'display_name',
                       'description', 'content', 'details', 'notes')
ORDER BY c.table_name, c.column_name;





