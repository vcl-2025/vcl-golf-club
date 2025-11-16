-- 检查权限数据是否存在
-- 在 Supabase SQL Editor 中运行此脚本

-- 1. 检查 module_permissions 表是否存在
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'module_permissions'
) as table_exists;

-- 2. 检查 finance 角色的权限数据
SELECT * FROM module_permissions 
WHERE role = 'finance'
ORDER BY module;

-- 3. 检查所有角色的权限数据统计
SELECT role, COUNT(*) as module_count
FROM module_permissions
GROUP BY role
ORDER BY role;

-- 4. 如果 finance 角色的数据不存在，手动插入
INSERT INTO module_permissions (role, module, can_access, can_create, can_update, can_delete) VALUES
('finance', 'members', false, false, false, false),
('finance', 'events', false, false, false, false),
('finance', 'scores', false, false, false, false),
('finance', 'expenses', true, true, true, true),
('finance', 'information', false, false, false, false),
('finance', 'posters', false, false, false, false),
('finance', 'investments', true, true, true, true),
('finance', 'audit', false, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET
  can_access = EXCLUDED.can_access,
  can_create = EXCLUDED.can_create,
  can_update = EXCLUDED.can_update,
  can_delete = EXCLUDED.can_delete;

-- 5. 再次检查 finance 角色的权限
SELECT * FROM module_permissions 
WHERE role = 'finance'
ORDER BY module;

