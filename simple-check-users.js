// 简单的用户检查脚本
// 请在Supabase Dashboard的SQL编辑器中运行以下查询来检查用户数量

console.log(`
请在Supabase Dashboard的SQL编辑器中运行以下查询：

-- 1. 检查认证用户数量
SELECT COUNT(*) as auth_users_count FROM auth.users;

-- 2. 查看所有认证用户
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at
FROM auth.users 
ORDER BY created_at DESC;

-- 3. 检查用户档案数量
SELECT COUNT(*) as user_profiles_count FROM user_profiles;

-- 4. 查看所有用户档案
SELECT 
  id,
  full_name,
  email,
  phone,
  membership_type,
  role,
  created_at
FROM user_profiles 
ORDER BY created_at DESC;

-- 5. 检查是否有认证用户没有对应的档案
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created_at,
  up.full_name,
  up.role
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- 6. 检查活动数量
SELECT COUNT(*) as events_count FROM events;

-- 7. 查看最近的活动
SELECT 
  id,
  title,
  status,
  start_time,
  created_at
FROM events 
ORDER BY created_at DESC 
LIMIT 5;
`);

console.log('请复制上述SQL查询到Supabase Dashboard的SQL编辑器中运行。');




