-- 为 login_logs 表添加 ip_address 字段
ALTER TABLE login_logs ADD COLUMN IF NOT EXISTS ip_address inet;



