-- 回退 RLS 策略，恢复正常的用户访问权限

-- 1. 删除我们添加的严格 RLS 策略
DROP POLICY IF EXISTS "Active users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Active users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;

-- 2. 恢复原来的简单策略
CREATE POLICY "Users can view own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid());

-- 3. 管理员可以查看所有用户资料
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

-- 4. 删除我们添加的检查函数（如果存在）
DROP FUNCTION IF EXISTS public.is_user_active(uuid);

-- 5. 验证策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_profiles' 
ORDER BY policyname;





