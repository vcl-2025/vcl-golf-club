-- 插入投资管理模拟数据
-- 投资项目表 (investment_projects) 和投资记录表 (investments)

-- 1. 先插入投资项目
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
);

-- 2. 获取刚插入的项目ID（这里需要手动替换为实际的UUID）
-- 假设项目ID分别为 project1, project2, project3, project4, project5

-- 3. 插入投资记录
-- 球场扩建项目的投资记录
INSERT INTO investments (
    id,
    project_id,
    user_id,
    amount,
    payment_proof,
    status,
    notes,
    created_at
) VALUES 
-- 需要替换为实际的project_id和user_id
(gen_random_uuid(), 'PROJECT_ID_1', 'USER_ID_1', 5000.00, 'payment_proof_1.jpg', 'confirmed', '支持球场扩建，期待更好的设施', '2024-01-15 10:30:00+00'),
(gen_random_uuid(), 'PROJECT_ID_1', 'USER_ID_2', 3000.00, 'payment_proof_2.jpg', 'confirmed', '希望早日看到新球场', '2024-01-20 14:20:00+00'),
(gen_random_uuid(), 'PROJECT_ID_1', 'USER_ID_3', 2000.00, 'payment_proof_3.jpg', 'pending', '等待管理员确认', '2024-01-25 09:15:00+00'),
(gen_random_uuid(), 'PROJECT_ID_1', 'USER_ID_4', 1500.00, 'payment_proof_4.jpg', 'confirmed', '小额支持，积少成多', '2024-02-01 16:45:00+00'),
(gen_random_uuid(), 'PROJECT_ID_1', 'USER_ID_5', 8000.00, 'payment_proof_5.jpg', 'confirmed', '大额投资，相信项目前景', '2024-02-10 11:30:00+00'),

-- 设备升级项目的投资记录
(gen_random_uuid(), 'PROJECT_ID_2', 'USER_ID_1', 2000.00, 'payment_proof_6.jpg', 'confirmed', '支持设备升级', '2024-03-05 13:20:00+00'),
(gen_random_uuid(), 'PROJECT_ID_2', 'USER_ID_6', 1500.00, 'payment_proof_7.jpg', 'confirmed', '希望有更好的球车', '2024-03-12 15:30:00+00'),
(gen_random_uuid(), 'PROJECT_ID_2', 'USER_ID_7', 1000.00, 'payment_proof_8.jpg', 'confirmed', '支持俱乐部发展', '2024-03-18 10:15:00+00'),

-- 环保绿化项目的投资记录
(gen_random_uuid(), 'PROJECT_ID_3', 'USER_ID_2', 3000.00, 'payment_proof_9.jpg', 'confirmed', '支持环保理念', '2024-06-10 14:00:00+00'),
(gen_random_uuid(), 'PROJECT_ID_3', 'USER_ID_8', 2500.00, 'payment_proof_10.jpg', 'confirmed', '绿色高尔夫，从我做起', '2024-06-15 09:30:00+00'),
(gen_random_uuid(), 'PROJECT_ID_3', 'USER_ID_9', 1800.00, 'payment_proof_11.jpg', 'pending', '环保项目很有意义', '2024-06-20 16:20:00+00'),

-- 会员活动中心的投资记录
(gen_random_uuid(), 'PROJECT_ID_4', 'USER_ID_3', 10000.00, 'payment_proof_12.jpg', 'confirmed', '大额投资活动中心', '2024-09-05 11:45:00+00'),
(gen_random_uuid(), 'PROJECT_ID_4', 'USER_ID_10', 5000.00, 'payment_proof_13.jpg', 'confirmed', '支持会员服务升级', '2024-09-12 14:15:00+00'),
(gen_random_uuid(), 'PROJECT_ID_4', 'USER_ID_11', 3000.00, 'payment_proof_14.jpg', 'confirmed', '期待新的活动中心', '2024-09-18 10:30:00+00'),

-- 技术升级项目的投资记录
(gen_random_uuid(), 'PROJECT_ID_5', 'USER_ID_4', 2000.00, 'payment_proof_15.jpg', 'confirmed', '支持智能化升级', '2024-11-05 15:20:00+00'),
(gen_random_uuid(), 'PROJECT_ID_5', 'USER_ID_12', 1500.00, 'payment_proof_16.jpg', 'confirmed', '科技改变高尔夫', '2024-11-10 12:45:00+00'),
(gen_random_uuid(), 'PROJECT_ID_5', 'USER_ID_13', 1000.00, 'payment_proof_17.jpg', 'pending', '等待确认中', '2024-11-15 09:15:00+00');

-- 4. 更新项目的当前筹集金额
-- 球场扩建项目: 19500 (5000+3000+2000+1500+8000)
-- 设备升级项目: 4500 (2000+1500+1000)  
-- 环保绿化项目: 7300 (3000+2500+1800)
-- 会员活动中心: 18000 (10000+5000+3000)
-- 技术升级项目: 4500 (2000+1500+1000)

UPDATE investment_projects SET current_amount = 19500.00 WHERE title = '球场扩建项目';
UPDATE investment_projects SET current_amount = 4500.00 WHERE title = '高尔夫设备升级';
UPDATE investment_projects SET current_amount = 7300.00 WHERE title = '环保绿化改造';
UPDATE investment_projects SET current_amount = 18000.00 WHERE title = '会员活动中心建设';
UPDATE investment_projects SET current_amount = 4500.00 WHERE title = '智能管理系统';






