-- 允许所有人查看所有比赛成绩（无论是否参加）

-- 删除现有的限制性策略
DROP POLICY IF EXISTS "Users can view own scores" ON public.scores;
DROP POLICY IF EXISTS "Users can view scores for events they registered" ON public.scores;
DROP POLICY IF EXISTS "Allow all users to read all scores" ON public.scores;

-- 创建新策略：所有人可以查看所有成绩
CREATE POLICY "Everyone can view all scores"
ON public.scores
FOR SELECT
TO public
USING (true);

-- 确保 RLS 已启用
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
