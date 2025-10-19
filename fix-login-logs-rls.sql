-- 修复 login_logs 表的 RLS 策略
DROP POLICY IF EXISTS "Users can insert their own login logs" ON login_logs;

-- 创建更宽松的插入策略
CREATE POLICY "Allow authenticated users to insert login logs" ON login_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 确保用户可以看到自己的登录日志
DROP POLICY IF EXISTS "Users can view their own login logs" ON login_logs;
CREATE POLICY "Users can view their own login logs" ON login_logs
  FOR SELECT USING (auth.uid() = user_id);

-- 确保管理员可以看到所有登录日志
DROP POLICY IF EXISTS "Admins can view all login logs" ON login_logs;
CREATE POLICY "Admins can view all login logs" ON login_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );



