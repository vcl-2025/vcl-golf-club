-- 分析所有表的设计冗余问题
-- 检查哪些表还有优化空间

-- 1. 检查所有表的基本信息
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. 检查 events 表的设计
SELECT '=== EVENTS 表分析 ===' as analysis;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. 检查 event_registrations 表的设计
SELECT '=== EVENT_REGISTRATIONS 表分析 ===' as analysis;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'event_registrations' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. 检查 user_profiles 表的设计
SELECT '=== USER_PROFILES 表分析 ===' as analysis;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. 检查 investments 表的设计
SELECT '=== INVESTMENTS 表分析 ===' as analysis;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'investments' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. 检查 expenses 表的设计
SELECT '=== EXPENSES 表分析 ===' as analysis;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'expenses' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. 检查 posters 表的设计
SELECT '=== POSTERS 表分析 ===' as analysis;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'posters' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. 分析潜在冗余问题
SELECT '=== 潜在冗余分析 ===' as analysis;

-- 检查是否有重复的日期字段
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('events', 'event_registrations', 'scores', 'investments', 'expenses', 'posters')
    AND table_schema = 'public'
    AND (column_name LIKE '%date%' OR column_name LIKE '%time%')
ORDER BY table_name, column_name;

-- 检查是否有重复的状态字段
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('events', 'event_registrations', 'scores', 'investments', 'expenses', 'posters')
    AND table_schema = 'public'
    AND (column_name LIKE '%status%' OR column_name LIKE '%state%')
ORDER BY table_name, column_name;

-- 检查是否有重复的用户相关字段
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('events', 'event_registrations', 'scores', 'investments', 'expenses', 'posters')
    AND table_schema = 'public'
    AND (column_name LIKE '%user%' OR column_name LIKE '%member%' OR column_name LIKE '%author%')
ORDER BY table_name, column_name;








