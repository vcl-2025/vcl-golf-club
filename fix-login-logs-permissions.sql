-- 完全禁用 login_logs 表的 RLS
ALTER TABLE login_logs DISABLE ROW LEVEL SECURITY;

-- 或者创建允许所有操作的策略
-- DROP POLICY IF EXISTS "Allow authenticated users to insert login logs" ON login_logs;
-- CREATE POLICY "Allow all operations on login_logs" ON login_logs
--   FOR ALL USING (true) WITH CHECK (true);






