-- 修复投资记录表的RLS策略
-- 允许所有用户查看已确认的投资记录用于计算筹款进度
-- 但用户只能查看自己的投资明细

-- 1. 删除现有的投资记录表RLS策略
DROP POLICY IF EXISTS "Users can view own investments" ON investments;
DROP POLICY IF EXISTS "Users can insert own investments" ON investments;
DROP POLICY IF EXISTS "Admins can view all investments" ON investments;
DROP POLICY IF EXISTS "Admins can update all investments" ON investments;

-- 2. 创建新的策略
-- 允许所有用户查看已确认的投资记录（用于筹款进度计算）
CREATE POLICY "Anyone can view confirmed investments"
  ON investments
  FOR SELECT
  TO authenticated
  USING (status = 'confirmed');

-- 用户只能查看自己的投资记录（用于"我的投资"页面）
CREATE POLICY "Users can view own investments"
  ON investments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 用户只能插入自己的投资记录
CREATE POLICY "Users can insert own investments"
  ON investments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 管理员可以查看所有投资记录
CREATE POLICY "Admins can view all investments"
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

-- 管理员可以更新投资记录状态
CREATE POLICY "Admins can update investments"
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

-- 3. 确保投资记录表启用RLS
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- 4. 确保投资项目表允许所有用户查看
DROP POLICY IF EXISTS "Anyone can view investment projects" ON investment_projects;
CREATE POLICY "Anyone can view investment projects"
  ON investment_projects
  FOR SELECT
  TO authenticated
  USING (true);

-- 确保投资项目表启用RLS
ALTER TABLE investment_projects ENABLE ROW LEVEL SECURITY;






