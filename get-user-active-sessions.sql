-- 创建获取用户活跃会话的 RPC 函数
CREATE OR REPLACE FUNCTION get_user_active_sessions(target_user_id uuid DEFAULT NULL)
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
DECLARE
  current_user_id uuid;
BEGIN
  -- 获取当前用户ID
  current_user_id := auth.uid();
  
  -- 如果没有提供目标用户ID，使用当前用户ID
  IF target_user_id IS NULL THEN
    target_user_id := current_user_id;
  END IF;
  
  -- 检查权限：只有管理员可以查看其他用户的会话
  IF target_user_id != current_user_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = current_user_id AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Access denied: Admin role required to view other users sessions';
    END IF;
  END IF;
  
  -- 返回目标用户的活跃会话
  RETURN QUERY
  SELECT 
    s.user_id,
    s.created_at,
    s.user_agent,
    s.ip,
    s.refreshed_at
  FROM auth.sessions s
  WHERE s.user_id = target_user_id
  ORDER BY s.created_at DESC;
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION get_user_active_sessions(uuid) TO authenticated;



