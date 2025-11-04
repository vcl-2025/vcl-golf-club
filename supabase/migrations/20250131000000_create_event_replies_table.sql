-- 创建活动回顾回复表
CREATE TABLE IF NOT EXISTS event_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX idx_event_replies_event_id ON event_replies(event_id);
CREATE INDEX idx_event_replies_user_id ON event_replies(user_id);
CREATE INDEX idx_event_replies_created_at ON event_replies(created_at DESC);

-- 启用RLS
ALTER TABLE event_replies ENABLE ROW LEVEL SECURITY;

-- RLS策略：所有人都可以查看回复（会员和非会员都可以看）
CREATE POLICY "任何人都可以查看活动回顾回复"
  ON event_replies FOR SELECT
  USING (true);

-- RLS策略：只有登录的会员可以创建回复
CREATE POLICY "会员可以创建活动回顾回复"
  ON event_replies FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role IS NULL OR user_profiles.role != 'guest')
    )
  );

-- RLS策略：用户只能编辑自己的回复
CREATE POLICY "用户可以编辑自己的回复"
  ON event_replies FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS策略：用户只能删除自己的回复
CREATE POLICY "用户可以删除自己的回复"
  ON event_replies FOR DELETE
  USING (auth.uid() = user_id);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_event_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_replies_updated_at
  BEFORE UPDATE ON event_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_event_replies_updated_at();

