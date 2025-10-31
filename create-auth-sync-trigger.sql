-- 创建触发器，当 auth.users 更新时自动同步到 user_profiles
CREATE OR REPLACE FUNCTION public.sync_auth_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 当 auth.users 的 last_sign_in_at 更新时，同步到 user_profiles
  IF TG_OP = 'UPDATE' AND OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at THEN
    UPDATE public.user_profiles 
    SET last_sign_in_at = NEW.last_sign_in_at
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 创建触发器，监听 auth.users 表的更新
DROP TRIGGER IF EXISTS trigger_sync_auth_to_profile ON auth.users;
CREATE TRIGGER trigger_sync_auth_to_profile
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_auth_to_profile();

-- 添加注释
COMMENT ON FUNCTION public.sync_auth_to_profile() IS '当用户登录时自动同步最后登录时间到 user_profiles';








