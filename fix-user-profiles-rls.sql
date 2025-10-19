-- 修复 user_profiles 表的 RLS 策略
-- 简化策略，避免循环依赖

-- 删除现有的复杂策略
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- 创建简化的策略
-- 允许认证用户查看所有用户资料
CREATE POLICY "Authenticated users can view all profiles" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 允许认证用户创建用户资料
CREATE POLICY "Authenticated users can create profiles" ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 允许认证用户更新用户资料
CREATE POLICY "Authenticated users can update profiles" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (true);

-- 验证策略
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'user_profiles' ORDER BY policyname;

