-- 创建获取 sessions 数据的 RPC 函数
CREATE OR REPLACE FUNCTION get_sessions_data()
RETURNS TABLE (
  user_id uuid,
  created_at timestamptz,
  user_agent text,
  ip inet,
  refreshed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 只有管理员可以访问
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- 返回最近7天的 sessions 数据
  RETURN QUERY
  SELECT 
    s.user_id,
    s.created_at,
    s.user_agent,
    s.ip,
    s.refreshed_at
  FROM auth.sessions s
  WHERE s.created_at >= NOW() - INTERVAL '7 days'
  ORDER BY s.created_at DESC;
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION get_sessions_data() TO authenticated;








