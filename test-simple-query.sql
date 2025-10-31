-- 简单的测试查询

-- 1. 测试基本的报名记录查询
SELECT 
  COUNT(*) as total_count
FROM event_registrations
WHERE payment_status = 'paid';

-- 2. 测试特定活动的查询（请替换为实际的活动ID）
-- SELECT 
--   COUNT(*) as event_participants
-- FROM event_registrations
-- WHERE event_id = 'YOUR_EVENT_ID'
--   AND payment_status = 'paid';

-- 3. 测试用户信息查询
SELECT 
  COUNT(*) as user_count
FROM user_profiles;

-- 4. 测试关联查询
SELECT 
  er.id,
  er.user_id,
  up.full_name
FROM event_registrations er
LEFT JOIN user_profiles up ON er.user_id = up.id
WHERE er.payment_status = 'paid'
LIMIT 5;









