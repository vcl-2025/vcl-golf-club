-- 创建简单的登录日志表，不使用 RLS
CREATE TABLE IF NOT EXISTS login_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  login_time timestamptz DEFAULT NOW(),
  device_type text,
  user_agent text,
  created_at timestamptz DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_login_time ON login_logs(login_time);

-- 不启用 RLS，直接允许所有操作
-- ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;








