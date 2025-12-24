-- 修复 user_profiles 表的 membership_type 约束
-- 添加 'basic' 作为允许的会员类型，或保持现有约束

-- 方案一：添加 'basic' 到允许的值列表（如果需要支持 basic）
-- ALTER TABLE user_profiles 
-- DROP CONSTRAINT IF EXISTS user_profiles_membership_type_check;

-- ALTER TABLE user_profiles 
-- ADD CONSTRAINT user_profiles_membership_type_check 
-- CHECK (membership_type IN ('standard', 'premium', 'vip', 'basic'));

-- 方案二：保持现有约束，使用 'standard' 作为默认值（推荐）
-- 代码中已经修改为使用 'standard' 作为默认值
-- 如果 Excel 中没有 membership_type 字段，将自动使用 'standard'

-- 检查当前约束
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_profiles'::regclass
  AND conname = 'user_profiles_membership_type_check';

