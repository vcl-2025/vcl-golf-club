-- 调试会员数量问题
-- 检查 user_profiles 表中的实际数据

-- 1. 查看 user_profiles 表的总记录数
SELECT 
  'user_profiles 总记录数' as description,
  COUNT(*) as total_count
FROM public.user_profiles;

-- 2. 查看所有会员的详细信息
SELECT 
  '所有会员详细信息' as description,
  id,
  full_name,
  real_name,
  phone,
  email,
  membership_type,
  role,
  created_at,
  last_sign_in_at
FROM public.user_profiles
ORDER BY created_at DESC;

-- 3. 查看 auth.users 表的记录数
SELECT 
  'auth.users 总记录数' as description,
  COUNT(*) as total_count
FROM auth.users;

-- 4. 查看 auth.users 中的用户信息
SELECT 
  'auth.users 用户信息' as description,
  id,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- 5. 检查 user_profiles 和 auth.users 的关联情况
SELECT 
  '关联情况检查' as description,
  COUNT(*) as total_profiles,
  COUNT(au.id) as linked_auth_users,
  COUNT(*) - COUNT(au.id) as unlinked_profiles
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.id = au.id;

-- 6. 查看未关联的 user_profiles
SELECT 
  '未关联的 user_profiles' as description,
  up.id,
  up.full_name,
  up.created_at
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE au.id IS NULL;

-- 7. 查看未关联的 auth.users
SELECT 
  '未关联的 auth.users' as description,
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL;





