-- 为 user_profiles 表添加 golflive_name 字段
-- 用于存储 GolfLive 平台上的用户名

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS golflive_name text;

-- 添加字段注释
COMMENT ON COLUMN public.user_profiles.golflive_name IS 'GolfLive 平台用户名';

-- 验证字段添加结果
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'golflive_name';

