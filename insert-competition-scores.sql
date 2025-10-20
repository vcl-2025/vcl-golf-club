-- 为比赛活动中的每个参赛会员分配分数和排名
-- 基于 scores 表结构：id, user_id, total_strokes, net_strokes, handicap, rank, holes_played, notes, created_at, updated_at, event_id

WITH CompetitionParticipants AS (
    -- 筛选出所有比赛活动及其已支付和批准的报名者
    SELECT
        e.id AS event_id,
        e.start_time,
        e.end_time,
        er.user_id
    FROM
        events e
    JOIN
        event_registrations er ON e.id = er.event_id
    WHERE
        (e.title LIKE '%赛%' OR e.title LIKE '%锦标赛%' OR e.title LIKE '%公开赛%' OR e.title LIKE '%友谊赛%' OR e.title LIKE '%慈善赛%')
        AND er.payment_status = 'paid'
        AND er.status = 'registered'
        AND er.approval_status = 'approved'
),
GeneratedRawScores AS (
    -- 为每个参赛者生成随机的差点和总杆数
    SELECT
        cp.event_id,
        cp.user_id,
        (random() * 36)::INTEGER AS handicap, -- 随机差点 (0-36)
        (random() * 50 + 70)::INTEGER AS total_strokes, -- 随机总杆数 (70-120)
        cp.end_time + interval '1 day' + (random() * interval '3 days') AS score_record_time -- 成绩记录时间 (活动结束后1-3天)
    FROM
        CompetitionParticipants cp
),
RankedFinalScores AS (
    -- 计算净杆数并为每个赛事排名
    SELECT
        grs.event_id,
        grs.user_id,
        grs.handicap,
        grs.total_strokes,
        (grs.total_strokes - grs.handicap)::INTEGER AS net_strokes,
        ROW_NUMBER() OVER (PARTITION BY grs.event_id ORDER BY (grs.total_strokes - grs.handicap) ASC, grs.total_strokes ASC) AS rank, -- 净杆数越低排名越高，净杆数相同则总杆数越低排名越高
        grs.score_record_time
    FROM
        GeneratedRawScores grs
)
INSERT INTO scores (
    id,
    event_id,
    user_id,
    total_strokes,
    net_strokes,
    handicap,
    rank,
    holes_played,
    notes,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    rfs.event_id,
    rfs.user_id,
    rfs.total_strokes,
    rfs.net_strokes,
    rfs.handicap,
    rfs.rank,
    18, -- 默认打18洞
    '模拟比赛成绩',
    rfs.score_record_time,
    rfs.score_record_time
FROM
    RankedFinalScores rfs;

-- 验证查询：查看已插入的成绩和排名
SELECT
    e.title AS event_title,
    up.full_name AS participant_name,
    s.total_strokes,
    s.net_strokes,
    s.handicap,
    s.rank,
    s.created_at
FROM
    scores s
JOIN
    events e ON s.event_id = e.id
JOIN
    user_profiles up ON s.user_id = up.id
ORDER BY
    e.start_time DESC, s.event_id, s.rank ASC;



