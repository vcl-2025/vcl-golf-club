-- 添加会员正式照片字段到user_profiles表
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS member_photo_url text;

COMMENT ON COLUMN public.user_profiles.member_photo_url IS '会员正式照片URL';

