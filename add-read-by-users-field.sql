-- 为 information_items 表添加 read_by_users 数组字段
-- 用于存储已读用户的ID列表，避免创建新表

-- 添加 read_by_users 字段（UUID数组类型）
ALTER TABLE information_items 
ADD COLUMN IF NOT EXISTS read_by_users uuid[] DEFAULT '{}'::uuid[];

-- 添加注释
COMMENT ON COLUMN information_items.read_by_users IS '已读用户ID列表，UUID数组格式';

-- 创建 GIN 索引以优化数组查询性能（可选，但推荐）
CREATE INDEX IF NOT EXISTS idx_information_items_read_by_users 
ON information_items USING GIN (read_by_users);

