-- 插入2020-2024年费用管理模拟数据
-- 每年3-8个费用记录，涵盖不同类型的支出

-- 2020年费用记录 (5个)
INSERT INTO expenses (
    id,
    expense_type,
    title,
    amount,
    expense_date,
    payment_method,
    receipt_url,
    notes,
    status,
    created_at
) VALUES 
-- 2020年费用
(gen_random_uuid(), 'equipment', '2020年高尔夫球车采购', 45000.00, '2020-03-15', 'transfer', null, '采购5辆新球车，提升会员服务', 'paid', '2020-03-10 10:00:00+00'),
(gen_random_uuid(), 'maintenance', '2020年球场维护费用', 12000.00, '2020-06-20', 'cash', null, '夏季球场维护，包括草坪修剪和灌溉系统', 'paid', '2020-06-15 14:30:00+00'),
(gen_random_uuid(), 'activity', '2020年会员聚餐费用', 3500.00, '2020-09-10', 'transfer', null, '年度会员聚餐，包含餐饮和场地费用', 'paid', '2020-09-05 16:20:00+00'),
(gen_random_uuid(), 'salary', '2020年员工工资', 18000.00, '2020-12-31', 'transfer', null, '2020年第四季度员工工资', 'paid', '2020-12-28 09:15:00+00'),
(gen_random_uuid(), 'other', '2020年保险费用', 2800.00, '2020-11-15', 'check', null, '俱乐部财产保险和员工保险', 'paid', '2020-11-10 11:45:00+00'),

-- 2021年费用记录 (6个)
(gen_random_uuid(), 'equipment', '2021年练习场设备升级', 25000.00, '2021-02-28', 'transfer', null, '练习场发球机和遮阳棚安装', 'paid', '2021-02-20 13:20:00+00'),
(gen_random_uuid(), 'maintenance', '2021年更衣室装修', 15000.00, '2021-05-15', 'transfer', null, '更衣室设施升级和装修', 'paid', '2021-05-10 15:30:00+00'),
(gen_random_uuid(), 'activity', '2021年青少年训练营', 8000.00, '2021-07-20', 'cash', null, '夏季青少年高尔夫训练营费用', 'paid', '2021-07-15 10:15:00+00'),
(gen_random_uuid(), 'salary', '2021年教练工资', 22000.00, '2021-10-31', 'transfer', null, '专业教练团队工资', 'paid', '2021-10-25 14:45:00+00'),
(gen_random_uuid(), 'equipment', '2021年餐厅设备采购', 12000.00, '2021-08-10', 'transfer', null, '餐厅厨房设备更新', 'paid', '2021-08-05 16:00:00+00'),
(gen_random_uuid(), 'other', '2021年水电费', 4500.00, '2021-12-15', 'transfer', null, '2021年12月水电费', 'paid', '2021-12-10 12:30:00+00'),

-- 2022年费用记录 (7个)
(gen_random_uuid(), 'equipment', '2022年智能管理系统', 35000.00, '2022-01-20', 'transfer', null, '球场智能管理系统安装', 'paid', '2022-01-15 09:30:00+00'),
(gen_random_uuid(), 'maintenance', '2022年球场景观美化', 18000.00, '2022-04-25', 'transfer', null, '球场景观设计和花卉种植', 'paid', '2022-04-20 11:15:00+00'),
(gen_random_uuid(), 'activity', '2022年会员活动费用', 12000.00, '2022-06-30', 'cash', null, '上半年会员活动费用', 'paid', '2022-06-25 14:20:00+00'),
(gen_random_uuid(), 'salary', '2022年员工培训费用', 8500.00, '2022-09-15', 'transfer', null, '员工专业技能培训', 'paid', '2022-09-10 16:45:00+00'),
(gen_random_uuid(), 'equipment', '2022年安全监控系统', 22000.00, '2022-11-30', 'transfer', null, '球场安全监控设备安装', 'paid', '2022-11-25 10:30:00+00'),
(gen_random_uuid(), 'maintenance', '2022年冬季维护', 9500.00, '2022-12-20', 'cash', null, '冬季球场维护和防冻措施', 'paid', '2022-12-15 13:15:00+00'),
(gen_random_uuid(), 'other', '2022年法律咨询费', 3200.00, '2022-08-05', 'check', null, '俱乐部法律事务咨询', 'paid', '2022-08-01 15:45:00+00'),

-- 2023年费用记录 (8个)
(gen_random_uuid(), 'equipment', '2023年高级会员区域装修', 45000.00, '2023-02-15', 'transfer', null, '高级会员专属区域装修', 'paid', '2023-02-10 12:20:00+00'),
(gen_random_uuid(), 'maintenance', '2023年球场排水系统', 28000.00, '2023-05-20', 'transfer', null, '球场排水系统升级改造', 'paid', '2023-05-15 14:30:00+00'),
(gen_random_uuid(), 'activity', '2023年慈善活动费用', 15000.00, '2023-08-25', 'cash', null, '年度慈善高尔夫活动费用', 'paid', '2023-08-20 16:15:00+00'),
(gen_random_uuid(), 'salary', '2023年专业教练招聘', 35000.00, '2023-10-31', 'transfer', null, '招聘专业教练团队', 'paid', '2023-10-25 11:45:00+00'),
(gen_random_uuid(), 'equipment', '2023年维护设备升级', 18000.00, '2023-07-10', 'transfer', null, '球场维护设备更新', 'paid', '2023-07-05 13:20:00+00'),
(gen_random_uuid(), 'maintenance', '2023年会员活动中心扩建', 32000.00, '2023-12-15', 'transfer', null, '会员活动中心扩建工程', 'paid', '2023-12-10 15:30:00+00'),
(gen_random_uuid(), 'other', '2023年营销推广费用', 8500.00, '2023-09-30', 'transfer', null, '俱乐部品牌推广和营销', 'paid', '2023-09-25 10:15:00+00'),
(gen_random_uuid(), 'activity', '2023年会员福利活动', 12000.00, '2023-11-20', 'cash', null, '会员福利和奖励活动', 'paid', '2023-11-15 14:45:00+00'),

-- 2024年费用记录 (8个)
(gen_random_uuid(), 'equipment', '2024年AI智能系统', 55000.00, '2024-01-15', 'transfer', null, 'AI智能球场管理系统', 'paid', '2024-01-10 09:30:00+00'),
(gen_random_uuid(), 'maintenance', '2024年可持续发展项目', 25000.00, '2024-03-20', 'transfer', null, '环保节能设施安装', 'paid', '2024-03-15 11:20:00+00'),
(gen_random_uuid(), 'activity', '2024年会员福利升级', 18000.00, '2024-06-30', 'cash', null, '会员福利体系升级', 'paid', '2024-06-25 13:15:00+00'),
(gen_random_uuid(), 'salary', '2024年技术团队工资', 42000.00, '2024-09-30', 'transfer', null, '技术团队工资和奖金', 'paid', '2024-09-25 15:45:00+00'),
(gen_random_uuid(), 'equipment', '2024年球场扩建设备', 65000.00, '2024-07-20', 'transfer', null, '球场扩建二期设备采购', 'paid', '2024-07-15 12:30:00+00'),
(gen_random_uuid(), 'maintenance', '2024年创新实验室建设', 28000.00, '2024-10-15', 'transfer', null, '技术创新实验室建设', 'paid', '2024-10-10 14:20:00+00'),
(gen_random_uuid(), 'other', '2024年专业咨询费', 12000.00, '2024-05-25', 'check', null, '球场设计和管理咨询', 'paid', '2024-05-20 16:15:00+00'),
(gen_random_uuid(), 'activity', '2024年国际交流活动', 22000.00, '2024-12-10', 'transfer', null, '国际高尔夫交流活动', 'paid', '2024-12-05 10:30:00+00');

-- 显示统计结果
SELECT 
    EXTRACT(YEAR FROM expense_date) as "年份",
    COUNT(*) as "费用记录数",
    SUM(amount) as "总支出金额",
    ROUND(AVG(amount), 2) as "平均费用",
    COUNT(CASE WHEN expense_type = 'equipment' THEN 1 END) as "设备采购",
    COUNT(CASE WHEN expense_type = 'maintenance' THEN 1 END) as "场地维护",
    COUNT(CASE WHEN expense_type = 'activity' THEN 1 END) as "活动支出",
    COUNT(CASE WHEN expense_type = 'salary' THEN 1 END) as "人员工资",
    COUNT(CASE WHEN expense_type = 'other' THEN 1 END) as "其他费用"
FROM expenses
WHERE expense_date >= '2020-01-01'
GROUP BY EXTRACT(YEAR FROM expense_date)
ORDER BY "年份";

-- 显示详细费用信息
SELECT 
    title as "费用项目",
    amount as "金额",
    expense_date as "费用日期",
    expense_type as "费用类型",
    payment_method as "支付方式",
    status as "状态",
    EXTRACT(YEAR FROM expense_date) as "年份"
FROM expenses
WHERE expense_date >= '2020-01-01'
ORDER BY expense_date DESC;



