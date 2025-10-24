-- 调试特定活动的查询

-- 1. 获取"活动哦"的详细信息
SELECT 
  id,
  title,
  start_time,
  status
FROM events
WHERE title = '活动哦';

-- 2. 查看"活动哦"的报名记录
SELECT 
  er.id,
  er.user_id,
  er.payment_status,
  er.status,
  up.full_name,
  up.email
FROM event_registrations er
LEFT JOIN user_profiles up ON er.user_id = up.id
LEFT JOIN events e ON er.event_id = e.id
WHERE e.title = '活动哦';

-- 3. 测试ScoreForm使用的查询（请将 YOUR_EVENT_ID 替换为上面获取的ID）
-- SELECT 
--   er.id,
--   er.user_id
-- FROM event_registrations er
-- WHERE er.event_id = 'YOUR_EVENT_ID'
--   AND er.payment_status = 'paid';

-- 4. 检查用户信息是否存在
SELECT 
  id,
  full_name,
  email
FROM user_profiles
LIMIT 5;







