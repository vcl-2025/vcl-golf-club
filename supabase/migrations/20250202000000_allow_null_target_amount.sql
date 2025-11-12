-- 修改 investment_projects 表的 target_amount 字段，允许为 NULL
-- 因为捐赠项目可以不设目标金额

-- 1. 先删除现有的约束（要求 target_amount > 0）
ALTER TABLE investment_projects 
  DROP CONSTRAINT IF EXISTS investment_projects_target_amount_check;

-- 2. 修改字段，允许 NULL
ALTER TABLE investment_projects 
  ALTER COLUMN target_amount DROP NOT NULL;

-- 3. 重新创建约束，允许 NULL 或大于 0 的值
ALTER TABLE investment_projects 
  ADD CONSTRAINT investment_projects_target_amount_check 
  CHECK (target_amount IS NULL OR target_amount > 0);

-- 添加注释说明
COMMENT ON COLUMN investment_projects.target_amount IS '目标金额（CAD），捐赠项目可以不设目标，允许为 NULL';

