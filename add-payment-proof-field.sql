-- 检查event_registrations表是否有payment_proof字段
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'event_registrations' 
AND column_name = 'payment_proof';

-- 如果没有payment_proof字段，则添加它
DO $$
BEGIN
    -- 检查字段是否存在
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_registrations' 
        AND column_name = 'payment_proof'
    ) THEN
        -- 添加payment_proof字段
        ALTER TABLE event_registrations 
        ADD COLUMN payment_proof TEXT;
        
        -- 添加注释
        COMMENT ON COLUMN event_registrations.payment_proof IS '支付证明图片URL';
        
        RAISE NOTICE '已添加payment_proof字段';
    ELSE
        RAISE NOTICE 'payment_proof字段已存在';
    END IF;
END $$;

-- 验证字段是否添加成功
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'event_registrations' 
AND column_name = 'payment_proof';






