-- 查询活动报名人数的SQL语句

-- 1. 首先获取所有活动的ID和标题
SELECT 
  id,
  title,
  start_time,
  created_at
FROM events
ORDER BY created_at DESC;

-- 2. 查询特定活动的报名人数（请将 YOUR_EVENT_ID 替换为实际的活动ID）
-- 这个查询对应 ScoreForm 中 fetchEvents() 函数的逻辑
SELECT 
  COUNT(*) as total_participants
FROM event_registrations
WHERE event_id = 'YOUR_EVENT_ID'
  AND payment_status = 'paid';

-- 3. 查询特定活动的详细报名信息
-- 这个查询对应 ScoreForm 中 fetchParticipants() 函数的逻辑
SELECT 
  er.id,
  er.user_id,
  er.registration_number,
  er.payment_status,
  up.full_name,
  up.email
FROM event_registrations er
LEFT JOIN user_profiles up ON er.user_id = up.id
WHERE er.event_id = 'YOUR_EVENT_ID'
  AND er.payment_status = 'paid'
ORDER BY er.registration_number;

-- 4. 查询所有活动的报名统计
SELECT 
  e.id,
  e.title,
  COUNT(er.id) as total_registrations,
  COUNT(CASE WHEN er.payment_status = 'paid' THEN 1 END) as paid_registrations
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title
ORDER BY e.created_at DESC;

-- 5. 检查是否有报名记录但用户信息缺失
SELECT 
  er.id,
  er.user_id,
  er.payment_status,
  up.id as profile_exists,
  up.full_name
FROM event_registrations er
LEFT JOIN user_profiles up ON er.user_id = up.id
WHERE er.payment_status = 'paid'
ORDER BY er.created_at DESC
LIMIT 20;






