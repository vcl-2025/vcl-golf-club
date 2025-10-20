-- 第一步：安全地修复 Scores 表
-- 这个脚本会分步骤进行，确保数据安全

-- 1. 首先备份当前数据（可选，但建议执行）
CREATE TABLE scores_backup AS SELECT * FROM scores;

-- 2. 添加 event_id 字段
ALTER TABLE scores ADD COLUMN event_id UUID;

-- 3. 根据 competition_name 填充 event_id
-- 注意：这里假设 competition_name 对应 events.title
UPDATE scores s 
SET event_id = e.id 
FROM events e 
WHERE s.competition_name = e.title;

-- 4. 检查有多少记录成功匹配
SELECT 
  '匹配成功' as status,
  COUNT(*) as count
FROM scores 
WHERE event_id IS NOT NULL

UNION ALL

SELECT 
  '匹配失败' as status,
  COUNT(*) as count
FROM scores 
WHERE event_id IS NULL;

-- 5. 显示匹配失败的情况（如果有）
SELECT 
  s.competition_name,
  COUNT(*) as score_count
FROM scores s
WHERE s.event_id IS NULL
GROUP BY s.competition_name
ORDER BY score_count DESC;





