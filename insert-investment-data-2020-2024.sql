-- 插入2020-2024年投资管理模拟数据
-- 每年2-5个投资项目，包含投资记录

-- 2020年投资项目 (3个)
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
-- 2020年项目1
(
    gen_random_uuid(),
    '2020年球场基础设施升级',
    '升级球场的基础设施，包括排水系统、照明设备和安全设施，提升球场的整体品质和安全性。',
    35000.00,
    0.00,
    'both',
    null,
    null,
    '2020-03-01',
    '2020-12-31',
    '2020-02-15 10:00:00+00',
    '2020-02-15 10:00:00+00'
),

-- 2020年项目2
(
    gen_random_uuid(),
    '2020年会员服务数字化',
    '引入数字化会员管理系统，包括在线预订、会员卡升级和移动端服务，提升会员体验。',
    20000.00,
    0.00,
    'both',
    null,
    'digital@golfclub.com',
    '2020-06-01',
    '2020-11-30',
    '2020-05-20 14:30:00+00',
    '2020-05-20 14:30:00+00'
),

-- 2020年项目3
(
    gen_random_uuid(),
    '2020年练习场改造',
    '改造练习场设施，增加遮阳棚、自动发球机和专业教练区域，为会员提供更好的练习环境。',
    28000.00,
    0.00,
    'both',
    null,
    null,
    '2020-09-01',
    '2021-02-28',
    '2020-08-10 16:45:00+00',
    '2020-08-10 16:45:00+00'
),

-- 2021年投资项目 (4个)
(
    gen_random_uuid(),
    '2021年球车车队更新',
    '更新整个球车车队，引入电动球车和GPS导航系统，提供更环保和便捷的球场交通服务。',
    45000.00,
    0.00,
    'both',
    null,
    'fleet@golfclub.com',
    '2021-01-15',
    '2021-08-31',
    '2021-01-01 09:00:00+00',
    '2021-01-01 09:00:00+00'
),

(
    gen_random_uuid(),
    '2021年餐厅升级改造',
    '升级俱乐部餐厅，包括厨房设备更新、用餐区域重新设计和菜单优化，提升餐饮服务质量。',
    32000.00,
    0.00,
    'both',
    null,
    null,
    '2021-04-01',
    '2021-10-31',
    '2021-03-15 11:20:00+00',
    '2021-03-15 11:20:00+00'
),

(
    gen_random_uuid(),
    '2021年更衣室现代化',
    '现代化更衣室设施，包括储物柜升级、淋浴间改造和休息区域扩建，提供更舒适的会员服务。',
    25000.00,
    0.00,
    'both',
    null,
    null,
    '2021-07-01',
    '2021-12-31',
    '2021-06-20 15:30:00+00',
    '2021-06-20 15:30:00+00'
),

(
    gen_random_uuid(),
    '2021年环保节能项目',
    '实施环保节能措施，包括LED照明系统、太阳能热水器和雨水收集系统，打造绿色环保球场。',
    18000.00,
    0.00,
    'both',
    null,
    'green2021@golfclub.com',
    '2021-10-01',
    '2022-03-31',
    '2021-09-15 13:45:00+00',
    '2021-09-15 13:45:00+00'
),

-- 2022年投资项目 (5个)
(
    gen_random_uuid(),
    '2022年智能球场管理系统',
    '引入智能球场管理系统，包括自动灌溉、气象监测、会员APP和在线预订系统，提升管理效率。',
    55000.00,
    0.00,
    'both',
    null,
    null,
    '2022-02-01',
    '2022-09-30',
    '2022-01-15 10:15:00+00',
    '2022-01-15 10:15:00+00'
),

(
    gen_random_uuid(),
    '2022年青少年高尔夫培训中心',
    '建设专门的青少年高尔夫培训中心，包括室内练习区、教练办公室和青少年活动室。',
    40000.00,
    0.00,
    'both',
    null,
    'youth@golfclub.com',
    '2022-05-01',
    '2022-12-31',
    '2022-04-10 14:20:00+00',
    '2022-04-10 14:20:00+00'
),

(
    gen_random_uuid(),
    '2022年球场景观美化',
    '美化球场景观，包括花卉种植、雕塑艺术和景观照明，提升球场的视觉美感。',
    22000.00,
    0.00,
    'both',
    null,
    null,
    '2022-08-01',
    '2023-02-28',
    '2022-07-20 16:30:00+00',
    '2022-07-20 16:30:00+00'
),

(
    gen_random_uuid(),
    '2022年会员健康中心',
    '建设会员健康中心，包括健身房、按摩室和健康咨询室，为会员提供全方位的健康服务。',
    38000.00,
    0.00,
    'both',
    null,
    null,
    '2022-11-01',
    '2023-06-30',
    '2022-10-15 12:45:00+00',
    '2022-10-15 12:45:00+00'
),

(
    gen_random_uuid(),
    '2022年安全监控系统',
    '安装全方位安全监控系统，包括摄像头、报警系统和紧急呼叫设备，保障会员安全。',
    15000.00,
    0.00,
    'both',
    null,
    'security@golfclub.com',
    '2022-12-01',
    '2023-04-30',
    '2022-11-20 09:30:00+00',
    '2022-11-20 09:30:00+00'
),

-- 2023年投资项目 (4个)
(
    gen_random_uuid(),
    '2023年高级会员专属区域',
    '建设高级会员专属区域，包括私人休息室、专属餐厅和VIP服务区，提升高端会员体验。',
    60000.00,
    0.00,
    'both',
    null,
    null,
    '2023-01-15',
    '2023-08-31',
    '2023-01-01 11:00:00+00',
    '2023-01-01 11:00:00+00'
),

(
    gen_random_uuid(),
    '2023年专业教练团队建设',
    '招聘和培训专业教练团队，包括青少年教练、成人教练和特殊需求教练，提升教学质量。',
    30000.00,
    0.00,
    'both',
    null,
    'coaching@golfclub.com',
    '2023-03-01',
    '2023-10-31',
    '2023-02-15 13:20:00+00',
    '2023-02-15 13:20:00+00'
),

(
    gen_random_uuid(),
    '2023年球场维护设备升级',
    '升级球场维护设备，包括割草机、洒水车和专业工具，提升球场维护质量。',
    25000.00,
    0.00,
    'both',
    null,
    null,
    '2023-06-01',
    '2023-12-31',
    '2023-05-20 15:45:00+00',
    '2023-05-20 15:45:00+00'
),

(
    gen_random_uuid(),
    '2023年会员活动中心扩建',
    '扩建会员活动中心，增加多功能厅、会议室和娱乐设施，为会员提供更多活动选择。',
    42000.00,
    0.00,
    'both',
    null,
    null,
    '2023-09-01',
    '2024-04-30',
    '2023-08-15 10:30:00+00',
    '2023-08-15 10:30:00+00'
),

-- 2024年投资项目 (5个)
(
    gen_random_uuid(),
    '2024年AI智能球场管理',
    '引入AI智能球场管理系统，包括智能排班、预测性维护和个性化会员服务，实现球场数字化管理。',
    70000.00,
    0.00,
    'both',
    null,
    'ai@golfclub.com',
    '2024-01-01',
    '2024-12-31',
    '2023-12-15 14:00:00+00',
    '2023-12-15 14:00:00+00'
),

(
    gen_random_uuid(),
    '2024年可持续发展项目',
    '实施可持续发展项目，包括碳中和计划、废物回收系统和生态保护措施，打造环保球场。',
    35000.00,
    0.00,
    'both',
    null,
    null,
    '2024-02-01',
    '2024-10-31',
    '2024-01-20 16:15:00+00',
    '2024-01-20 16:15:00+00'
),

(
    gen_random_uuid(),
    '2024年会员福利升级',
    '升级会员福利体系，包括免费课程、专属活动和优惠服务，提升会员满意度和忠诚度。',
    28000.00,
    0.00,
    'both',
    null,
    'benefits@golfclub.com',
    '2024-04-01',
    '2024-11-30',
    '2024-03-15 12:30:00+00',
    '2024-03-15 12:30:00+00'
),

(
    gen_random_uuid(),
    '2024年球场扩建二期',
    '球场扩建二期工程，包括新增球洞、练习区域和配套设施，扩大球场容量和服务范围。',
    80000.00,
    0.00,
    'both',
    null,
    null,
    '2024-06-01',
    '2025-03-31',
    '2024-05-20 15:00:00+00',
    '2024-05-20 15:00:00+00'
),

(
    gen_random_uuid(),
    '2024年技术创新实验室',
    '建设技术创新实验室，用于测试新技术、开发新服务和培训员工，保持技术领先优势。',
    32000.00,
    0.00,
    'both',
    null,
    'innovation@golfclub.com',
    '2024-09-01',
    '2025-02-28',
    '2024-08-15 11:45:00+00',
    '2024-08-15 11:45:00+00'
);

-- 插入投资记录（使用动态查询）
WITH project_data AS (
  SELECT 
    p.id,
    p.title,
    p.target_amount,
    p.start_date,
    p.created_at
  FROM investment_projects p
  WHERE p.created_at >= '2020-01-01'
),
user_data AS (
  SELECT id FROM user_profiles ORDER BY created_at LIMIT 20
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
    pd.id,
    ud.id,
    CASE 
        -- 根据项目年份和类型设置不同的投资金额范围
        WHEN pd.title LIKE '2020%' THEN (ARRAY[1000, 1500, 2000, 2500, 3000, 4000, 5000])[floor(random() * 7) + 1]
        WHEN pd.title LIKE '2021%' THEN (ARRAY[1200, 1800, 2200, 2800, 3500, 4500, 6000])[floor(random() * 7) + 1]
        WHEN pd.title LIKE '2022%' THEN (ARRAY[1500, 2000, 2500, 3000, 4000, 5000, 7000])[floor(random() * 7) + 1]
        WHEN pd.title LIKE '2023%' THEN (ARRAY[1800, 2200, 2800, 3500, 4500, 6000, 8000])[floor(random() * 7) + 1]
        WHEN pd.title LIKE '2024%' THEN (ARRAY[2000, 2500, 3000, 4000, 5000, 7000, 10000])[floor(random() * 7) + 1]
        ELSE (ARRAY[1000, 2000, 3000, 4000, 5000])[floor(random() * 5) + 1]
    END,
    'payment_proof_' || floor(random() * 10000) || '.jpg',
    CASE 
        WHEN random() < 0.75 THEN 'confirmed'
        WHEN random() < 0.9 THEN 'pending'
        ELSE 'cancelled'
    END,
    CASE 
        WHEN pd.title LIKE '%基础设施%' THEN '支持基础设施升级'
        WHEN pd.title LIKE '%数字化%' THEN '支持数字化发展'
        WHEN pd.title LIKE '%练习场%' THEN '期待更好的练习环境'
        WHEN pd.title LIKE '%球车%' THEN '支持环保球车'
        WHEN pd.title LIKE '%餐厅%' THEN '希望有更好的餐饮服务'
        WHEN pd.title LIKE '%更衣室%' THEN '支持设施现代化'
        WHEN pd.title LIKE '%环保%' THEN '支持环保理念'
        WHEN pd.title LIKE '%智能%' THEN '支持智能化升级'
        WHEN pd.title LIKE '%青少年%' THEN '支持青少年高尔夫发展'
        WHEN pd.title LIKE '%景观%' THEN '希望球场更美观'
        WHEN pd.title LIKE '%健康%' THEN '支持健康服务'
        WHEN pd.title LIKE '%安全%' THEN '支持安全设施'
        WHEN pd.title LIKE '%会员%' THEN '支持会员服务升级'
        WHEN pd.title LIKE '%教练%' THEN '支持专业教练团队'
        WHEN pd.title LIKE '%维护%' THEN '支持球场维护'
        WHEN pd.title LIKE '%AI%' THEN '支持AI技术应用'
        WHEN pd.title LIKE '%可持续发展%' THEN '支持环保可持续发展'
        WHEN pd.title LIKE '%福利%' THEN '支持会员福利'
        WHEN pd.title LIKE '%扩建%' THEN '支持球场扩建'
        WHEN pd.title LIKE '%创新%' THEN '支持技术创新'
        ELSE '支持俱乐部发展'
    END,
    pd.created_at + (random() * interval '6 months')
FROM project_data pd
CROSS JOIN user_data ud
WHERE random() < 0.4; -- 40%的概率生成投资记录

-- 更新项目的当前筹集金额
UPDATE investment_projects 
SET current_amount = (
    SELECT COALESCE(SUM(amount), 0)
    FROM investments 
    WHERE project_id = investment_projects.id 
    AND status = 'confirmed'
);

-- 显示统计结果
SELECT 
    EXTRACT(YEAR FROM p.created_at) as "年份",
    COUNT(*) as "项目数量",
    SUM(p.target_amount) as "总目标金额",
    SUM(p.current_amount) as "总筹集金额",
    ROUND(AVG(p.current_amount / p.target_amount * 100), 1) as "平均完成率"
FROM investment_projects p
WHERE p.created_at >= '2020-01-01'
GROUP BY EXTRACT(YEAR FROM p.created_at)
ORDER BY "年份";

-- 显示详细项目信息
SELECT 
    p.title as "项目名称",
    p.target_amount as "目标金额",
    p.current_amount as "已筹集金额",
    ROUND((p.current_amount / p.target_amount * 100), 1) as "完成百分比",
    COUNT(i.id) as "投资记录数",
    EXTRACT(YEAR FROM p.created_at) as "年份"
FROM investment_projects p
LEFT JOIN investments i ON p.id = i.project_id
WHERE p.created_at >= '2020-01-01'
GROUP BY p.id, p.title, p.target_amount, p.current_amount, p.created_at
ORDER BY p.created_at DESC;
