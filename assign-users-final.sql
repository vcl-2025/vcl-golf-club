-- 为每个活动分配至少5个用户的最终SQL脚本

-- 1. 查看当前报名情况
SELECT 
  e.id,
  e.title,
  COUNT(er.id) as current_registrations
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title
ORDER BY e.created_at DESC;

-- 2. 查看所有可用用户
SELECT 
  id,
  full_name,
  email,
  membership_type,
  role,
  created_at
FROM user_profiles
ORDER BY created_at DESC;

-- 3. 为报名不足5人的活动分配用户
WITH user_list AS (
  SELECT 
    id,
    full_name,
    ROW_NUMBER() OVER (ORDER BY created_at DESC) as user_num
  FROM user_profiles
  LIMIT 10  -- 使用前10个用户
),
event_list AS (
  SELECT 
    id, 
    title,
    COUNT(er.id) as current_count
  FROM events e
  LEFT JOIN event_registrations er ON e.id = er.event_id
  GROUP BY e.id, e.title
  HAVING COUNT(er.id) < 5  -- 只处理报名不足5人的活动
)
INSERT INTO event_registrations (
  event_id,
  user_id,
  participant_name,
  member_number,
  phone,
  payment_status,
  status,
  notes
)
SELECT 
  el.id as event_id,
  ul.id as user_id,
  ul.full_name as participant_name,
  'M' || LPAD(ul.user_num::text, 3, '0') as member_number,
  '1380000' || LPAD(ul.user_num::text, 4, '0') as phone,
  'paid' as payment_status,
  'registered' as status,
  '系统自动分配' as notes
FROM event_list el
CROSS JOIN user_list ul
WHERE NOT EXISTS (
  SELECT 1 FROM event_registrations er 
  WHERE er.event_id = el.id AND er.user_id = ul.id
)
ON CONFLICT (event_id, user_id) DO NOTHING;

-- 4. 验证最终结果
SELECT 
  e.title as 活动名称,
  COUNT(er.id) as 报名人数,
  CASE 
    WHEN COUNT(er.id) >= 5 THEN '✅ 满足要求'
    ELSE '❌ 需要更多用户'
  END as 状态,
  STRING_AGG(up.full_name, ', ') as 报名用户
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
LEFT JOIN user_profiles up ON er.user_id = up.id
GROUP BY e.id, e.title
ORDER BY e.created_at DESC;

-- 5. 如果还有活动报名不足5人，显示需要手动处理的活动
SELECT 
  e.id,
  e.title,
  COUNT(er.id) as current_count,
  (5 - COUNT(er.id)) as needed_count
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title
HAVING COUNT(er.id) < 5
ORDER BY e.created_at DESC;






