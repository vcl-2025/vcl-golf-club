-- 添加上衣和裤（裙）尺码字段到 user_profiles 表

-- 添加上衣尺码字段
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS clothing_size_top text;

-- 添加裤（裙）尺码字段
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS clothing_size_bottom text;

-- 添加字段注释
COMMENT ON COLUMN public.user_profiles.clothing_size_top IS '上衣尺码：XS/S/M/L/XL/XXL';
COMMENT ON COLUMN public.user_profiles.clothing_size_bottom IS '裤（裙）尺码：XS/S/M/L/XL/XXL';

