-- 更新费用分类系统，使用新的4个大类分类
-- 收入分类：会费及赞助类、代收类、投资及理财类、其他杂项
-- 支出分类：赛事与活动支出、代付类、理财存款、其他杂费
-- 注意：不再添加数据库约束，由前端下拉菜单控制分类选择

-- 删除旧的 expense_type 约束（如果存在）
ALTER TABLE public.expenses
DROP CONSTRAINT IF EXISTS expenses_expense_type_check;

COMMENT ON COLUMN public.expenses.expense_type IS '费用类型：新版本使用4个大类，由前端UI控制选择';

