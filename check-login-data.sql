-- 检查登录数据情况
-- 1. 检查 user_profiles 表中的 last_sign_in_at 数据
SELECT 
  'user_profiles 登录数据' as source,
  COUNT(*) as total_users,
  COUNT(last_sign_in_at) as users_with_login_data,
  MIN(last_sign_in_at) as earliest_login,
  MAX(last_sign_in_at) as latest_login
FROM user_profiles;

-- 2. 检查最近7天的登录数据
SELECT 
  '最近7天登录数据' as period,
  DATE(last_sign_in_at) as login_date,
  COUNT(*) as login_count
FROM user_profiles 
WHERE last_sign_in_at >= NOW() - INTERVAL '7 days'
  AND last_sign_in_at IS NOT NULL
GROUP BY DATE(last_sign_in_at)
ORDER BY login_date DESC;

-- 3. 检查是否有任何登录数据
SELECT 
  '所有登录数据' as period,
  COUNT(*) as total_logins,
  MIN(last_sign_in_at) as first_login,
  MAX(last_sign_in_at) as last_login
FROM user_profiles 
WHERE last_sign_in_at IS NOT NULL;

-- 4. 检查用户创建时间 vs 登录时间
SELECT 
  '用户创建 vs 登录时间' as comparison,
  COUNT(*) as total_users,
  COUNT(CASE WHEN created_at IS NOT NULL THEN 1 END) as users_with_created_at,
  COUNT(CASE WHEN last_sign_in_at IS NOT NULL THEN 1 END) as users_with_login_at,
  COUNT(CASE WHEN created_at IS NOT NULL AND last_sign_in_at IS NOT NULL THEN 1 END) as users_with_both
FROM user_profiles;





