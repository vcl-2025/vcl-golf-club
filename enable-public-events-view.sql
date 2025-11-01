-- 允许所有人查看已发布且公开的活动回顾
-- 用于公开首页展示

-- 检查现有策略
SELECT * FROM pg_policies WHERE tablename = 'events';

-- 如果已有 public 查看策略，先删除
DROP POLICY IF EXISTS "Public can view published public events" ON public.events;

-- 创建新策略：允许所有人（包括未登录用户）查看已发布且公开的活动
CREATE POLICY "Public can view published public events"
ON public.events FOR SELECT
TO public
USING (
  article_published = true 
  AND is_public = true
);

-- 说明：
-- article_published = true: 文章已发布
-- is_public = true: 对所有人公开
-- 只有同时满足这两个条件，未登录用户才能看到

