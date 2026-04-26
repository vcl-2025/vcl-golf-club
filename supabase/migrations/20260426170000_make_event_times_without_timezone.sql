-- 已废弃：events 时间列应保持 timestamp with time zone（timestamptz）。
-- 若线上库曾误改为无时区，请在 Supabase SQL 中单独评估后手工改回，勿在此仓库重复执行破坏性 ALTER。
SELECT 1;
