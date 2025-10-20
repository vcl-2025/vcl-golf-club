-- 添加唯一约束，防止同一用户重复报名同一活动
-- 但允许用户取消报名后重新报名（通过删除记录实现）

-- 首先检查是否已存在约束
DO $$
BEGIN
    -- 检查是否已存在唯一约束
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'event_registrations_user_event_unique' 
        AND table_name = 'event_registrations'
    ) THEN
        -- 添加唯一约束
        ALTER TABLE event_registrations 
        ADD CONSTRAINT event_registrations_user_event_unique 
        UNIQUE (user_id, event_id);
        
        RAISE NOTICE '已添加唯一约束: event_registrations_user_event_unique';
    ELSE
        RAISE NOTICE '唯一约束已存在: event_registrations_user_event_unique';
    END IF;
END $$;

-- 验证约束是否生效
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conname = 'event_registrations_user_event_unique';



