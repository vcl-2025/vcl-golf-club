-- 数据库设计改进建议
-- 基于当前表结构的问题分析

-- 1. 修复 Events 表
-- 添加 event_date 字段或统一使用 start_time
ALTER TABLE events ADD COLUMN event_date DATE;
UPDATE events SET event_date = start_time::DATE WHERE event_date IS NULL;

-- 或者重命名字段以保持一致性
-- ALTER TABLE events RENAME COLUMN start_time TO event_date;

-- 2. 改进 Status 字段为 ENUM
CREATE TYPE event_status AS ENUM ('draft', 'active', 'completed', 'cancelled');
CREATE TYPE registration_status AS ENUM ('registered', 'waitlisted', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE membership_type AS ENUM ('basic', 'premium', 'vip');
CREATE TYPE user_role AS ENUM ('member', 'admin', 'staff');

-- 3. 修复 Event_Registrations 表
-- 移除冗余字段，只保留必要的用户信息快照
ALTER TABLE event_registrations 
DROP COLUMN IF EXISTS participant_na,
DROP COLUMN IF EXISTS member_numk,
DROP COLUMN IF EXISTS phone;

-- 确保外键不为空
ALTER TABLE event_registrations 
ALTER COLUMN event_id SET NOT NULL,
ALTER COLUMN user_id SET NOT NULL;

-- 添加外键约束
ALTER TABLE event_registrations 
ADD CONSTRAINT fk_event_registrations_event_id 
FOREIGN KEY (event_id) REFERENCES events(id),
ADD CONSTRAINT fk_event_registrations_user_id 
FOREIGN KEY (user_id) REFERENCES user_profiles(id);

-- 4. 修复 Scores 表 - 这是最重要的改进
-- 添加 event_id 外键
ALTER TABLE scores ADD COLUMN event_id UUID;

-- 根据 competition_name 填充 event_id
UPDATE scores s 
SET event_id = e.id 
FROM events e 
WHERE s.competition_name = e.title;

-- 移除冗余的事件信息字段
ALTER TABLE scores 
DROP COLUMN IF EXISTS competition_name,
DROP COLUMN IF EXISTS competition_ty,
DROP COLUMN IF EXISTS course_name,
DROP COLUMN IF EXISTS competition_d,
DROP COLUMN IF EXISTS total_participa;

-- 添加外键约束
ALTER TABLE scores 
ADD CONSTRAINT fk_scores_event_id 
FOREIGN KEY (event_id) REFERENCES events(id),
ADD CONSTRAINT fk_scores_user_id 
FOREIGN KEY (user_id) REFERENCES user_profiles(id);

-- 确保关键字段不为空
ALTER TABLE scores 
ALTER COLUMN event_id SET NOT NULL,
ALTER COLUMN user_id SET NOT NULL;

-- 5. 修复 User_Profiles 表
-- 移除冗余的 real_name 字段（如果与 full_name 重复）
-- ALTER TABLE user_profiles DROP COLUMN real_name;

-- 或者明确两者的用途
-- real_name: 真实姓名（用于身份验证）
-- full_name: 显示姓名（用于界面显示）

-- 6. 添加必要的索引
CREATE INDEX idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX idx_event_registrations_user_id ON event_registrations(user_id);
CREATE INDEX idx_scores_event_id ON scores(event_id);
CREATE INDEX idx_scores_user_id ON scores(user_id);
CREATE INDEX idx_scores_competition_date ON scores(competition_date);

-- 7. 添加唯一约束防止重复注册
ALTER TABLE event_registrations 
ADD CONSTRAINT unique_user_event_registration 
UNIQUE (user_id, event_id);

-- 8. 添加检查约束
ALTER TABLE events 
ADD CONSTRAINT check_event_dates 
CHECK (end_time > start_time);

ALTER TABLE events 
ADD CONSTRAINT check_registration_deadline 
CHECK (registration_deadline > start_time);

ALTER TABLE scores 
ADD CONSTRAINT check_strokes_positive 
CHECK (total_strokes > 0 AND net_strokes > 0);

-- 9. 创建视图简化查询
CREATE VIEW event_scores_summary AS
SELECT 
  e.id as event_id,
  e.title as event_name,
  e.start_time as event_date,
  COUNT(s.id) as total_scores,
  AVG(s.total_strokes) as avg_strokes,
  MIN(s.total_strokes) as best_score
FROM events e
LEFT JOIN scores s ON e.id = s.event_id
GROUP BY e.id, e.title, e.start_time;

-- 10. 创建触发器自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_scores_updated_at 
BEFORE UPDATE ON scores 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



