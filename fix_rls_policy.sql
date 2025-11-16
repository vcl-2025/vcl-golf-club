-- 修复 module_permissions 表的 RLS 策略
-- 允许所有已认证用户查看权限配置（因为需要用它来判断自己的权限）

-- 删除旧的策略
DROP POLICY IF EXISTS "Admins can view module permissions" ON module_permissions;
DROP POLICY IF EXISTS "Admins can manage module permissions" ON module_permissions;

-- 创建新策略：所有已认证用户都可以查看权限配置
CREATE POLICY "Authenticated users can view module permissions"
  ON module_permissions
  FOR SELECT
  TO authenticated
  USING (true);  -- 所有已认证用户都可以查看

-- 只有管理员可以修改权限配置
CREATE POLICY "Admins can manage module permissions"
  ON module_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

