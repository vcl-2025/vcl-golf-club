-- 简化版本：获取当前用户的活跃会话
CREATE OR REPLACE FUNCTION get_user_active_sessions()
RETURNS TABLE (
  user_id uuid,
  created_at timestamptz,
  user_agent text,
  ip inet
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 返回当前用户的活跃会话
  RETURN QUERY
  SELECT 
    s.user_id,
    s.created_at,
    s.user_agent,
    s.ip
  FROM auth.sessions s
  WHERE s.user_id = auth.uid()
  ORDER BY s.created_at DESC;
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION get_user_active_sessions() TO authenticated;





