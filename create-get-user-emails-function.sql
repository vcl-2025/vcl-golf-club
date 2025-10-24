-- 创建存储过程来获取用户邮箱
CREATE OR REPLACE FUNCTION get_user_emails(user_ids UUID[])
RETURNS TABLE (
  id UUID,
  email TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email
  FROM auth.users au
  WHERE au.id = ANY(user_ids);
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION get_user_emails(UUID[]) TO authenticated;






