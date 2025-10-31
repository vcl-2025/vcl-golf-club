-- 创建登录日志表
CREATE TABLE IF NOT EXISTS login_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  login_time timestamptz DEFAULT NOW(),
  device_type text, -- 'mobile', 'desktop', 'tablet'
  user_agent text,
  ip_address inet,
  created_at timestamptz DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_login_time ON login_logs(login_time);

-- 启用 RLS
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "Users can view their own login logs" ON login_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own login logs" ON login_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 管理员可以查看所有登录日志
CREATE POLICY "Admins can view all login logs" ON login_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );








