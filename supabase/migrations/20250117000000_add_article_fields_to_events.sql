-- 在events表中添加文章相关字段
-- 为活动精彩文章功能做准备

-- 添加文章内容字段
ALTER TABLE events ADD COLUMN article_content TEXT;

-- 添加文章发布状态字段
ALTER TABLE events ADD COLUMN article_published BOOLEAN DEFAULT FALSE;

-- 添加文章发布时间字段
ALTER TABLE events ADD COLUMN article_published_at TIMESTAMP;

-- 添加文章作者字段（可选，默认为创建活动的管理员）
ALTER TABLE events ADD COLUMN article_author_id UUID REFERENCES auth.users(id);

-- 添加文章摘要字段（用于列表展示）
ALTER TABLE events ADD COLUMN article_excerpt TEXT;

-- 添加文章特色图片字段（可选，默认使用活动图片）
ALTER TABLE events ADD COLUMN article_featured_image_url TEXT;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_events_article_published ON events(article_published);
CREATE INDEX IF NOT EXISTS idx_events_article_published_at ON events(article_published_at);

-- 添加注释说明字段用途
COMMENT ON COLUMN events.article_content IS '活动精彩文章内容（富文本）';
COMMENT ON COLUMN events.article_published IS '文章是否已发布';
COMMENT ON COLUMN events.article_published_at IS '文章发布时间';
COMMENT ON COLUMN events.article_author_id IS '文章作者ID';
COMMENT ON COLUMN events.article_excerpt IS '文章摘要（用于列表展示）';
COMMENT ON COLUMN events.article_featured_image_url IS '文章特色图片URL';



