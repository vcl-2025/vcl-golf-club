-- 紧急修复数据访问问题
-- 确保所有用户都能正常访问数据

-- 1. 删除所有现有的 user_profiles 策略
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Active users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Active users can update own profile" ON public.user_profiles;

-- 2. 创建最基本的策略，允许所有认证用户访问
CREATE POLICY "Allow all authenticated users to view profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow all authenticated users to update profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow all authenticated users to insert profiles"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. 确保 RLS 已启用
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. 验证策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_profiles' 
ORDER BY policyname;





