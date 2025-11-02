-- 添加交易类型字段到expenses表（区分支出和收入）
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS transaction_type text DEFAULT 'expense' NOT NULL;

-- 添加约束：只能是 'expense'（支出）或 'income'（收入）
ALTER TABLE public.expenses
ADD CONSTRAINT expenses_transaction_type_check 
CHECK (transaction_type IN ('expense', 'income'));

COMMENT ON COLUMN public.expenses.transaction_type IS '交易类型：expense=支出，income=收入';

-- 删除旧的 expense_type 约束（不再限制费用类型，允许灵活选择）
ALTER TABLE public.expenses
DROP CONSTRAINT IF EXISTS expenses_expense_type_check;

