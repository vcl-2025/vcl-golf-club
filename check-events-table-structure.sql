-- 查看events表结构
-- 1. 查看表的基本结构
\d events;

-- 2. 查看表的详细信息（包括约束、索引等）
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;

-- 3. 查看表的约束信息
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
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'events';

-- 4. 查看表的索引信息
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'events';

-- 5. 查看表的RLS策略
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'events';

-- 6. 查看表是否启用了RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'events';



