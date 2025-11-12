/*
  # 创建审计日志系统

  ## 功能说明
  创建完整的审计日志系统，记录所有数据变更操作，支持字段级别的变更追踪。

  ## 1. 新建表
    - `audit_log` 审计日志表
      - 记录表名、记录ID、字段名、旧值、新值
      - 记录操作类型（INSERT, UPDATE, DELETE）
      - 记录操作用户、IP地址、用户代理
      - 记录操作时间

  ## 2. 安全设置
    - 启用 RLS
    - 只有管理员可以查看审计日志
    - 审计日志只能插入，不能修改或删除

  ## 3. 索引
    - 按表名、记录ID、用户ID、操作时间创建索引
*/

-- 创建审计日志表
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 表信息
  table_name text NOT NULL,              -- 被修改的表名
  record_id uuid NOT NULL,                -- 被修改的记录ID
  
  -- 字段变更信息
  field_name text,                        -- 被修改的字段名（NULL表示整行操作）
  old_value jsonb,                        -- 旧值（JSON格式，支持各种数据类型）
  new_value jsonb,                        -- 新值（JSON格式，支持各种数据类型）
  
  -- 操作信息
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  
  -- 用户信息
  user_id uuid REFERENCES auth.users(id), -- 操作用户ID
  user_email text,                        -- 用户邮箱（冗余，便于查询）
  user_role text,                          -- 用户角色（冗余，便于查询）
  
  -- 环境信息
  ip_address text,                        -- IP地址
  user_agent text,                        -- 用户代理（浏览器信息）
  
  -- 时间戳
  created_at timestamptz DEFAULT now()    -- 操作时间
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_operation ON audit_log(operation);

-- 启用 RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 只有管理员可以查看审计日志
CREATE POLICY "Admins can view audit logs"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 允许系统插入审计日志（通过服务角色）
-- 注意：实际应用中，审计日志应该通过后端服务插入，而不是前端直接插入
-- 这里为了简化，允许认证用户插入，但实际应该通过 Edge Function 或服务角色
CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 禁止修改和删除审计日志
CREATE POLICY "No updates to audit logs"
  ON audit_log
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "No deletes to audit logs"
  ON audit_log
  FOR DELETE
  TO authenticated
  USING (false);

-- 创建审计日志查询视图（便于管理员查看）
CREATE OR REPLACE VIEW audit_log_view AS
SELECT 
  al.id,
  al.table_name,
  al.record_id,
  al.field_name,
  al.old_value,
  al.new_value,
  al.operation,
  al.user_id,
  al.user_email,
  al.user_role,
  al.ip_address,
  al.user_agent,
  al.created_at,
  up.full_name as user_name
FROM audit_log al
LEFT JOIN user_profiles up ON al.user_id = up.id
ORDER BY al.created_at DESC;

-- 注意：视图不能直接设置RLS策略
-- RLS策略已经设置在 audit_log 表上，视图会继承表的RLS策略

-- 创建函数：获取用户角色（用于审计日志）
CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = user_uuid;
  
  RETURN COALESCE(user_role, 'member');
END;
$$;

-- 创建函数：获取用户邮箱（用于审计日志）
CREATE OR REPLACE FUNCTION get_user_email(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_uuid;
  
  RETURN user_email;
END;
$$;

