-- 为比赛活动分配报名人员 (每个比赛至少6个已支付完成的报名) - 完全正确版本
-- 基于实际的 event_registrations 表结构

-- 为2020年比赛分配报名
INSERT INTO event_registrations (
    id,
    event_id,
    user_id,
    payment_status,
    registration_time,
    notes,
    status,
    approval_status,
    approval_time,
    approved_by
)
SELECT 
    gen_random_uuid(),
    e.id,
    u.id,
    'paid',
    e.registration_deadline - interval '1 day' + (random() * interval '5 days'),
    '比赛报名 - 已支付',
    'registered',
    'approved',
    e.registration_deadline - interval '1 day' + (random() * interval '5 days'),
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
FROM events e
CROSS JOIN (
    SELECT id FROM user_profiles 
    WHERE role IN ('member', 'premium_member', 'vip_member')
    ORDER BY random()
    LIMIT 6
) u
WHERE e.title LIKE '%2020%' 
  AND (e.title LIKE '%赛%' OR e.title LIKE '%锦标赛%' OR e.title LIKE '%公开赛%' OR e.title LIKE '%友谊赛%' OR e.title LIKE '%慈善赛%')
  AND e.status = 'active';

-- 为2021年比赛分配报名
INSERT INTO event_registrations (
    id,
    event_id,
    user_id,
    payment_status,
    registration_time,
    notes,
    status,
    approval_status,
    approval_time,
    approved_by
)
SELECT 
    gen_random_uuid(),
    e.id,
    u.id,
    'paid',
    e.registration_deadline - interval '1 day' + (random() * interval '5 days'),
    '比赛报名 - 已支付',
    'registered',
    'approved',
    e.registration_deadline - interval '1 day' + (random() * interval '5 days'),
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
FROM events e
CROSS JOIN (
    SELECT id FROM user_profiles 
    WHERE role IN ('member', 'premium_member', 'vip_member')
    ORDER BY random()
    LIMIT 6
) u
WHERE e.title LIKE '%2021%' 
  AND (e.title LIKE '%赛%' OR e.title LIKE '%锦标赛%' OR e.title LIKE '%公开赛%' OR e.title LIKE '%友谊赛%' OR e.title LIKE '%慈善赛%')
  AND e.status = 'active';

-- 为2022年比赛分配报名
INSERT INTO event_registrations (
    id,
    event_id,
    user_id,
    payment_status,
    registration_time,
    notes,
    status,
    approval_status,
    approval_time,
    approved_by
)
SELECT 
    gen_random_uuid(),
    e.id,
    u.id,
    'paid',
    e.registration_deadline - interval '1 day' + (random() * interval '5 days'),
    '比赛报名 - 已支付',
    'registered',
    'approved',
    e.registration_deadline - interval '1 day' + (random() * interval '5 days'),
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
FROM events e
CROSS JOIN (
    SELECT id FROM user_profiles 
    WHERE role IN ('member', 'premium_member', 'vip_member')
    ORDER BY random()
    LIMIT 6
) u
WHERE e.title LIKE '%2022%' 
  AND (e.title LIKE '%赛%' OR e.title LIKE '%锦标赛%' OR e.title LIKE '%公开赛%' OR e.title LIKE '%友谊赛%' OR e.title LIKE '%慈善赛%')
  AND e.status = 'active';

-- 为2023年比赛分配报名
INSERT INTO event_registrations (
    id,
    event_id,
    user_id,
    payment_status,
    registration_time,
    notes,
    status,
    approval_status,
    approval_time,
    approved_by
)
SELECT 
    gen_random_uuid(),
    e.id,
    u.id,
    'paid',
    e.registration_deadline - interval '1 day' + (random() * interval '5 days'),
    '比赛报名 - 已支付',
    'registered',
    'approved',
    e.registration_deadline - interval '1 day' + (random() * interval '5 days'),
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
FROM events e
CROSS JOIN (
    SELECT id FROM user_profiles 
    WHERE role IN ('member', 'premium_member', 'vip_member')
    ORDER BY random()
    LIMIT 6
) u
WHERE e.title LIKE '%2023%' 
  AND (e.title LIKE '%赛%' OR e.title LIKE '%锦标赛%' OR e.title LIKE '%公开赛%' OR e.title LIKE '%友谊赛%' OR e.title LIKE '%慈善赛%')
  AND e.status = 'active';

-- 为2024年比赛分配报名
INSERT INTO event_registrations (
    id,
    event_id,
    user_id,
    payment_status,
    registration_time,
    notes,
    status,
    approval_status,
    approval_time,
    approved_by
)
SELECT 
    gen_random_uuid(),
    e.id,
    u.id,
    'paid',
    e.registration_deadline - interval '1 day' + (random() * interval '5 days'),
    '比赛报名 - 已支付',
    'registered',
    'approved',
    e.registration_deadline - interval '1 day' + (random() * interval '5 days'),
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
FROM events e
CROSS JOIN (
    SELECT id FROM user_profiles 
    WHERE role IN ('member', 'premium_member', 'vip_member')
    ORDER BY random()
    LIMIT 6
) u
WHERE e.title LIKE '%2024%' 
  AND (e.title LIKE '%赛%' OR e.title LIKE '%锦标赛%' OR e.title LIKE '%公开赛%' OR e.title LIKE '%友谊赛%' OR e.title LIKE '%慈善赛%')
  AND e.status = 'active';

-- 验证报名数据
SELECT 
    e.title,
    e.start_time,
    COUNT(er.id) as total_registrations,
    COUNT(CASE WHEN er.payment_status = 'paid' THEN 1 END) as paid_registrations,
    COUNT(CASE WHEN er.status = 'registered' THEN 1 END) as registered_count,
    COUNT(CASE WHEN er.approval_status = 'approved' THEN 1 END) as approved_count
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
WHERE e.title LIKE '%赛%' OR e.title LIKE '%锦标赛%' OR e.title LIKE '%公开赛%' OR e.title LIKE '%友谊赛%' OR e.title LIKE '%慈善赛%'
GROUP BY e.id, e.title, e.start_time
ORDER BY e.start_time;
