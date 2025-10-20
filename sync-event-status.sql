-- 同步活动状态的定时任务
-- 确保数据库中的状态与时间计算保持一致

-- 1. 创建状态同步函数
CREATE OR REPLACE FUNCTION sync_event_status()
RETURNS void AS $$
BEGIN
    -- 更新未开始的活动（保留手动取消的状态）
    UPDATE events 
    SET status = 'upcoming' 
    WHERE start_time > NOW() 
    AND status != 'cancelled';
    
    -- 更新已完成的活动（保留手动取消的状态）
    UPDATE events 
    SET status = 'completed' 
    WHERE end_time < NOW() 
    AND status != 'cancelled';
    
    -- 更新进行中的活动（保留手动取消的状态）
    UPDATE events 
    SET status = 'active' 
    WHERE start_time <= NOW() 
    AND end_time >= NOW() 
    AND status != 'cancelled';
    
    -- 记录同步日志
    INSERT INTO system_logs (log_type, message, created_at)
    VALUES ('status_sync', '活动状态同步完成', NOW())
    ON CONFLICT DO NOTHING;
    
END;
$$ LANGUAGE plpgsql;

-- 2. 创建系统日志表（如果不存在）
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    log_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建定时任务（需要 pg_cron 扩展）
-- 每小时执行一次状态同步
SELECT cron.schedule('sync-event-status', '0 * * * *', 'SELECT sync_event_status();');

-- 4. 手动执行一次同步
SELECT sync_event_status();

-- 5. 查看同步结果
SELECT 
    status,
    COUNT(*) as count,
    CASE 
        WHEN status = 'upcoming' THEN '未开始'
        WHEN status = 'active' THEN '进行中'
        WHEN status = 'completed' THEN '已完成'
        WHEN status = 'cancelled' THEN '已取消'
    END as status_name
FROM events 
GROUP BY status
ORDER BY status;



