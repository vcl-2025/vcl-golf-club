-- 检查当前用户的管理员状态
-- 在 Supabase SQL 编辑器中执行此脚本

-- 1. 检查当前用户信息
SELECT 
  '当前用户信息' as description,
  auth.uid() as user_id,
  auth.email() as user_email;

-- 2. 检查当前用户在 user_profiles 中的信息
SELECT 
  '当前用户资料' as description,
  id,
  full_name,
  email,
  role,
  membership_type,
  created_at
FROM user_profiles 
WHERE id = auth.uid();

-- 3. 检查所有用户数量
SELECT 
  '用户统计' as description,
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
  COUNT(CASE WHEN role = 'member' THEN 1 END) as member_count,
  COUNT(CASE WHEN role IS NULL THEN 1 END) as null_role_count
FROM user_profiles;

-- 4. 查看所有用户列表（如果当前用户是管理员）
SELECT 
  '所有用户列表' as description,
  id,
  full_name,
  email,
  role,
  membership_type,
  created_at
FROM user_profiles 
ORDER BY created_at DESC;

-- 5. 如果当前用户不是管理员，请执行以下命令设置管理员权限
-- UPDATE user_profiles 
-- SET role = 'admin' 
-- WHERE id = auth.uid();








