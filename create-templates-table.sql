-- 创建编辑器模板表
CREATE TABLE IF NOT EXISTS editor_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_editor_templates_category ON editor_templates(category);
CREATE INDEX IF NOT EXISTS idx_editor_templates_created_at ON editor_templates(created_at);

-- 设置 RLS 策略
ALTER TABLE editor_templates ENABLE ROW LEVEL SECURITY;

-- 允许认证用户查看所有模板
CREATE POLICY "允许认证用户查看模板" ON editor_templates
FOR SELECT TO authenticated
USING (true);

-- 允许认证用户创建模板
CREATE POLICY "允许认证用户创建模板" ON editor_templates
FOR INSERT TO authenticated
WITH CHECK (true);

-- 允许认证用户更新模板
CREATE POLICY "允许认证用户更新模板" ON editor_templates
FOR UPDATE TO authenticated
USING (true);

-- 允许认证用户删除模板
CREATE POLICY "允许认证用户删除模板" ON editor_templates
FOR DELETE TO authenticated
USING (true);

-- 插入一些示例模板
INSERT INTO editor_templates (title, description, content, category) VALUES
('活动回顾模板', '标准活动回顾文章模板', '<h2>活动精彩回顾</h2><p><strong>活动时间：</strong></p><p><strong>活动地点：</strong></p><p><strong>参与人数：</strong></p><hr><h3>活动亮点</h3><ul><li></li><li></li><li></li></ul><h3>精彩瞬间</h3><p></p><h3>感谢与展望</h3><p></p>', 'activity'),
('比赛通知模板', '高尔夫比赛通知模板', '<h2>🏌️ 高尔夫比赛通知</h2><p><strong>比赛名称：</strong></p><p><strong>比赛时间：</strong></p><p><strong>比赛地点：</strong></p><p><strong>报名截止：</strong></p><hr><h3>比赛规则</h3><ul><li>比赛形式：个人比杆赛</li><li>参赛资格：俱乐部会员</li><li>奖项设置：冠军、亚军、季军</li></ul><h3>注意事项</h3><p>请提前30分钟到达比赛场地，携带有效证件。</p><p><strong>联系方式：</strong></p>', 'competition'),
('会员活动模板', '会员活动邀请模板', '<h2>🎉 会员活动邀请</h2><p><strong>活动主题：</strong></p><p><strong>活动时间：</strong></p><p><strong>活动地点：</strong></p><p><strong>活动费用：</strong></p><hr><h3>活动内容</h3><p></p><h3>参与方式</h3><p>请通过俱乐部APP或联系管理员报名。</p><h3>温馨提示</h3><p>活动名额有限，请尽快报名！</p>', 'activity'),
('新闻公告模板', '俱乐部新闻公告模板', '<h2>📢 重要公告</h2><p><strong>发布时间：</strong></p><p><strong>发布人：</strong>俱乐部管理部</p><hr><h3>公告内容</h3><p></p><h3>相关说明</h3><p></p><h3>联系方式</h3><p>如有疑问，请联系俱乐部管理部。</p>', 'announcement');
