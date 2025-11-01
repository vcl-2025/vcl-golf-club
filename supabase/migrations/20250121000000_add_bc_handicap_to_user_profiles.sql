-- 添加 bc差点 字段到 user_profiles 表

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS bc_handicap numeric(3,1);

COMMENT ON COLUMN public.user_profiles.bc_handicap IS 'BC高尔夫差点';

