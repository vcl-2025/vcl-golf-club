-- 修复新用户注册问题
-- 创建缺失的 handle_new_user() 函数和 on_auth_user_created 触发器

-- 创建函数：自动为新用户创建资料
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_phone TEXT;
BEGIN
  -- 从 metadata 提取数据
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User');
  v_phone := NEW.raw_user_meta_data->>'phone';
  
  -- 插入用户资料
  INSERT INTO public.user_profiles (
    id,
    full_name,
    phone,
    role,
    membership_type,
    email
  ) VALUES (
    NEW.id,
    v_full_name,
    v_phone,
    'member',
    'standard',
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
    email = COALESCE(EXCLUDED.email, user_profiles.email);
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- 如果出错，记录警告但继续（避免阻止用户创建）
  RAISE WARNING '创建用户资料时出错: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- 创建触发器：监听 auth.users 表的 INSERT 事件
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 为已存在但没有资料的用户补充资料
INSERT INTO public.user_profiles (id, full_name, role, membership_type, email)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', 'User'),
  'member',
  'standard',
  u.email
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email;
