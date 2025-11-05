-- 添加parent_reply_id字段支持嵌套回复
ALTER TABLE event_replies 
ADD COLUMN IF NOT EXISTS parent_reply_id UUID REFERENCES event_replies(id) ON DELETE CASCADE;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_event_replies_parent_reply_id ON event_replies(parent_reply_id);

-- 更新RLS策略，允许回复别人的回复
-- （现有的INSERT策略已经允许会员创建回复，无需修改）


