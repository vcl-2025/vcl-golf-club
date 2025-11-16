-- 修复 user_profiles 表的角色约束
-- 确保包含所有新角色：admin, finance, editor, score_manager, viewer, member

-- 1. 检查当前约束
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_profiles'::regclass
  AND conname = 'user_profiles_role_check';

-- 2. 删除旧的约束（如果存在）
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- 3. 添加新的约束，包含所有角色
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('admin', 'finance', 'editor', 'score_manager', 'viewer', 'member'));

-- 4. 验证约束已创建
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_profiles'::regclass
  AND conname = 'user_profiles_role_check';

-- 5. 同时修复 module_permissions 表的约束
ALTER TABLE module_permissions 
DROP CONSTRAINT IF EXISTS module_permissions_role_check;

ALTER TABLE module_permissions 
ADD CONSTRAINT module_permissions_role_check 
CHECK (role IN ('admin', 'finance', 'editor', 'score_manager', 'viewer', 'member'));

