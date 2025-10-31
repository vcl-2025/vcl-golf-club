-- 为缺失的用户创建档案的SQL脚本
-- 请在Supabase Dashboard的SQL编辑器中运行

-- 1. 首先查看哪些用户缺少档案
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created_at,
  up.full_name,
  up.role
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- 2. 为缺失的用户创建档案
-- 注意：这个查询会为所有缺少档案的认证用户创建默认档案
INSERT INTO user_profiles (id, full_name, phone, membership_type, role)
SELECT 
  au.id,
  -- 从邮箱提取用户名作为默认姓名
  INITCAP(SPLIT_PART(au.email, '@', 1)) as full_name,
  '' as phone,  -- 留空，用户可以稍后填写
  'standard' as membership_type,  -- 默认为标准会员
  'member' as role  -- 默认为普通会员
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- 3. 验证创建结果
SELECT 
  '创建后的用户档案数量' as description,
  COUNT(*) as count
FROM user_profiles;

-- 4. 查看新创建的用户档案
SELECT 
  up.id,
  up.full_name,
  up.membership_type,
  up.role,
  au.email,
  up.created_at
FROM user_profiles up
JOIN auth.users au ON up.id = au.id
ORDER BY up.created_at DESC
LIMIT 10;









