-- 检查events表的数据结构和内容

-- 1. 查看events表的结构
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;

-- 2. 查看events表中的所有数据
SELECT 
  id,
  title,
  status,
  start_date,
  end_date,
  created_at,
  updated_at
FROM events
ORDER BY created_at DESC
LIMIT 10;

-- 3. 查看不同状态的活动数量
SELECT 
  status,
  COUNT(*) as count
FROM events
GROUP BY status
ORDER BY count DESC;

-- 4. 查看未来日期的活动
SELECT 
  id,
  title,
  status,
  start_date,
  end_date
FROM events
WHERE start_date >= CURRENT_DATE
ORDER BY start_date ASC
LIMIT 5;

-- 5. 查看今天的活动
SELECT 
  id,
  title,
  status,
  start_date,
  end_date
FROM events
WHERE start_date = CURRENT_DATE
ORDER BY start_date ASC;

-- 6. 查看最近创建的活动
SELECT 
  id,
  title,
  status,
  start_date,
  end_date,
  created_at
FROM events
ORDER BY created_at DESC
LIMIT 5;






