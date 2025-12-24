-- 为 user_profiles 表添加 birthday 字段
-- 用于存储会员生日

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS birthday date;

-- 添加字段注释
COMMENT ON COLUMN public.user_profiles.birthday IS '会员生日';

-- 验证字段添加结果
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'birthday';

