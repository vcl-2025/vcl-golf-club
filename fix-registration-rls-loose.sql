-- 修复event_registrations表的RLS策略，允许所有用户操作
-- 删除所有现有策略
DROP POLICY IF EXISTS "Users can view their own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can insert their own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can update their own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can delete their own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Admins can manage all registrations" ON event_registrations;
DROP POLICY IF EXISTS "Allow all users to read event registrations" ON event_registrations;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own event registrations" ON event_registrations;
DROP POLICY IF EXISTS "Allow authenticated users to update their own event registrations" ON event_registrations;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own event registrations" ON event_registrations;
DROP POLICY IF EXISTS "Admins can view all event registrations" ON event_registrations;
DROP POLICY IF EXISTS "Admins can update all event registrations" ON event_registrations;
DROP POLICY IF EXISTS "Admins can delete all event registrations" ON event_registrations;

-- 创建最宽松的策略
CREATE POLICY "Allow all users to read all registrations" ON event_registrations
FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert registrations" ON event_registrations
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update registrations" ON event_registrations
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete registrations" ON event_registrations
FOR DELETE USING (auth.role() = 'authenticated');

-- 验证策略
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'event_registrations'
ORDER BY policyname;

