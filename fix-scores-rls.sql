-- 修复成绩查询表的RLS问题
-- 按照用户要求，用SQL筛选而不是RLS

-- 1. 删除所有现有的scores表RLS策略
DROP POLICY IF EXISTS "Users can view own scores" ON scores;
DROP POLICY IF EXISTS "Admins can view all scores" ON scores;
DROP POLICY IF EXISTS "Admins can insert scores" ON scores;
DROP POLICY IF EXISTS "Admins can update scores" ON scores;
DROP POLICY IF EXISTS "Admins can delete scores" ON scores;

-- 2. 禁用RLS，允许所有认证用户访问
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;

-- 3. 确保表结构正确
-- 成绩表应该允许所有用户查看，通过SQL筛选来控制访问权限

-- 4. 验证RLS已禁用
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'scores';

