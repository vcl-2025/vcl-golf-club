-- 清理所有旧的推送订阅
DELETE FROM push_subscriptions WHERE user_id = 'fca1ef76-3752-46af-abe5-c649ca368726';

-- 查看清理后的结果
SELECT user_id, created_at, subscription FROM push_subscriptions;
