-- 为现有 expenses 记录随机分配交易类型和费用类型
-- 用于测试目的

-- 首先确保 transaction_type 字段存在
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS transaction_type text DEFAULT 'expense' NOT NULL;

-- 更新所有记录，随机分配交易类型和对应的费用类型
-- 使用 CTE 先确定交易类型，再根据交易类型选择费用类型
WITH randomized AS (
  SELECT 
    id,
    CASE 
      WHEN random() < 0.5 THEN 'expense' 
      ELSE 'income' 
    END as new_transaction_type
  FROM public.expenses
)
UPDATE public.expenses e
SET 
  transaction_type = r.new_transaction_type,
  expense_type = CASE 
    WHEN r.new_transaction_type = 'expense' THEN (
      -- 支出分类（8个选项）
      (ARRAY[
        'competition_prizes_misc',
        'event_meal_beverage',
        'photographer_fee',
        'paid_handicap_fee',
        'gic_deposit',
        'bank_fee',
        'paid_competition_fee',
        'refund'
      ])[1 + floor(random() * 8)::int]
    )
    ELSE (
      -- 收入分类（8个选项）
      (ARRAY[
        'membership_fee',
        'sponsorship_fee',
        'collected_competition_ball_fee',
        'collected_handicap_fee',
        'interest_income',
        'collected_meal_fee',
        'gic_redemption',
        'other_income'
      ])[1 + floor(random() * 8)::int]
    )
  END
FROM randomized r
WHERE e.id = r.id;

-- 验证更新结果
SELECT 
  transaction_type,
  expense_type,
  COUNT(*) as count
FROM public.expenses
GROUP BY transaction_type, expense_type
ORDER BY transaction_type, expense_type;

