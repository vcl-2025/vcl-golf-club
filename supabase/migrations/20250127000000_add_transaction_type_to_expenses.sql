-- 添加交易类型字段到expenses表（区分支出和收入）
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS transaction_type text DEFAULT 'expense' NOT NULL;

-- 添加约束：只能是 'expense'（支出）或 'income'（收入）
ALTER TABLE public.expenses
ADD CONSTRAINT expenses_transaction_type_check 
CHECK (transaction_type IN ('expense', 'income'));

COMMENT ON COLUMN public.expenses.transaction_type IS '交易类型：expense=支出，income=收入';

-- 删除旧的 expense_type 约束
ALTER TABLE public.expenses
DROP CONSTRAINT IF EXISTS expenses_expense_type_check;

-- 添加新的 expense_type 约束，包含所有收入和支出分类
ALTER TABLE public.expenses
ADD CONSTRAINT expenses_expense_type_check 
CHECK (expense_type IN (
  -- 收入分类
  'membership_fee',
  'sponsorship_fee',
  'collected_competition_ball_fee',
  'collected_handicap_fee',
  'interest_income',
  'collected_meal_fee',
  'gic_redemption',
  'other_income',
  -- 支出分类
  'competition_prizes_misc',
  'event_meal_beverage',
  'photographer_fee',
  'paid_handicap_fee',
  'gic_deposit',
  'bank_fee',
  'paid_competition_fee',
  'refund',
  -- 保留旧分类以兼容旧数据（可选，如果需要迁移数据的话）
  'equipment',
  'maintenance',
  'activity',
  'salary',
  'other'
));

