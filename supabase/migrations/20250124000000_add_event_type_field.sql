-- 为 events 表添加活动类型字段
-- 支持三种活动类型：普通活动、个人赛、团体赛

-- 添加活动类型字段
ALTER TABLE events 
ADD COLUMN event_type text NOT NULL DEFAULT '普通活动' 
CHECK (event_type IN ('普通活动', '个人赛', '团体赛'));

-- 添加注释
COMMENT ON COLUMN events.event_type IS '活动类型：普通活动、个人赛、团体赛';

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);

-- 更新现有数据（如果需要的话，这里假设所有现有活动都是普通活动）
-- UPDATE events SET event_type = '普通活动' WHERE event_type IS NULL;

