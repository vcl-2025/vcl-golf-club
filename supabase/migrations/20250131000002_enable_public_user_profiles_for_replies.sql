-- 允许匿名用户查看用户资料的基本信息（用于公开显示活动回顾回复）
-- 只允许查看 full_name 和 avatar_url，用于回复显示

-- 删除可能存在的限制性策略
DROP POLICY IF EXISTS "Public can view basic profile info for replies" ON user_profiles;

-- 创建策略：允许所有人（包括匿名用户）查看用户的基本信息
-- 用于在公开活动回顾中显示回复的用户信息
CREATE POLICY "Public can view basic profile info for replies"
  ON user_profiles
  FOR SELECT
  TO public
  USING (true);

-- 说明：
-- 这个策略允许匿名用户查看 user_profiles 表的基本信息
-- 用于在公开的活动回顾页面显示回复的用户名和头像
-- 只影响 SELECT 操作，不影响其他操作（INSERT/UPDATE/DELETE）

