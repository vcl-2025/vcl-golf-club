-- 查看investment_projects表的payment_method字段约束
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'investment_projects'::regclass 
AND conname LIKE '%payment_method%';

-- 或者查看表结构
\d investment_projects;






