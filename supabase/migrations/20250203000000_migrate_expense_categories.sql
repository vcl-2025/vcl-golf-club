-- 迁移费用分类到新分类系统
-- 收入大类：会员收入、赞助与支持、活动相关收入、投资收益、其他收入
-- 支出大类：活动支出、投资与储蓄、运营支出、其它支出
-- 注意：expense_type 存储大类，title 字段存储具体项目名称

-- 收入大类映射（根据 title 内容智能判断）
UPDATE public.expenses
SET expense_type = CASE
  WHEN transaction_type = 'income' THEN
    CASE
      -- 已经是新大类，保持不变
      WHEN expense_type IN ('membership_income', 'sponsorship_support', 'activity_related_income', 
                            'investment_income', 'other_income') THEN expense_type
      
      -- 根据 title 内容判断大类
      WHEN title ILIKE '%会费%' THEN 'membership_income'
      WHEN title ILIKE '%赞助%' THEN 'sponsorship_support'
      WHEN title ILIKE '%比赛球%' OR title ILIKE '%球费%' OR 
           title ILIKE '%差点费%' OR title ILIKE '%餐费%' OR
           title ILIKE '%代收%' THEN 'activity_related_income'
      WHEN title ILIKE '%利息%' OR title ILIKE '%GIC%' OR 
           title ILIKE '%赎回%' OR title ILIKE '%投资%' OR
           title ILIKE '%理财%' THEN 'investment_income'
      
      -- 旧大类映射
      WHEN expense_type = 'membership_sponsorship' THEN 
        CASE 
          WHEN title ILIKE '%会费%' THEN 'membership_income'
          WHEN title ILIKE '%赞助%' THEN 'sponsorship_support'
          ELSE 'membership_income'  -- 默认会员收入
        END
      WHEN expense_type = 'collection' THEN 'activity_related_income'
      WHEN expense_type = 'investment_finance' THEN 'investment_income'
      WHEN expense_type = 'other_income' THEN 'other_income'
      
      -- 旧具体分类映射
      WHEN expense_type = 'membership_fee' THEN 'membership_income'
      WHEN expense_type = 'sponsorship_fee' THEN 'sponsorship_support'
      WHEN expense_type IN ('collected_competition_ball_fee', 'collected_handicap_fee', 'collected_meal_fee') 
        THEN 'activity_related_income'
      WHEN expense_type IN ('interest_income', 'gic_redemption') 
        THEN 'investment_income'
      WHEN expense_type = 'other' THEN 'other_income'
      
      -- 默认：其他收入
      ELSE 'other_income'
    END
  
  -- 支出大类映射（根据 title 内容智能判断）
  WHEN transaction_type = 'expense' OR transaction_type IS NULL THEN
    CASE
      -- 已经是新大类，保持不变
      WHEN expense_type IN ('activity_expense', 'investment_savings', 'operating_expense', 'other_expense') 
        THEN expense_type
      
      -- 根据 title 内容判断大类
      WHEN title ILIKE '%比赛%' OR title ILIKE '%活动%' OR 
           title ILIKE '%奖品%' OR title ILIKE '%餐费%' OR
           title ILIKE '%酒水%' OR title ILIKE '%摄影%' OR
           title ILIKE '%代付%' OR title ILIKE '%退费%' OR
           title ILIKE '%退款%' THEN 'activity_expense'
      WHEN title ILIKE '%GIC%' OR title ILIKE '%存%' OR
           title ILIKE '%投资%' OR title ILIKE '%储蓄%' THEN 'investment_savings'
      WHEN title ILIKE '%银行%' OR title ILIKE '%手续费%' OR
           title ILIKE '%运营%' THEN 'operating_expense'
      
      -- 旧大类映射
      WHEN expense_type = 'event_activity' THEN 'activity_expense'
      WHEN expense_type = 'payment_on_behalf' THEN 'activity_expense'
      WHEN expense_type = 'finance_deposit' THEN 'investment_savings'
      WHEN expense_type = 'other_misc' THEN 'other_expense'
      
      -- 旧具体分类映射
      WHEN expense_type IN ('competition_prizes_misc', 'event_meal_beverage', 
                            'paid_competition_fee', 'paid_handicap_fee', 
                            'photographer_fee', 'refund') THEN 'activity_expense'
      WHEN expense_type = 'gic_deposit' THEN 'investment_savings'
      WHEN expense_type = 'bank_fee' THEN 'operating_expense'
      WHEN expense_type = 'other' THEN 'other_expense'
      
      -- 最旧分类映射
      WHEN expense_type = 'equipment' THEN 'other_expense'
      WHEN expense_type = 'maintenance' THEN 'other_expense'
      WHEN expense_type = 'activity' THEN 'activity_expense'
      WHEN expense_type = 'salary' THEN 'other_expense'
      
      -- 默认：其它支出
      ELSE 'other_expense'
    END
  
  ELSE expense_type  -- 其他情况保持不变
END
WHERE expense_type IS NOT NULL;

-- 验证迁移结果
SELECT 
  transaction_type,
  expense_type,
  COUNT(*) as count,
  SUBSTRING(
    STRING_AGG(DISTINCT title, ', ' ORDER BY title), 
    1, 
    200
  ) as sample_titles
FROM public.expenses
GROUP BY transaction_type, expense_type
ORDER BY transaction_type, expense_type;

-- 显示迁移统计
SELECT 
  '迁移完成' as status,
  COUNT(*) FILTER (WHERE transaction_type = 'income') as income_count,
  COUNT(*) FILTER (WHERE transaction_type = 'expense' OR transaction_type IS NULL) as expense_count,
  COUNT(*) as total_count
FROM public.expenses;
