/*
  # 创建信息中心模块

  ## 功能说明
  创建信息中心系统，支持公告、通知、重要资料、规则章程等内容管理。

  ## 1. 新建表
    - `information_items` 信息中心表
      - 分类：公告、通知、重要资料、规则章程
      - 支持富文本内容、附件、优先级、置顶
      - 支持过期时间（通知类常用）
    
    - `information_item_reads` 阅读记录表（可选）
      - 追踪用户阅读状态

  ## 2. 安全设置
    - 启用 RLS
    - 所有人可查看已发布的信息
    - 只有管理员可以创建、更新、删除

  ## 3. 索引
    - 按分类、状态、发布时间、显示顺序创建索引
*/

-- 创建信息中心表
CREATE TABLE IF NOT EXISTS information_items (
  -- 基础字段
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 分类：公告、通知、资料、规则
  category text NOT NULL CHECK (category IN ('公告', '通知', '重要资料', '规则章程')),
  
  -- 内容字段
  title text NOT NULL,                    -- 标题
  content text,                           -- 正文（富文本）
  excerpt text,                           -- 摘要（列表展示）
  
  -- 媒体字段
  featured_image_url text,                -- 特色图片/封面图
  attachments jsonb DEFAULT '[]'::jsonb,  -- 附件列表 [{name, url, size, type}]
  
  -- 状态和优先级
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  priority integer DEFAULT 0,             -- 优先级：0普通, 1重要, 2紧急
  is_pinned boolean DEFAULT false,        -- 是否置顶
  
  -- 排序和时间
  display_order integer DEFAULT 0,        -- 显示顺序（数字越小越靠前）
  published_at timestamptz,               -- 发布时间
  expires_at timestamptz,                 -- 过期时间（可选，用于通知）
  
  -- 作者信息
  author_id uuid REFERENCES auth.users(id),
  
  -- 统计字段
  view_count integer DEFAULT 0,          -- 浏览次数
  like_count integer DEFAULT 0,          -- 点赞数（可选）
  
  -- 时间戳
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建阅读记录表（可选）
CREATE TABLE IF NOT EXISTS information_item_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES information_items(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(item_id, user_id)  -- 确保每个用户每条信息只记录一次
);

-- 启用 RLS
ALTER TABLE information_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE information_item_reads ENABLE ROW LEVEL SECURITY;

-- 所有人可查看已发布的信息
CREATE POLICY "Anyone can view published items"
  ON information_items FOR SELECT
  USING (status = 'published' AND (expires_at IS NULL OR expires_at > now()));

-- 管理员可查看所有信息
CREATE POLICY "Admins can view all items"
  ON information_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- 管理员可创建、更新、删除
CREATE POLICY "Admins can manage items"
  ON information_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- 用户可以查看自己的阅读记录
CREATE POLICY "Users can view own reads"
  ON information_item_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 用户可以创建自己的阅读记录
CREATE POLICY "Users can create own reads"
  ON information_item_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 创建索引以优化查询
CREATE INDEX IF NOT EXISTS idx_information_items_category ON information_items(category);
CREATE INDEX IF NOT EXISTS idx_information_items_status ON information_items(status);
CREATE INDEX IF NOT EXISTS idx_information_items_published_at ON information_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_information_items_display_order ON information_items(display_order, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_information_items_pinned ON information_items(is_pinned DESC, display_order);
CREATE INDEX IF NOT EXISTS idx_information_items_expires_at ON information_items(expires_at) WHERE expires_at IS NOT NULL;

-- 复合索引（常用查询组合）
CREATE INDEX IF NOT EXISTS idx_information_items_category_status ON information_items(category, status);
CREATE INDEX IF NOT EXISTS idx_information_items_published ON information_items(status, published_at DESC) WHERE status = 'published';

-- 阅读记录表索引
CREATE INDEX IF NOT EXISTS idx_information_item_reads_item_id ON information_item_reads(item_id);
CREATE INDEX IF NOT EXISTS idx_information_item_reads_user_id ON information_item_reads(user_id);

-- 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_information_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_information_items_updated_at
  BEFORE UPDATE ON information_items
  FOR EACH ROW
  EXECUTE FUNCTION update_information_items_updated_at();

-- 添加注释
COMMENT ON TABLE information_items IS '信息中心表：存储公告、通知、重要资料、规则章程等信息';
COMMENT ON COLUMN information_items.category IS '分类：公告、通知、重要资料、规则章程';
COMMENT ON COLUMN information_items.priority IS '优先级：0普通, 1重要, 2紧急';
COMMENT ON COLUMN information_items.attachments IS '附件列表JSON格式：[{name, url, size, type}]';
COMMENT ON TABLE information_item_reads IS '信息阅读记录表：追踪用户阅读状态';

