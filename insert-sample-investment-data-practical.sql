-- 插入投资管理模拟数据 - 实用版本
-- 这个版本会自动获取现有的项目ID和用户ID

-- 1. 插入投资项目（如果不存在）
INSERT INTO investment_projects (
    id,
    title,
    description,
    target_amount,
    current_amount,
    payment_method,
    payment_qrcode_url,
    emt_email,
    start_date,
    end_date,
    created_at,
    updated_at
) VALUES 
-- 球场扩建项目
(
    gen_random_uuid(),
    '球场扩建项目',
    '为提升会员体验，计划扩建球场设施，包括新建练习场、更衣室升级和餐厅扩建。项目将显著提升俱乐部的服务质量和会员满意度。',
    50000.00,
    0.00,
    'emt',
    null,
    'golfclub@example.com',
    '2024-01-01',
    '2024-12-31',
    '2024-01-01 10:00:00+00',
    '2024-01-01 10:00:00+00'
),

-- 设备升级项目
(
    gen_random_uuid(),
    '高尔夫设备升级',
    '更新俱乐部的高尔夫球车、球杆租赁设备和练习场设施，为会员提供更现代化的高尔夫体验。',
    30000.00,
    0.00,
    'bank_transfer',
    null,
    null,
    '2024-03-01',
    '2024-10-31',
    '2024-02-15 14:30:00+00',
    '2024-02-15 14:30:00+00'
),

-- 环保绿化项目
(
    gen_random_uuid(),
    '环保绿化改造',
    '实施环保节能措施，包括太阳能板安装、节水灌溉系统和有机草坪管理，打造绿色环保的高尔夫球场。',
    25000.00,
    0.00,
    'emt',
    null,
    'green@golfclub.com',
    '2024-06-01',
    '2024-11-30',
    '2024-05-20 09:15:00+00',
    '2024-05-20 09:15:00+00'
),

-- 会员活动中心
(
    gen_random_uuid(),
    '会员活动中心建设',
    '建设多功能会员活动中心，包含会议室、休息区、健身房和儿童游乐区，为会员提供全方位的休闲服务。',
    80000.00,
    0.00,
    'bank_transfer',
    null,
    null,
    '2024-09-01',
    '2025-06-30',
    '2024-08-10 16:45:00+00',
    '2024-08-10 16:45:00+00'
),

-- 技术升级项目
(
    gen_random_uuid(),
    '智能管理系统',
    '引入智能球场管理系统，包括在线预订、GPS球车定位、成绩统计和会员服务APP，提升管理效率。',
    15000.00,
    0.00,
    'emt',
    null,
    'tech@golfclub.com',
    '2024-11-01',
    '2025-03-31',
    '2024-10-15 11:20:00+00',
    '2024-10-15 11:20:00+00'
)
ON CONFLICT (title) DO NOTHING;

-- 2. 插入投资记录（使用动态查询获取项目ID和用户ID）
WITH project_ids AS (
  SELECT id, title FROM investment_projects WHERE title IN (
    '球场扩建项目', '高尔夫设备升级', '环保绿化改造', '会员活动中心建设', '智能管理系统'
  )
),
user_ids AS (
  SELECT id FROM user_profiles LIMIT 15
)
INSERT INTO investments (
    id,
    project_id,
    user_id,
    amount,
    payment_proof,
    status,
    notes,
    created_at
)
SELECT 
    gen_random_uuid(),
    p.id,
    u.id,
    CASE 
        WHEN p.title = '球场扩建项目' THEN (ARRAY[5000, 3000, 2000, 1500, 8000])[random() * 5 + 1]::int
        WHEN p.title = '高尔夫设备升级' THEN (ARRAY[2000, 1500, 1000, 1200, 1800])[random() * 5 + 1]::int
        WHEN p.title = '环保绿化改造' THEN (ARRAY[3000, 2500, 1800, 2200, 2800])[random() * 5 + 1]::int
        WHEN p.title = '会员活动中心建设' THEN (ARRAY[10000, 5000, 3000, 4000, 6000])[random() * 5 + 1]::int
        WHEN p.title = '智能管理系统' THEN (ARRAY[2000, 1500, 1000, 1200, 1800])[random() * 5 + 1]::int
    END,
    'payment_proof_' || (random() * 1000)::int || '.jpg',
    CASE 
        WHEN random() < 0.8 THEN 'confirmed'
        ELSE 'pending'
    END,
    CASE 
        WHEN p.title = '球场扩建项目' THEN '支持球场扩建，期待更好的设施'
        WHEN p.title = '高尔夫设备升级' THEN '希望有更好的设备体验'
        WHEN p.title = '环保绿化改造' THEN '支持环保理念，绿色高尔夫'
        WHEN p.title = '会员活动中心建设' THEN '期待新的活动中心'
        WHEN p.title = '智能管理系统' THEN '支持智能化升级'
    END,
    NOW() - (random() * interval '6 months')
FROM project_ids p
CROSS JOIN user_ids u
WHERE random() < 0.3; -- 30%的概率生成投资记录

-- 3. 更新项目的当前筹集金额
UPDATE investment_projects 
SET current_amount = (
    SELECT COALESCE(SUM(amount), 0)
    FROM investments 
    WHERE project_id = investment_projects.id 
    AND status = 'confirmed'
);

-- 4. 显示结果统计
SELECT 
    p.title as "项目名称",
    p.target_amount as "目标金额",
    p.current_amount as "已筹集金额",
    ROUND((p.current_amount / p.target_amount * 100), 1) as "完成百分比",
    COUNT(i.id) as "投资记录数"
FROM investment_projects p
LEFT JOIN investments i ON p.id = i.project_id
GROUP BY p.id, p.title, p.target_amount, p.current_amount
ORDER BY p.created_at DESC;




