-- 创建更新用户认证状态的 RPC 函数
-- 这个函数用于启用/禁用用户登录权限

CREATE OR REPLACE FUNCTION public.update_user_auth_status(
  user_id uuid,
  is_banned boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 更新 auth.users 表的 banned_until 字段
  -- 如果 is_banned 为 true，设置 banned_until 为未来时间（永久禁用）
  -- 如果 is_banned 为 false，设置 banned_until 为 null（启用）
  
  IF is_banned THEN
    -- 禁用用户：设置 banned_until 为未来时间
    UPDATE auth.users 
    SET banned_until = '2099-12-31 23:59:59+00'::timestamptz
    WHERE id = user_id;
  ELSE
    -- 启用用户：清除 banned_until
    UPDATE auth.users 
    SET banned_until = NULL
    WHERE id = user_id;
  END IF;
  
  -- 记录操作日志（可选）
  INSERT INTO public.admin_logs (
    action,
    target_user_id,
    admin_user_id,
    details,
    created_at
  ) VALUES (
    CASE WHEN is_banned THEN 'user_banned' ELSE 'user_unbanned' END,
    user_id,
    auth.uid(),
    json_build_object('banned', is_banned),
    now()
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- 如果更新失败，抛出错误
    RAISE EXCEPTION 'Failed to update user auth status: %', SQLERRM;
END;
$$;

-- 创建管理员操作日志表（如果不存在）
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  action text NOT NULL,
  target_user_id uuid,
  admin_user_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- 添加注释
COMMENT ON FUNCTION public.update_user_auth_status(uuid, boolean) IS '更新用户认证状态，启用或禁用用户登录权限';
COMMENT ON TABLE public.admin_logs IS '管理员操作日志表';

-- 验证函数创建成功
SELECT proname, prosrc FROM pg_proc WHERE proname = 'update_user_auth_status';





