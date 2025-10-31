-- 更新events表中的status字段，使其与动态计算保持一致
-- 根据活动时间自动更新所有活动的状态

-- 更新未开始的活动
UPDATE events 
SET status = 'upcoming' 
WHERE start_time > NOW() 
AND status != 'cancelled';

-- 更新已完成的活动
UPDATE events 
SET status = 'completed' 
WHERE end_time < NOW() 
AND status != 'cancelled';

-- 更新进行中的活动
UPDATE events 
SET status = 'active' 
WHERE start_time <= NOW() 
AND end_time >= NOW() 
AND status != 'cancelled';

-- 创建触发器，自动更新活动状态
CREATE OR REPLACE FUNCTION update_event_status()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果活动被取消，保持取消状态
    IF NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;
    
    -- 根据时间自动设置状态
    IF NEW.start_time > NOW() THEN
        NEW.status = 'upcoming';
    ELSIF NEW.end_time < NOW() THEN
        NEW.status = 'completed';
    ELSE
        NEW.status = 'active';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器
DROP TRIGGER IF EXISTS update_event_status_trigger ON events;
CREATE TRIGGER update_event_status_trigger
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_event_status();

-- 添加注释
COMMENT ON FUNCTION update_event_status() IS '自动根据时间更新活动状态';






