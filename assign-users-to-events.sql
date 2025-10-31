-- 为每个活动分配至少5个用户的SQL脚本
-- 请在Supabase Dashboard的SQL编辑器中运行

-- 1. 首先查看当前的活动和报名情况
SELECT 
  e.id,
  e.title,
  e.start_time,
  COUNT(er.id) as current_registrations
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title, e.start_time
ORDER BY e.created_at DESC;

-- 2. 查看所有可用的用户
SELECT 
  id,
  full_name,
  email,
  membership_type,
  role
FROM user_profiles
ORDER BY created_at DESC;

-- 3. 为每个活动分配用户（这里需要手动执行，因为SQL无法动态循环）
-- 请根据上面的查询结果，为每个活动手动执行以下插入语句

-- 示例：为第一个活动分配用户（请替换event_id和user_id）
-- INSERT INTO event_registrations (
--   event_id,
--   user_id,
--   participant_name,
--   member_number,
--   phone,
--   payment_status,
--   status,
--   notes
-- ) VALUES
-- ('活动ID1', '用户ID1', '用户1', 'M001', '13800001001', 'paid', 'registered', '系统自动分配'),
-- ('活动ID1', '用户ID2', '用户2', 'M002', '13800001002', 'paid', 'registered', '系统自动分配'),
-- ('活动ID1', '用户ID3', '用户3', 'M003', '13800001003', 'paid', 'registered', '系统自动分配'),
-- ('活动ID1', '用户ID4', '用户4', 'M004', '13800001004', 'paid', 'registered', '系统自动分配'),
-- ('活动ID1', '用户ID5', '用户5', 'M005', '13800001005', 'paid', 'registered', '系统自动分配');

-- 4. 批量分配脚本（需要根据实际情况调整）
-- 这个脚本会为所有活动分配前5个用户
WITH user_list AS (
  SELECT 
    id,
    full_name,
    ROW_NUMBER() OVER (ORDER BY created_at) as user_num
  FROM user_profiles
  LIMIT 5
),
event_list AS (
  SELECT id, title
  FROM events
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
CROSS JOIN user_list ul;

-- 5. 验证分配结果
SELECT 
  e.title as 活动名称,
  COUNT(er.id) as 报名人数,
  STRING_AGG(up.full_name, ', ') as 报名用户
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
LEFT JOIN user_profiles up ON er.user_id = up.id
GROUP BY e.id, e.title
ORDER BY e.created_at DESC;









