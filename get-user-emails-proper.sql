-- 创建安全的存储过程获取用户邮箱
CREATE OR REPLACE FUNCTION get_user_emails(user_ids UUID[])
RETURNS TABLE (
  id UUID,
  email TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER  -- 以定义者权限执行，可以访问 auth.users
AS $$
BEGIN
  -- 检查输入参数
  IF user_ids IS NULL OR array_length(user_ids, 1) = 0 THEN
    RETURN;
  END IF;
  
  -- 返回指定用户的邮箱
  RETURN QUERY
  SELECT 
    au.id,
    au.email
  FROM auth.users au
  WHERE au.id = ANY(user_ids)
  AND au.email IS NOT NULL;
END;
$$;

-- 授予权限
GRANT EXECUTE ON FUNCTION get_user_emails(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_emails(UUID[]) TO anon;

-- 测试存储过程
-- SELECT * FROM get_user_emails(ARRAY['user-id-1', 'user-id-2']);






