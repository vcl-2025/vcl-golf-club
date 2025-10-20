-- 添加 last_sign_in_at 字段到 user_profiles 表
-- 步骤1: 添加 last_sign_in_at 字段
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz;

-- 步骤2: 从 auth.users 同步现有用户的最后登录时间
UPDATE public.user_profiles 
SET last_sign_in_at = au.last_sign_in_at
FROM auth.users au
WHERE user_profiles.id = au.id
AND au.last_sign_in_at IS NOT NULL;

-- 步骤3: 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_signin 
ON public.user_profiles(last_sign_in_at);

-- 步骤4: 添加注释
COMMENT ON COLUMN public.user_profiles.last_sign_in_at IS '用户最后登录时间，从 auth.users 同步';

-- 步骤5: 验证数据同步结果
SELECT 
  COUNT(*) as total_profiles,
  COUNT(last_sign_in_at) as profiles_with_last_signin,
  COUNT(*) - COUNT(last_sign_in_at) as profiles_without_last_signin
FROM public.user_profiles;





