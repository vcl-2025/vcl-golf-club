-- 为 events 表添加比赛计算方式和标准杆数字段
-- 用于区分莱德杯模式和总杆模式，以及存储每洞的标准杆数

-- 添加比赛计算方式字段
-- 'ryder_cup' = 莱德杯模式（每洞比较团队最好成绩）
-- 'total_strokes' = 总杆模式（按团队总杆数排名）
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS scoring_mode text 
CHECK (scoring_mode IN ('ryder_cup', 'total_strokes'));

-- 添加标准杆数字段（存储18洞的PAR值数组）
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS par integer[];

-- 添加注释
COMMENT ON COLUMN events.scoring_mode IS '比赛计算方式：ryder_cup（莱德杯模式）、total_strokes（总杆模式）';
COMMENT ON COLUMN events.par IS '标准杆数数组，包含18洞的PAR值，格式：[洞1, 洞2, ..., 洞18]';

-- 为团体赛设置默认值为莱德杯模式
UPDATE events 
SET scoring_mode = 'ryder_cup' 
WHERE event_type = '团体赛' AND scoring_mode IS NULL;

