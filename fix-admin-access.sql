-- 修复管理员访问权限问题
-- 确保管理员可以查看所有会员数据

-- 1. 检查当前用户是否为管理员
SELECT 
  '当前用户信息' as description,
  auth.uid() as current_user_id,
  up.full_name,
  up.role,
  up.email
FROM user_profiles up
WHERE up.id = auth.uid();

-- 2. 检查 user_profiles 表的 RLS 策略
SELECT 
  'user_profiles RLS 策略' as description,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- 3. 临时禁用 RLS 来测试数据访问（仅用于调试）
-- ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 4. 检查是否有管理员用户
SELECT 
  '管理员用户列表' as description,
  id,
  full_name,
  email,
  role,
  created_at
FROM user_profiles 
WHERE role = 'admin'
ORDER BY created_at;

-- 5. 检查所有用户数据（如果当前用户是管理员）
SELECT 
  '所有用户数据' as description,
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
  COUNT(CASE WHEN role = 'member' THEN 1 END) as member_count,
  COUNT(CASE WHEN role IS NULL THEN 1 END) as null_role_count
FROM user_profiles;

-- 6. 如果当前用户不是管理员，创建一个管理员用户
-- 注意：请将 'your-email@example.com' 替换为实际的邮箱地址
-- INSERT INTO user_profiles (id, full_name, email, role, membership_type)
-- SELECT 
--   au.id,
--   COALESCE(au.raw_user_meta_data->>'full_name', 'Admin User'),
--   au.email,
--   'admin',
--   'vip'
-- FROM auth.users au
-- WHERE au.email = 'your-email@example.com'
-- AND NOT EXISTS (
--   SELECT 1 FROM user_profiles up WHERE up.id = au.id
-- );

-- 7. 重新启用 RLS（如果之前禁用了）
-- ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;



