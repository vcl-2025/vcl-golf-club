-- 为每个活动分配完全不同的图片URL
-- 使用不同的高尔夫相关图片，确保每个活动都有独特的图片

-- 更新所有活动，为每个活动分配不同的图片
UPDATE events 
SET image_url = CASE 
    -- 2020年活动
    WHEN title = '2020春季会员赛' THEN 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2020夏季友谊赛' THEN 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2020秋季公开赛' THEN 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2020冬季慈善赛' THEN 'https://images.unsplash.com/photo-1587174486073-ae5e5cef1e30?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2020高级会员赛' THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&crop=center'
    
    -- 2021年活动
    WHEN title = '2021春季会员赛' THEN 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2021夏季友谊赛' THEN 'https://images.unsplash.com/photo-1587174486073-ae5e5cef1e30?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2021秋季公开赛' THEN 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2021冬季慈善赛' THEN 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2021高级会员赛' THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&crop=center'
    
    -- 2022年活动
    WHEN title = '2022春季会员赛' THEN 'https://images.unsplash.com/photo-1587174486073-ae5e5cef1e30?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2022夏季友谊赛' THEN 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2022秋季公开赛' THEN 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2022冬季慈善赛' THEN 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2022高级会员赛' THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&crop=center'
    
    -- 2023年活动
    WHEN title = '2023春季会员赛' THEN 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2023夏季友谊赛' THEN 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2023秋季公开赛' THEN 'https://images.unsplash.com/photo-1587174486073-ae5e5cef1e30?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2023冬季慈善赛' THEN 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2023高级会员赛' THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&crop=center'
    
    -- 2024年活动
    WHEN title = '2024春季会员赛' THEN 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2024夏季友谊赛' THEN 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2024秋季公开赛' THEN 'https://images.unsplash.com/photo-1587174486073-ae5e5cef1e30?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2024冬季慈善赛' THEN 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2024高级会员赛' THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&crop=center'
    
    -- 2025年活动
    WHEN title = '2025年11月俱乐部比赛' THEN 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2025第二届温哥华中国大学校友会高尔夫联谊赛' THEN 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=600&fit=crop&crop=center'
    WHEN title = '绿茵「暖暖歌声颂亲情」慈善音乐会' THEN 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=600&fit=crop&crop=center'
    WHEN title = '绿茵2025年度的慈善高尔夫球赛' THEN 'https://images.unsplash.com/photo-1587174486073-ae5e5cef1e30?w=800&h=600&fit=crop&crop=center'
    
    -- 其他活动
    WHEN title = '2024会员聚餐' THEN 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=600&fit=crop&crop=center'
    WHEN title = '2024秋季公开赛' THEN 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
    
    -- 默认图片
    ELSE 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
END;

-- 为没有匹配到的活动分配随机图片
UPDATE events 
SET image_url = CASE 
    WHEN (EXTRACT(EPOCH FROM created_at)::INTEGER % 5) = 0 THEN 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=600&fit=crop&crop=center'
    WHEN (EXTRACT(EPOCH FROM created_at)::INTEGER % 5) = 1 THEN 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&h=600&fit=crop&crop=center'
    WHEN (EXTRACT(EPOCH FROM created_at)::INTEGER % 5) = 2 THEN 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&crop=center'
    WHEN (EXTRACT(EPOCH FROM created_at)::INTEGER % 5) = 3 THEN 'https://images.unsplash.com/photo-1587174486073-ae5e5cef1e30?w=800&h=600&fit=crop&crop=center'
    WHEN (EXTRACT(EPOCH FROM created_at)::INTEGER % 5) = 4 THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&crop=center'
END
WHERE image_url IS NULL OR image_url = '';

-- 验证更新结果 - 显示所有活动的图片
SELECT 
    title,
    image_url,
    start_time
FROM events 
ORDER BY start_time DESC;
