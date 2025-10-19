-- 修复重复报名问题的SQL脚本

-- 1. 查看重复的报名记录
SELECT 
  event_id,
  user_id,
  COUNT(*) as duplicate_count
FROM event_registrations
GROUP BY event_id, user_id
HAVING COUNT(*) > 1;

-- 2. 删除重复的报名记录（保留最新的）
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY event_id, user_id 
      ORDER BY created_at DESC
    ) as rn
  FROM event_registrations
)
DELETE FROM event_registrations 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 3. 查看当前每个活动的报名情况
SELECT 
  e.id,
  e.title,
  COUNT(er.id) as current_registrations
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title
ORDER BY e.created_at DESC;

-- 4. 为报名不足5人的活动添加用户
-- 使用INSERT ... ON CONFLICT DO NOTHING 避免重复错误
WITH user_list AS (
  SELECT 
    id,
    full_name,
    ROW_NUMBER() OVER (ORDER BY created_at) as user_num
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

-- 5. 最终验证结果
SELECT 
  e.title as 活动名称,
  COUNT(er.id) as 报名人数,
  CASE 
    WHEN COUNT(er.id) >= 5 THEN '✅ 满足要求'
    ELSE '❌ 需要更多用户'
  END as 状态
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title
ORDER BY e.created_at DESC;




