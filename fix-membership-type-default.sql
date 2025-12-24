-- 修复 user_profiles 表的 membership_type 默认值
-- 将默认值从 'basic' 改为 'standard'（如果存在的话）

-- 1. 检查当前默认值
SELECT 
    column_name,
    column_default,
    data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles' 
  AND column_name = 'membership_type';

-- 2. 检查当前约束
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_profiles'::regclass
  AND conname = 'user_profiles_membership_type_check';

-- 3. 修改默认值（如果需要）
-- 如果当前默认值是 'basic' 或其他值，将其改为 'standard'
ALTER TABLE public.user_profiles 
ALTER COLUMN membership_type SET DEFAULT 'standard';

-- 4. 确保约束正确（只允许 'standard', 'premium', 'vip'）
-- 先删除旧约束（如果存在）
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_membership_type_check;

-- 添加新约束
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_membership_type_check 
CHECK (membership_type IN ('standard', 'premium', 'vip'));

-- 5. 验证修改结果
SELECT 
    column_name,
    column_default,
    data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles' 
  AND column_name = 'membership_type';

SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_profiles'::regclass
  AND conname = 'user_profiles_membership_type_check';

-- 6. （可选）更新现有数据
-- 如果数据库中有 membership_type 为 'basic' 或 NULL 的记录，可以更新它们
-- UPDATE public.user_profiles 
-- SET membership_type = 'standard'
-- WHERE membership_type IS NULL OR membership_type = 'basic';

