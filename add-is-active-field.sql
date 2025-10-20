-- 为 user_profiles 表添加 is_active 字段

-- 1. 添加 is_active 字段
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 2. 更新现有用户为活跃状态
UPDATE public.user_profiles 
SET is_active = true 
WHERE is_active IS NULL;

-- 3. 添加字段注释
COMMENT ON COLUMN public.user_profiles.is_active IS '用户是否活跃，false表示禁用登录';

-- 4. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active 
ON public.user_profiles(is_active);

-- 5. 验证字段添加结果
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'is_active';





