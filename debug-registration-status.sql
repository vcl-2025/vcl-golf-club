-- 检查报名记录的状态和支付状态
SELECT 
    id,
    event_id,
    user_id,
    payment_status,
    status,
    created_at
FROM event_registrations 
ORDER BY created_at DESC 
LIMIT 10;






