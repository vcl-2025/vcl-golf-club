-- 随机分配现有费用的费用类型（基于新的4个大类分类）
-- 根据 transaction_type 随机分配对应的 expense_type

-- 更新收入类型的费用分类（4个大类）
UPDATE public.expenses
SET expense_type = (
  -- 使用数组随机选择
  (ARRAY[
    'membership_sponsorship',  -- 会费及赞助类
    'collection',              -- 代收类
    'investment_finance',      -- 投资及理财类
    'other_income'             -- 其他杂项
  ])[1 + floor(random() * 4)::int]
)
WHERE transaction_type = 'income'
  AND (expense_type IS NULL 
    OR expense_type IN ('equipment', 'maintenance', 'activity', 'salary', 'other')
    OR expense_type LIKE 'membership_fee'
    OR expense_type LIKE 'sponsorship_fee'
    OR expense_type LIKE 'collected_%'
    OR expense_type LIKE 'interest_income'
    OR expense_type LIKE 'gic_redemption'
    OR expense_type LIKE 'other_income');

-- 更新支出类型的费用分类（4个大类）
UPDATE public.expenses
SET expense_type = (
  -- 使用数组随机选择
  (ARRAY[
    'event_activity',         -- 赛事与活动支出
    'payment_on_behalf',      -- 代付类
    'finance_deposit',        -- 理财存款
    'other_misc'              -- 其他杂费
  ])[1 + floor(random() * 4)::int]
)
WHERE transaction_type = 'expense'
  AND (expense_type IS NULL 
    OR expense_type IN ('equipment', 'maintenance', 'activity', 'salary', 'other')
    OR expense_type LIKE 'competition_%'
    OR expense_type LIKE 'event_meal_beverage'
    OR expense_type LIKE 'photographer_fee'
    OR expense_type LIKE 'paid_%'
    OR expense_type LIKE 'gic_deposit'
    OR expense_type LIKE 'bank_fee'
    OR expense_type LIKE 'refund');

-- 验证更新结果
SELECT 
  transaction_type,
  expense_type,
  COUNT(*) as count
FROM public.expenses
GROUP BY transaction_type, expense_type
ORDER BY transaction_type, expense_type;

