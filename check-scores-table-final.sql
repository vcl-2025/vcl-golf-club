-- 检查 scores 表的最终结构
-- 确认是否还有冗余字段

-- 1. 查看 scores 表的完整结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'scores' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. 检查是否有冗余字段（应该已经删除的字段）
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scores' AND column_name = 'competition_name') 
        THEN '❌ competition_name 字段仍然存在'
        ELSE '✅ competition_name 字段已删除'
    END as competition_name_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scores' AND column_name = 'competition_type') 
        THEN '❌ competition_type 字段仍然存在'
        ELSE '✅ competition_type 字段已删除'
    END as competition_type_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scores' AND column_name = 'competition_date') 
        THEN '❌ competition_date 字段仍然存在'
        ELSE '✅ competition_date 字段已删除'
    END as competition_date_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scores' AND column_name = 'course_name') 
        THEN '❌ course_name 字段仍然存在'
        ELSE '✅ course_name 字段已删除'
    END as course_name_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scores' AND column_name = 'total_participants') 
        THEN '❌ total_participants 字段仍然存在'
        ELSE '✅ total_participants 字段已删除'
    END as total_participants_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scores' AND column_name = 'holes_played') 
        THEN '❌ holes_played 字段仍然存在'
        ELSE '✅ holes_played 字段已删除'
    END as holes_played_status;

-- 3. 检查外键约束
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'scores'
    AND tc.table_schema = 'public';

-- 4. 检查索引
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'scores' 
    AND schemaname = 'public';

-- 5. 总结：scores 表应该只包含以下字段
SELECT 'scores 表应该包含的字段:' as summary
UNION ALL
SELECT '✅ id (主键)'
UNION ALL
SELECT '✅ user_id (外键 -> user_profiles.id)'
UNION ALL
SELECT '✅ event_id (外键 -> events.id)'
UNION ALL
SELECT '✅ total_strokes (总杆数)'
UNION ALL
SELECT '✅ net_strokes (净杆数)'
UNION ALL
SELECT '✅ handicap (差点)'
UNION ALL
SELECT '✅ rank (排名)'
UNION ALL
SELECT '✅ notes (备注)'
UNION ALL
SELECT '✅ created_at (创建时间)'
UNION ALL
SELECT '✅ updated_at (更新时间)';






