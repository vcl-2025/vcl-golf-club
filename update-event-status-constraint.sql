-- 更新events表的status约束，添加'upcoming'状态
-- 首先删除旧的约束
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;

-- 添加新的约束，包含upcoming状态
ALTER TABLE events ADD CONSTRAINT events_status_check 
CHECK (status IN ('upcoming', 'active', 'cancelled', 'completed'));

-- 更新默认状态为upcoming（新创建的活动应该是未开始状态）
ALTER TABLE events ALTER COLUMN status SET DEFAULT 'upcoming';







