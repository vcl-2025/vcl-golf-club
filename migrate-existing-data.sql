-- 迁移现有数据到统一存储桶
-- 这个脚本会更新数据库中的文件路径引用

-- 1. 更新海报数据中的图片路径
UPDATE posters 
SET image_url = REPLACE(image_url, 'poster-images/', 'golf-club-images/posters/')
WHERE image_url LIKE '%poster-images/%';

-- 2. 更新活动数据中的二维码路径
UPDATE events 
SET qr_code_url = REPLACE(qr_code_url, 'poster-images/', 'golf-club-images/events/')
WHERE qr_code_url LIKE '%poster-images/%';

-- 3. 更新费用数据中的凭证路径
UPDATE expenses 
SET receipt_url = REPLACE(receipt_url, 'expenses/', 'golf-club-images/expenses/')
WHERE receipt_url LIKE '%expenses/%';

-- 4. 更新用户头像路径
UPDATE user_profiles 
SET avatar_url = REPLACE(avatar_url, 'avatars/', 'golf-club-images/avatars/')
WHERE avatar_url LIKE '%avatars/%';

-- 5. 更新活动报名中的支付证明路径
UPDATE event_registrations 
SET payment_proof_url = REPLACE(payment_proof_url, 'poster-images/', 'golf-club-images/payment-proofs/')
WHERE payment_proof_url LIKE '%poster-images/%';

-- 6. 更新投资数据中的二维码路径
UPDATE investment_projects 
SET qrcode_url = REPLACE(qrcode_url, 'poster-images/', 'golf-club-images/investments/')
WHERE qrcode_url LIKE '%poster-images/%';

-- 7. 更新事件数据中的文章图片路径
UPDATE events 
SET article_featured_image_url = REPLACE(article_featured_image_url, 'poster-images/', 'golf-club-images/articles/')
WHERE article_featured_image_url LIKE '%poster-images/%';

-- 8. 检查迁移结果
SELECT 'posters' as table_name, COUNT(*) as count FROM posters WHERE image_url LIKE '%golf-club-images%'
UNION ALL
SELECT 'events', COUNT(*) FROM events WHERE qr_code_url LIKE '%golf-club-images%'
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses WHERE receipt_url LIKE '%golf-club-images%'
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles WHERE avatar_url LIKE '%golf-club-images%'
UNION ALL
SELECT 'event_registrations', COUNT(*) FROM event_registrations WHERE payment_proof_url LIKE '%golf-club-images%'
UNION ALL
SELECT 'investment_projects', COUNT(*) FROM investment_projects WHERE qrcode_url LIKE '%golf-club-images%';

