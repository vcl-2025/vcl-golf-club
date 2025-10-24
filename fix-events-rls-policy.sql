-- 检查events表的RLS策略
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;

-- 删除可能存在的限制性策略
DROP POLICY IF EXISTS "Users can view events" ON events;
DROP POLICY IF EXISTS "Public can view events" ON events;
DROP POLICY IF EXISTS "Authenticated users can view events" ON events;
DROP POLICY IF EXISTS "Only admins can view events" ON events;

-- 创建允许所有用户查看所有活动的策略
CREATE POLICY "Everyone can view all events" ON events
FOR SELECT USING (true);

-- 创建允许认证用户创建活动的策略
CREATE POLICY "Authenticated users can create events" ON events
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 创建允许认证用户更新活动的策略
CREATE POLICY "Authenticated users can update events" ON events
FOR UPDATE USING (auth.role() = 'authenticated');

-- 创建允许认证用户删除活动的策略
CREATE POLICY "Authenticated users can delete events" ON events
FOR DELETE USING (auth.role() = 'authenticated');

-- 验证策略是否创建成功
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;




