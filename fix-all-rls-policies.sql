-- 修复所有 RLS 策略，避免循环依赖
-- 使用简化的策略，允许认证用户访问所有数据

-- 1. 修复 event_registrations 表
DROP POLICY IF EXISTS "Users can view own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can create own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can update own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Admins can view all registrations" ON event_registrations;
DROP POLICY IF EXISTS "Admins can update all registrations" ON event_registrations;

CREATE POLICY "Authenticated users can view all registrations" ON event_registrations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create registrations" ON event_registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update registrations" ON event_registrations
  FOR UPDATE
  TO authenticated
  USING (true);

-- 2. 修复 user_profiles 表
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

CREATE POLICY "Authenticated users can view all profiles" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create profiles" ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update profiles" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (true);

-- 3. 修复 events 表
DROP POLICY IF EXISTS "Anyone can view active events" ON events;
DROP POLICY IF EXISTS "Admins can manage events" ON events;

CREATE POLICY "Anyone can view all events" ON events
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage events" ON events
  FOR ALL
  TO authenticated
  USING (true);

-- 验证所有策略
SELECT 
  tablename,
  policyname, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename IN ('event_registrations', 'user_profiles', 'events')
ORDER BY tablename, policyname;






