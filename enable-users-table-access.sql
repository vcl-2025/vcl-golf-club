-- 启用 auth.users 表的 RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- 创建策略，允许管理员角色访问 users 表
CREATE POLICY "Allow admin access to users" ON auth.users
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.users.id 
    AND user_profiles.membership_type = 'admin'
  )
);

-- 或者创建一个更宽松的策略，允许所有认证用户查看基本信息
CREATE POLICY "Allow authenticated users to view basic user info" ON auth.users
FOR SELECT USING (auth.uid() IS NOT NULL);



