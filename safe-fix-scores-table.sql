-- 安全的 Scores 表修复脚本
-- 会先检查现有状态，避免重复操作

-- 1. 检查 event_id 字段是否已存在
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scores' 
      AND column_name = 'event_id'
      AND table_schema = 'public'
  ) THEN
    -- 添加 event_id 字段
    ALTER TABLE scores ADD COLUMN event_id UUID;
    RAISE NOTICE '已添加 event_id 字段';
  ELSE
    RAISE NOTICE 'event_id 字段已存在';
  END IF;
END $$;

-- 2. 检查并填充 event_id 数据
DO $$
DECLARE
  unmatched_count INTEGER;
BEGIN
  -- 统计未匹配的记录数
  SELECT COUNT(*) INTO unmatched_count
  FROM scores 
  WHERE event_id IS NULL;
  
  IF unmatched_count > 0 THEN
    -- 根据 competition_name 填充 event_id
    UPDATE scores s 
    SET event_id = e.id 
    FROM events e 
    WHERE s.competition_name = e.title 
      AND s.event_id IS NULL;
    
    RAISE NOTICE '已更新 % 条记录的 event_id', unmatched_count;
  ELSE
    RAISE NOTICE '所有记录的 event_id 都已填充';
  END IF;
END $$;

-- 3. 检查外键约束是否存在
DO $$
BEGIN
  -- 检查 event_id 外键
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'scores' 
      AND constraint_name = 'fk_scores_event_id'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE scores 
    ADD CONSTRAINT fk_scores_event_id 
    FOREIGN KEY (event_id) REFERENCES events(id);
    RAISE NOTICE '已添加 event_id 外键约束';
  ELSE
    RAISE NOTICE 'event_id 外键约束已存在';
  END IF;
  
  -- 检查 user_id 外键
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'scores' 
      AND constraint_name = 'fk_scores_user_id'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE scores 
    ADD CONSTRAINT fk_scores_user_id 
    FOREIGN KEY (user_id) REFERENCES user_profiles(id);
    RAISE NOTICE '已添加 user_id 外键约束';
  ELSE
    RAISE NOTICE 'user_id 外键约束已存在';
  END IF;
END $$;

-- 4. 设置字段为 NOT NULL（如果还没有设置）
DO $$
BEGIN
  -- 检查 event_id 是否可为空
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scores' 
      AND column_name = 'event_id'
      AND is_nullable = 'YES'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE scores ALTER COLUMN event_id SET NOT NULL;
    RAISE NOTICE '已设置 event_id 为 NOT NULL';
  ELSE
    RAISE NOTICE 'event_id 已设置为 NOT NULL';
  END IF;
  
  -- 检查 user_id 是否可为空
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scores' 
      AND column_name = 'user_id'
      AND is_nullable = 'YES'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE scores ALTER COLUMN user_id SET NOT NULL;
    RAISE NOTICE '已设置 user_id 为 NOT NULL';
  ELSE
    RAISE NOTICE 'user_id 已设置为 NOT NULL';
  END IF;
END $$;

-- 5. 添加索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_scores_event_id ON scores(event_id);
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_competition_date ON scores(competition_date);

-- 6. 显示最终状态
SELECT 
  '修复完成' as status,
  COUNT(*) as total_scores,
  COUNT(event_id) as scores_with_event_id,
  COUNT(*) - COUNT(event_id) as scores_without_event_id
FROM scores;






