-- 添加 is_public 字段到 events 表
-- 用于区分活动回顾是所有人可见还是仅会员可见

ALTER TABLE events ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 添加注释说明
COMMENT ON COLUMN events.is_public IS '活动回顾是否对所有人公开（true=所有人可见，false=仅会员可见）';

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_events_is_public ON events(is_public);

