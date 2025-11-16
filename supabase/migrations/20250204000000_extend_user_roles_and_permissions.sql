/*
  # 扩展用户角色系统和模块权限管理

  1. 扩展角色类型
    - admin: 超级管理员（所有权限）
    - finance: 财务（费用、投资管理）
    - editor: 文档编辑者（信息中心、活动内容编辑）
    - score_manager: 成绩管理员（成绩管理）
    - viewer: 查看者（只读，可查看所有模块，不能操作）
    - member: 普通会员（只读）

  2. 创建模块权限表
    - 定义每个角色可以访问的模块
    - 支持细粒度的权限控制

  3. 功能
    - 重置用户密码（管理员功能）
    - 分配角色
    - 控制模块访问权限
*/

-- 1. 扩展角色类型约束
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('admin', 'finance', 'editor', 'score_manager', 'viewer', 'member'));

-- 2. 创建模块权限表
CREATE TABLE IF NOT EXISTS module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('admin', 'finance', 'editor', 'score_manager', 'viewer', 'member')),
  module text NOT NULL,
  can_access boolean NOT NULL DEFAULT true,
  can_create boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role, module)
);

-- 3. 插入默认模块权限配置
-- 模块列表：members, events, scores, expenses, information, posters, investments, audit

-- admin: 所有权限
INSERT INTO module_permissions (role, module, can_access, can_create, can_update, can_delete) VALUES
('admin', 'members', true, true, true, true),
('admin', 'events', true, true, true, true),
('admin', 'scores', true, true, true, true),
('admin', 'expenses', true, true, true, true),
('admin', 'information', true, true, true, true),
('admin', 'posters', true, true, true, true),
('admin', 'investments', true, true, true, true),
('admin', 'audit', true, true, false, false)
ON CONFLICT (role, module) DO NOTHING;

-- finance: 费用和投资管理
INSERT INTO module_permissions (role, module, can_access, can_create, can_update, can_delete) VALUES
('finance', 'members', false, false, false, false),
('finance', 'events', false, false, false, false),
('finance', 'scores', false, false, false, false),
('finance', 'expenses', true, true, true, true),
('finance', 'information', false, false, false, false),
('finance', 'posters', false, false, false, false),
('finance', 'investments', true, true, true, true),
('finance', 'audit', false, false, false, false)
ON CONFLICT (role, module) DO NOTHING;

-- editor: 信息中心、海报、活动内容编辑
INSERT INTO module_permissions (role, module, can_access, can_create, can_update, can_delete) VALUES
('editor', 'members', false, false, false, false),
('editor', 'events', true, false, true, false), -- 只能编辑内容，不能创建/删除
('editor', 'scores', false, false, false, false),
('editor', 'expenses', false, false, false, false),
('editor', 'information', true, true, true, true),
('editor', 'posters', true, true, true, true),
('editor', 'investments', false, false, false, false),
('editor', 'audit', false, false, false, false)
ON CONFLICT (role, module) DO NOTHING;

-- score_manager: 成绩管理
INSERT INTO module_permissions (role, module, can_access, can_create, can_update, can_delete) VALUES
('score_manager', 'members', false, false, false, false),
('score_manager', 'events', false, false, false, false),
('score_manager', 'scores', true, true, true, true),
('score_manager', 'expenses', false, false, false, false),
('score_manager', 'information', false, false, false, false),
('score_manager', 'posters', false, false, false, false),
('score_manager', 'investments', false, false, false, false),
('score_manager', 'audit', false, false, false, false)
ON CONFLICT (role, module) DO NOTHING;

-- viewer: 查看者（只读，可查看所有模块，不能操作）
INSERT INTO module_permissions (role, module, can_access, can_create, can_update, can_delete) VALUES
('viewer', 'members', true, false, false, false),
('viewer', 'events', true, false, false, false),
('viewer', 'scores', true, false, false, false),
('viewer', 'expenses', true, false, false, false),
('viewer', 'information', true, false, false, false),
('viewer', 'posters', true, false, false, false),
('viewer', 'investments', true, false, false, false),
('viewer', 'audit', true, false, false, false)
ON CONFLICT (role, module) DO NOTHING;

-- member: 只读权限（实际上前端会控制，这里只是占位）
INSERT INTO module_permissions (role, module, can_access, can_create, can_update, can_delete) VALUES
('member', 'members', false, false, false, false),
('member', 'events', false, false, false, false),
('member', 'scores', false, false, false, false),
('member', 'expenses', false, false, false, false),
('member', 'information', false, false, false, false),
('member', 'posters', false, false, false, false),
('member', 'investments', false, false, false, false),
('member', 'audit', false, false, false, false)
ON CONFLICT (role, module) DO NOTHING;

-- 4. 创建自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_module_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_module_permissions_updated_at
    BEFORE UPDATE ON module_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_module_permissions_updated_at();

-- 5. 创建检查模块权限的函数
CREATE OR REPLACE FUNCTION can_access_module(
  p_module text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role text;
BEGIN
  -- 获取用户角色
  SELECT role INTO v_user_role
  FROM user_profiles
  WHERE id = p_user_id;
  
  -- 如果没有角色，返回 false
  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- admin 总是有权限
  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- 检查模块权限
  RETURN EXISTS (
    SELECT 1
    FROM module_permissions
    WHERE role = v_user_role
      AND module = p_module
      AND can_access = true
  );
END;
$$;

-- 6. 创建检查模块操作权限的函数
CREATE OR REPLACE FUNCTION can_operate_module(
  p_module text,
  p_operation text, -- 'create', 'update', 'delete'
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role text;
  v_can_operate boolean;
BEGIN
  -- 获取用户角色
  SELECT role INTO v_user_role
  FROM user_profiles
  WHERE id = p_user_id;
  
  -- 如果没有角色，返回 false
  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- admin 总是有权限
  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- 检查操作权限
  CASE p_operation
    WHEN 'create' THEN
      SELECT can_create INTO v_can_operate
      FROM module_permissions
      WHERE role = v_user_role AND module = p_module;
    WHEN 'update' THEN
      SELECT can_update INTO v_can_operate
      FROM module_permissions
      WHERE role = v_user_role AND module = p_module;
    WHEN 'delete' THEN
      SELECT can_delete INTO v_can_operate
      FROM module_permissions
      WHERE role = v_user_role AND module = p_module;
    ELSE
      RETURN false;
  END CASE;
  
  RETURN COALESCE(v_can_operate, false);
END;
$$;

-- 7. 授权函数执行权限
GRANT EXECUTE ON FUNCTION can_access_module(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_operate_module(text, text, uuid) TO authenticated;

-- 8. 创建索引
CREATE INDEX IF NOT EXISTS idx_module_permissions_role ON module_permissions(role);
CREATE INDEX IF NOT EXISTS idx_module_permissions_module ON module_permissions(module);

-- 9. 添加注释
COMMENT ON TABLE module_permissions IS '模块权限表，定义每个角色对每个模块的访问权限';
COMMENT ON COLUMN module_permissions.role IS '用户角色：admin, finance, editor, score_manager, viewer, member';
COMMENT ON COLUMN module_permissions.module IS '模块名称：members, events, scores, expenses, information, posters, investments, audit';
COMMENT ON COLUMN module_permissions.can_access IS '是否可以访问该模块';
COMMENT ON COLUMN module_permissions.can_create IS '是否可以创建';
COMMENT ON COLUMN module_permissions.can_update IS '是否可以更新';
COMMENT ON COLUMN module_permissions.can_delete IS '是否可以删除';

-- 10. 启用 RLS
ALTER TABLE module_permissions ENABLE ROW LEVEL SECURITY;

-- 只有管理员可以查看和修改模块权限
CREATE POLICY "Admins can view module permissions"
  ON module_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage module permissions"
  ON module_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

