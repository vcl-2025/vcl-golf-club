-- 为审计日志增加备注字段，用于记录管理员操作原因
ALTER TABLE audit_log
ADD COLUMN IF NOT EXISTS remark text;

COMMENT ON COLUMN audit_log.remark IS '操作备注，例如管理员取消报名原因';
