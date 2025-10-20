-- 测试 ScoreForm 的查询逻辑

-- 1. 获取第一个活动的ID
SELECT 
  id,
  title,
  start_time
FROM events
ORDER BY created_at DESC
LIMIT 1;

-- 2. 检查该活动的报名记录（替换 YOUR_EVENT_ID 为实际的ID）
-- SELECT 
--   id,
--   user_id,
--   payment_status,
--   registration_number
-- FROM event_registrations
-- WHERE event_id = 'YOUR_EVENT_ID';

-- 3. 测试关联查询（这是ScoreForm使用的查询）
-- 请将 YOUR_EVENT_ID 替换为步骤1中获取的活动ID
-- SELECT 
--   id,
--   user_id,
--   registration_number,
--   user_profiles!event_registrations_user_id_fkey (
--     full_name,
--     email
--   )
-- FROM event_registrations
-- WHERE event_id = 'YOUR_EVENT_ID'
--   AND payment_status = 'paid'
-- ORDER BY registration_number;

-- 4. 如果上面的查询失败，尝试简化的关联查询
-- SELECT 
--   er.id,
--   er.user_id,
--   er.registration_number,
--   up.full_name,
--   up.email
-- FROM event_registrations er
-- LEFT JOIN user_profiles up ON er.user_id = up.id
-- WHERE er.event_id = 'YOUR_EVENT_ID'
--   AND er.payment_status = 'paid'
-- ORDER BY er.registration_number;

-- 5. 检查 user_profiles 表的数据
SELECT 
  id,
  full_name,
  email,
  created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;

-- 6. 检查 event_registrations 和 user_profiles 的关联
SELECT 
  er.id as registration_id,
  er.user_id,
  er.payment_status,
  up.id as profile_id,
  up.full_name,
  up.email
FROM event_registrations er
LEFT JOIN user_profiles up ON er.user_id = up.id
ORDER BY er.created_at DESC
LIMIT 10;






