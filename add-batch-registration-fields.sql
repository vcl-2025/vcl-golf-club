-- 为批量报名功能添加字段
-- 1. information_items 表添加 linked_events 和 is_registration_notice 字段
-- 2. event_registrations 表添加 notice_id 字段

-- 1. 为 information_items 表添加 linked_events 字段（UUID数组，存储关联的活动ID）
ALTER TABLE information_items 
ADD COLUMN IF NOT EXISTS linked_events uuid[] DEFAULT '{}'::uuid[];

-- 添加注释
COMMENT ON COLUMN information_items.linked_events IS '关联的活动ID列表，UUID数组格式，用于批量报名功能';

-- 2. 为 information_items 表添加 is_registration_notice 字段（布尔值，标记是否为报名通知）
ALTER TABLE information_items 
ADD COLUMN IF NOT EXISTS is_registration_notice boolean DEFAULT false;

-- 添加注释
COMMENT ON COLUMN information_items.is_registration_notice IS '是否为报名通知，true表示该通知包含活动报名功能';

-- 3. 为 event_registrations 表添加 notice_id 字段（关联到 information_items.id，记录来源通知）
ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS notice_id uuid REFERENCES information_items(id) ON DELETE SET NULL;

-- 添加注释
COMMENT ON COLUMN event_registrations.notice_id IS '来源通知ID，如果该报名记录是通过通知批量报名创建的，则记录对应的通知ID';

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_information_items_linked_events 
ON information_items USING GIN (linked_events);

CREATE INDEX IF NOT EXISTS idx_information_items_is_registration_notice 
ON information_items (is_registration_notice) 
WHERE is_registration_notice = true;

CREATE INDEX IF NOT EXISTS idx_event_registrations_notice_id 
ON event_registrations (notice_id) 
WHERE notice_id IS NOT NULL;

