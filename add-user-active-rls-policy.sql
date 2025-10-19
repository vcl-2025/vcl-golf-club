-- 为 user_profiles 表添加 RLS 策略，确保禁用用户无法访问数据

-- 1. 确保 RLS 已启用
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 2. 创建检查用户是否活跃的函数
CREATE OR REPLACE FUNCTION public.is_user_active(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = user_id AND is_active = true
  );
END;
$$;

-- 3. 删除现有的策略（如果存在）
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;

-- 4. 创建新的策略，确保只有活跃用户可以访问自己的资料
CREATE POLICY "Active users can view own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid() AND is_active = true);

CREATE POLICY "Active users can update own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid() AND is_active = true);

-- 5. 管理员可以查看所有用户资料（包括禁用的）
CREATE POLICY "Admins can view all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update all profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 6. 添加注释
COMMENT ON FUNCTION public.is_user_active(uuid) IS '检查用户是否活跃，用于 RLS 策略';
COMMENT ON POLICY "Active users can view own profile" ON public.user_profiles IS '只有活跃用户可以查看自己的资料';
COMMENT ON POLICY "Active users can update own profile" ON public.user_profiles IS '只有活跃用户可以更新自己的资料';
COMMENT ON POLICY "Admins can view all profiles" ON public.user_profiles IS '管理员可以查看所有用户资料';
COMMENT ON POLICY "Admins can update all profiles" ON public.user_profiles IS '管理员可以更新所有用户资料';

-- 7. 验证策略创建
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_profiles' 
ORDER BY policyname;



