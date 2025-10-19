-- 第三步：移除冗余字段（谨慎操作）
-- 只有在确认新设计工作正常后才执行

-- 1. 先检查哪些字段是冗余的
SELECT 
  '冗余字段分析' as analysis,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'scores' 
  AND table_schema = 'public'
  AND column_name IN (
    'competition_name', 
    'competition_ty', 
    'course_name', 
    'competition_d', 
    'total_participa'
  );

-- 2. 创建测试查询，确保新设计能正常工作
SELECT 
  s.id,
  s.total_strokes,
  s.rank,
  e.title as event_name,
  e.start_time as event_date,
  up.full_name as user_name
FROM scores s
JOIN events e ON s.event_id = e.id
JOIN user_profiles up ON s.user_id = up.id
LIMIT 5;

-- 3. 如果测试查询正常，可以移除冗余字段
-- 注意：这个操作不可逆，请确保备份了数据
-- ALTER TABLE scores DROP COLUMN competition_name;
-- ALTER TABLE scores DROP COLUMN competition_ty;
-- ALTER TABLE scores DROP COLUMN course_name;
-- ALTER TABLE scores DROP COLUMN competition_d;
-- ALTER TABLE scores DROP COLUMN total_participa;

-- 4. 验证最终的表结构
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'scores' 
  AND table_schema = 'public'
ORDER BY ordinal_position;



