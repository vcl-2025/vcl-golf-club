-- 为所有活动更新不同的相关图片URL
-- 使用高质量的高尔夫相关图片

-- 更新2020年活动图片
UPDATE events 
SET image_url = CASE 
    WHEN title LIKE '%春季会员赛%' THEN 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%夏季友谊赛%' THEN 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%秋季公开赛%' THEN 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%冬季慈善赛%' THEN 'https://images.unsplash.com/photo-1587174486073-ae5e5cef1e30?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%高级会员赛%' THEN 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&h=600&fit=crop&crop=center'
    ELSE 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=600&fit=crop&crop=center'
END
WHERE title LIKE '%2020%';

-- 更新2021年活动图片
UPDATE events 
SET image_url = CASE 
    WHEN title LIKE '%春季会员赛%' THEN 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%夏季友谊赛%' THEN 'https://images.unsplash.com/photo-1587174486073-ae5e5cef1e30?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%秋季公开赛%' THEN 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%冬季慈善赛%' THEN 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%高级会员赛%' THEN 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
    ELSE 'https://images.unsplash.com/photo-1587174486073-ae5e5cef1e30?w=800&h=600&fit=crop&crop=center'
END
WHERE title LIKE '%2021%';

-- 更新2022年活动图片
UPDATE events 
SET image_url = CASE 
    WHEN title LIKE '%春季会员赛%' THEN 'https://images.unsplash.com/photo-1587174486073-ae5e5cef1e30?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%夏季友谊赛%' THEN 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%秋季公开赛%' THEN 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%冬季慈善赛%' THEN 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%高级会员赛%' THEN 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
    ELSE 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=600&fit=crop&crop=center'
END
WHERE title LIKE '%2022%';

-- 更新2023年活动图片
UPDATE events 
SET image_url = CASE 
    WHEN title LIKE '%春季会员赛%' THEN 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%夏季友谊赛%' THEN 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%秋季公开赛%' THEN 'https://images.unsplash.com/photo-1587174486073-ae5e5cef1e30?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%冬季慈善赛%' THEN 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%高级会员赛%' THEN 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
    ELSE 'https://images.unsplash.com/photo-1587174486073-ae5e5cef1e30?w=800&h=600&fit=crop&crop=center'
END
WHERE title LIKE '%2023%';

-- 更新2024年活动图片
UPDATE events 
SET image_url = CASE 
    WHEN title LIKE '%春季会员赛%' THEN 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%夏季友谊赛%' THEN 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%秋季公开赛%' THEN 'https://images.unsplash.com/photo-1587174486073-ae5e5cef1e30?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%冬季慈善赛%' THEN 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%高级会员赛%' THEN 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
    ELSE 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=600&fit=crop&crop=center'
END
WHERE title LIKE '%2024%';

-- 更新2025年活动图片
UPDATE events 
SET image_url = CASE 
    WHEN title LIKE '%俱乐部比赛%' THEN 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%校友会%' THEN 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%慈善音乐会%' THEN 'https://images.unsplash.com/photo-1587174486073-ae5e5cef1e30?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%慈善高尔夫球赛%' THEN 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&h=600&fit=crop&crop=center'
    ELSE 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
END
WHERE title LIKE '%2025%';

-- 为其他活动分配图片
UPDATE events 
SET image_url = CASE 
    WHEN title LIKE '%聚餐%' THEN 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%培训%' THEN 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%讲座%' THEN 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=600&fit=crop&crop=center'
    WHEN title LIKE '%聚会%' THEN 'https://images.unsplash.com/photo-1587174486073-ae5e5cef1e30?w=800&h=600&fit=crop&crop=center'
    ELSE 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
END
WHERE image_url IS NULL OR image_url = '';

-- 验证更新结果
SELECT 
    title,
    image_url,
    start_time
FROM events 
ORDER BY start_time DESC
LIMIT 10;




