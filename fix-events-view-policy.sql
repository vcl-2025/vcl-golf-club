-- 修复events表的查看策略
-- 删除限制性的策略
DROP POLICY IF EXISTS "Anyone can view active events" ON events;

-- 创建允许查看所有活动状态的策略
CREATE POLICY "Everyone can view all events" ON events
FOR SELECT USING (true);

-- 验证策略
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;



