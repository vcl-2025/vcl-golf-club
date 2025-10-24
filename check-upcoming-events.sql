-- 查询状态为upcoming的活动
SELECT 
  id,
  title,
  status,
  start_date,
  end_date,
  created_at
FROM events
WHERE status = 'upcoming'
ORDER BY start_date ASC;






