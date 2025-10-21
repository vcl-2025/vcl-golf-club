-- 创建推送订阅表
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 启用行级安全
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户可以查看自己的推送订阅
CREATE POLICY "Users can view their own push subscriptions" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- 创建策略：用户可以插入自己的推送订阅
CREATE POLICY "Users can insert their own push subscriptions" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 创建策略：用户可以更新自己的推送订阅
CREATE POLICY "Users can update their own push subscriptions" ON public.push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- 创建策略：用户可以删除自己的推送订阅
CREATE POLICY "Users can delete their own push subscriptions" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_created_at ON public.push_subscriptions(created_at);