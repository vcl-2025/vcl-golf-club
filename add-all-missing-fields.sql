-- 添加所有缺失的字段到 user_profiles 表
-- 这个脚本会安全地添加所有需要的字段

-- 1. 添加头像字段
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. 添加差点字段
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS handicap numeric(3,1);

-- 3. 添加衣服尺码字段
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS clothing_size text;

-- 4. 添加温哥华常驻地字段
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS vancouver_residence text;

-- 5. 添加国内常驻地字段
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS domestic_residence text;

-- 6. 添加主球会会籍字段
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS main_club_membership text;

-- 7. 添加行业字段
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS industry text;

-- 8. 添加打球喜好字段
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS golf_preferences text;

-- 9. 添加高球座右铭字段
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS golf_motto text;

-- 10. 添加其他兴趣爱好字段
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS other_interests text;

-- 11. 添加备注字段
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS notes text;

-- 12. 添加角色字段（如果不存在）
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS role text;

-- 添加字段注释
COMMENT ON COLUMN public.user_profiles.avatar_url IS '会员头像图片URL';
COMMENT ON COLUMN public.user_profiles.handicap IS '高尔夫差点';
COMMENT ON COLUMN public.user_profiles.clothing_size IS '衣服尺码';
COMMENT ON COLUMN public.user_profiles.vancouver_residence IS '温哥华常驻地';
COMMENT ON COLUMN public.user_profiles.domestic_residence IS '国内常驻地';
COMMENT ON COLUMN public.user_profiles.main_club_membership IS '主球会会籍';
COMMENT ON COLUMN public.user_profiles.industry IS '行业';
COMMENT ON COLUMN public.user_profiles.golf_preferences IS '打球喜好';
COMMENT ON COLUMN public.user_profiles.golf_motto IS '高球座右铭';
COMMENT ON COLUMN public.user_profiles.other_interests IS '其他兴趣爱好';
COMMENT ON COLUMN public.user_profiles.notes IS '会员备注信息';
COMMENT ON COLUMN public.user_profiles.role IS '会员角色';

-- 验证所有字段是否添加成功
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN (
  'avatar_url', 'handicap', 'clothing_size', 'vancouver_residence', 
  'domestic_residence', 'main_club_membership', 'industry', 
  'golf_preferences', 'golf_motto', 'other_interests', 'notes', 'role'
)
ORDER BY column_name;






