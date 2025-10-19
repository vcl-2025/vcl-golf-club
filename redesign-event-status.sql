-- 重新设计活动状态系统
-- 数据库只存储 active 和 cancelled 两种状态
-- 显示状态完全基于时间计算

-- 1. 更新数据库约束，只允许 active 和 cancelled
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check 
CHECK (status IN ('active', 'cancelled'));

-- 2. 更新默认状态为 active（新创建的活动默认是正常状态）
ALTER TABLE events ALTER COLUMN status SET DEFAULT 'active';

-- 3. 更新现有数据，将非 cancelled 状态都改为 active
UPDATE events 
SET status = 'active' 
WHERE status NOT IN ('cancelled');

-- 4. 删除旧的触发器（不再需要自动更新状态）
DROP TRIGGER IF EXISTS update_event_status_trigger ON events;
DROP FUNCTION IF EXISTS update_event_status();

-- 5. 创建新的状态计算函数（仅用于显示）
CREATE OR REPLACE FUNCTION get_display_status(
    event_start_time TIMESTAMP WITH TIME ZONE,
    event_end_time TIMESTAMP WITH TIME ZONE,
    event_status TEXT
)
RETURNS TEXT AS $$
BEGIN
    -- 如果活动被取消，直接返回已取消
    IF event_status = 'cancelled' THEN
        RETURN 'cancelled';
    END IF;
    
    -- 根据时间计算显示状态
    IF NOW() < event_start_time THEN
        RETURN 'upcoming';  -- 未开始
    ELSIF NOW() > event_end_time THEN
        RETURN 'completed'; -- 已完成
    ELSE
        RETURN 'active';    -- 进行中
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建视图，显示计算后的状态
CREATE OR REPLACE VIEW events_with_display_status AS
SELECT 
    *,
    get_display_status(start_time, end_time, status) as display_status,
    CASE 
        WHEN get_display_status(start_time, end_time, status) = 'upcoming' THEN '未开始'
        WHEN get_display_status(start_time, end_time, status) = 'active' THEN '进行中'
        WHEN get_display_status(start_time, end_time, status) = 'completed' THEN '已完成'
        WHEN get_display_status(start_time, end_time, status) = 'cancelled' THEN '已取消'
    END as display_status_text
FROM events;

-- 7. 测试查询
SELECT 
    title,
    start_time,
    end_time,
    status as stored_status,
    display_status,
    display_status_text
FROM events_with_display_status
ORDER BY start_time;

-- 8. 添加注释说明
COMMENT ON FUNCTION get_display_status IS '根据时间和存储状态计算显示状态';
COMMENT ON VIEW events_with_display_status IS '包含计算后显示状态的活动视图';

