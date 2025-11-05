-- 为 events 表添加队伍配置字段
-- 用于存储队伍名称映射和颜色配置

-- 添加队伍名称映射字段（JSON格式：{"excel_name": "display_name"}）
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS team_name_mapping jsonb DEFAULT '{}'::jsonb;

-- 添加队伍颜色配置字段（JSON格式：{"excel_name": "#color"}）
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS team_colors jsonb DEFAULT '{}'::jsonb;

-- 添加注释
COMMENT ON COLUMN events.team_name_mapping IS '队伍名称映射：Excel中的原始名称 -> 系统显示名称';
COMMENT ON COLUMN events.team_colors IS '队伍颜色配置：Excel中的原始名称 -> 颜色代码';

