-- 简单修复投资记录RLS策略
-- 允许所有用户查看已确认的投资记录

-- 删除现有策略
DROP POLICY IF EXISTS "Users can view own investments" ON investments;
DROP POLICY IF EXISTS "Users can insert own investments" ON investments;
DROP POLICY IF EXISTS "Admins can view all investments" ON investments;
DROP POLICY IF EXISTS "Admins can update all investments" ON investments;

-- 创建新策略：允许查看已确认的投资记录
CREATE POLICY "View confirmed investments"
  ON investments
  FOR SELECT
  TO authenticated
  USING (status = 'confirmed');

-- 用户只能查看自己的投资记录
CREATE POLICY "View own investments"
  ON investments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 用户只能插入自己的投资记录
CREATE POLICY "Insert own investments"
  ON investments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 管理员可以查看所有投资记录
CREATE POLICY "Admins view all investments"
  ON investments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- 管理员可以更新投资记录
CREATE POLICY "Admins update investments"
  ON investments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );




